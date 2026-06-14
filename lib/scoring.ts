// Listing fit-scoring engine.
//
// Given a listing and a Preferences spec, returns a 0-100 score plus a per-factor breakdown
// so the UI can explain *why* something ranks high/low.
//
// Approach:
// - "Ideal" numerics (price/sqm/rooms/floor) score by gaussian-style proximity. The closer
//   the listing's value is to the ideal, the higher the proximity score (0..1).
// - Feature weights add bonus when the listing has the feature.
// - Agency-fee weight rewards private listings.
// - Image weight rewards listings with a photo.
// - Freshness weight rewards listings seen recently (decays over 14 days).
//
// Final score = sum(weight × component) / sum(weights) × 100.
// If sum(weights) is 0 the listing scores 50 (neutral) so it still ranks.

import type { Listing, Preferences } from './sources/types';
import { nearestStation } from './lrt';

export interface ScoreBreakdown {
    score: number;                     // 0-100
    factors: {
        key: string;
        label: string;
        weight: number;
        value: number;                 // 0-1 component score
        contribution: number;          // weight * value
        detail?: string;               // human-readable explanation
    }[];
}

const proximity = (actual: number | undefined, ideal: number, tolerance: number): number => {
    if (actual == null || !Number.isFinite(actual)) return 0.5;
    const delta = Math.abs(actual - ideal);
    if (delta <= tolerance * 0.05) return 1;       // within 5% of tolerance = perfect
    return Math.max(0, 1 - delta / tolerance);
};

const boolBonus = (has?: boolean): number => has === true ? 1 : has === false ? 0 : 0.4; // unknown ≈ neutral

export const scoreListing = (
    listing: Listing,
    prefs: Preferences | undefined,
    refTime: Date = new Date(),
): ScoreBreakdown => {
    const factors: ScoreBreakdown['factors'] = [];
    if (!prefs) prefs = {};

    const push = (key: string, label: string, weight: number, value: number, detail?: string) => {
        if (weight > 0) factors.push({ key, label, weight, value, contribution: weight * value, detail });
    };

    // Price proximity — tolerance scales with ideal so 7000±2000 makes sense
    if (prefs.idealPrice && (prefs.weightPrice ?? 0) > 0) {
        const tol = prefs.idealPrice * 0.4;
        const v = proximity(listing.price, prefs.idealPrice, tol);
        push('price', 'Price', prefs.weightPrice!, v, listing.price ? `₪${listing.price.toLocaleString()}` : 'unknown');
    }
    if (prefs.idealSqm && (prefs.weightSqm ?? 0) > 0) {
        const v = proximity(listing.sqm, prefs.idealSqm, 50);
        push('sqm', 'Square meters', prefs.weightSqm!, v, listing.sqm ? `${listing.sqm} sqm` : 'unknown');
    }
    if (prefs.idealRooms && (prefs.weightRooms ?? 0) > 0) {
        const v = proximity(listing.rooms, prefs.idealRooms, 2);
        push('rooms', 'Rooms', prefs.weightRooms!, v, listing.rooms ? `${listing.rooms} rooms` : 'unknown');
    }
    if (prefs.idealFloor != null && (prefs.weightFloor ?? 0) > 0) {
        const v = proximity(listing.floor, prefs.idealFloor, 4);
        push('floor', 'Floor', prefs.weightFloor!, v, listing.floor != null ? `floor ${listing.floor}` : 'unknown');
    }

    // Agency-fee preference: 1 = private, 0 = agency, 0.5 = unknown
    if ((prefs.weightAgencyFee ?? 0) > 0) {
        const v = listing.isAgency === true ? 0 : listing.isAgency === false ? 1 : 0.5;
        push('agencyFee', 'No realtor fee', prefs.weightAgencyFee!, v, listing.isAgency === true ? 'תיווך' : listing.isAgency === false ? 'ללא תיווך' : 'unknown');
    }

    // Feature bonuses
    const featureMap: Array<[keyof Preferences, string, keyof Listing]> = [
        ['weightParking', 'Parking', 'hasParking'],
        ['weightElevator', 'Elevator', 'hasElevator'],
        ['weightBalcony', 'Balcony', 'hasBalcony'],
        ['weightAirCondition', 'Air conditioning', 'hasAirCondition'],
        ['weightFurniture', 'Furnished', 'hasFurniture'],
        ['weightShelter', 'Shelter (ממ"ד)', 'hasShelter'],
        ['weightWarehouse', 'Storage', 'hasWarehouse'],
        ['weightRenovated', 'Renovated', 'isRenovated'],
        ['weightPets', 'Pet-friendly', 'petsAllowed'],
    ];
    for (const [wk, label, lk] of featureMap) {
        const w = prefs[wk] as number | undefined;
        if ((w ?? 0) > 0) {
            const has = listing[lk] as boolean | undefined;
            push(String(wk), label, w!, boolBonus(has), has === true ? 'yes' : has === false ? 'no' : '?');
        }
    }

    // Light-rail proximity — 1 at a station, linear decay to 0 at 1.5 km (~19 min walk).
    // No coords → 0.5 (neutral) so missing geo doesn't unfairly sink the listing.
    if ((prefs.weightLrt ?? 0) > 0) {
        const near = nearestStation(listing.lat, listing.lon);
        const v = near ? Math.max(0, 1 - near.distanceM / 1500) : 0.5;
        push('lrt', 'Light rail', prefs.weightLrt!, v, near ? `${near.walkMin} min to ${near.station.name}` : 'no coords');
    }

    if ((prefs.weightImage ?? 0) > 0) {
        push('image', 'Has photo', prefs.weightImage!, listing.image ? 1 : 0, listing.image ? 'yes' : 'no');
    }

    // Freshness — caller passes refTime to make this testable. Decays over 14 days.
    if ((prefs.weightFreshness ?? 0) > 0) {
        // Listing.firstSeenAt isn't on Listing type; we receive it via context elsewhere.
        // Default to 1 (treat as fresh) so missing data doesn't drop the score.
        push('freshness', 'Recency', prefs.weightFreshness!, 1, 'recent');
    }

    const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
    const totalContrib = factors.reduce((s, f) => s + f.contribution, 0);
    const score = totalWeight === 0 ? 50 : (totalContrib / totalWeight) * 100;

    return {
        score: Math.round(score),
        factors: factors.sort((a, b) => b.contribution - a.contribution),
    };
};

// Variant that knows when the listing was first seen / posted, for accurate freshness scoring.
// Prefers listing.createdAt (real upload date) over firstSeenAt (when we first saw it).
export const scoreListingWithFreshness = (
    listing: Listing,
    firstSeenAt: string | undefined,
    prefs: Preferences | undefined,
    refTime: Date = new Date(),
): ScoreBreakdown => {
    const base = scoreListing(listing, prefs, refTime);
    if (!prefs?.weightFreshness) return base;
    const ageSource = listing.createdAt ?? firstSeenAt;
    if (!ageSource) return base;

    const ageMs = refTime.getTime() - new Date(ageSource).getTime();
    const ageDays = ageMs / (24 * 3600 * 1000);
    const v = Math.max(0, 1 - ageDays / 14);
    const detail = ageDays < 1 ? 'today' : `${Math.round(ageDays)}d ago`;

    const idx = base.factors.findIndex(f => f.key === 'freshness');
    if (idx !== -1) {
        const w = base.factors[idx].weight;
        base.factors[idx] = { key: 'freshness', label: 'Recency', weight: w, value: v, contribution: w * v, detail };
        base.factors.sort((a, b) => b.contribution - a.contribution);
        const total = base.factors.reduce((s, f) => s + f.weight, 0);
        const contrib = base.factors.reduce((s, f) => s + f.contribution, 0);
        base.score = Math.round(total === 0 ? 50 : (contrib / total) * 100);
    }
    return base;
};
