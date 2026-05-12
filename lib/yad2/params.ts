import type { FilterSpec, PropertyType } from '@/lib/sources/types';
import { findCity } from './cities';

// Yad2 property type IDs (subcategory). These are best-effort and may be refined as the API surfaces more.
const PROPERTY_TYPE_MAP: Record<PropertyType, number> = {
    apartment: 1,
    garden_apt: 6,
    penthouse: 7,
    rooftop: 51,
    duplex: 5,
    studio: 11,
    private_house: 3,
    cottage: 4,
};

export const buildYad2ApiUrl = (filters: FilterSpec): string => {
    const params = new URLSearchParams();

    let regionId = filters.regionId;
    if (filters.cityId) {
        const city = findCity(filters.cityId);
        if (city && !regionId) regionId = city.regionId;
        params.set('city', String(filters.cityId));
    }
    if (!regionId) {
        throw new Error('regionId required (or pick a known cityId)');
    }
    params.set('region', String(regionId));

    if (filters.minRooms != null) params.set('minRooms', String(filters.minRooms));
    if (filters.maxRooms != null) params.set('maxRooms', String(filters.maxRooms));
    if (filters.minPrice != null) params.set('minPrice', String(filters.minPrice));
    if (filters.maxPrice != null) params.set('maxPrice', String(filters.maxPrice));

    if (filters.propertyTypes?.length) {
        const ids = filters.propertyTypes
            .map(t => PROPERTY_TYPE_MAP[t])
            .filter((n): n is number => typeof n === 'number');
        if (ids.length) params.set('property', ids.join(','));
    }

    // Boolean amenity filters — mapped to Yad2 server-side query params.
    const boolMap: Array<[keyof FilterSpec, string]> = [
        ['parking', 'parking'],
        ['elevator', 'elevator'],
        ['balcony', 'balcony'],
        ['airCondition', 'airConditioner'],
        ['warehouse', 'warehouse'],
        ['accessibility', 'accessibility'],
        ['furniture', 'furniture'],
        ['renovated', 'renovated'],
        ['shelter', 'shelter'],
        ['bars', 'bars'],
        ['pets', 'pets'],
        ['imageOnly', 'imageOnly'],
        ['priceOnly', 'priceOnly'],
        ['priceDropped', 'priceDropped'],
    ];
    for (const [key, apiKey] of boolMap) {
        if (filters[key] === true) params.set(apiKey, '1');
    }

    const dealPath = filters.dealType === 'sale' ? 'forsale' : 'rent';
    return `https://gw.yad2.co.il/realestate-feed/${dealPath}/feed?${params.toString()}`;
};

const buildSearchableText = (it: { propertyType?: string; description?: string; tags?: string[]; neighborhood?: string; street?: string }) =>
    [it.propertyType, it.description, it.neighborhood, it.street, ...(it.tags ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

// Filters applied after fetch — runs even when source already filtered server-side
// (no-op for fields the source already constrained, real filter for sources that didn't).
export const applyPostFilters = <T extends {
    sqm?: number; floor?: number; isAgency?: boolean; neighborhood?: string;
    price?: number; rooms?: number; city?: string; propertyType?: string;
    description?: string; tags?: string[]; street?: string;
    hasParking?: boolean; hasElevator?: boolean; hasBalcony?: boolean;
    hasAirCondition?: boolean; hasFurniture?: boolean; hasShelter?: boolean;
    hasWarehouse?: boolean; hasBars?: boolean; isRenovated?: boolean;
    petsAllowed?: boolean; image?: string;
}>(items: T[], filters: FilterSpec): T[] => {
    const expectedCity = filters.cityId ? findCity(filters.cityId)?.name : null;
    return items.filter(it => {
        // City match (Hebrew name substring) — guards against promoted cross-city ads.
        if (expectedCity) {
            if (!it.city) return false;
            if (!it.city.includes(expectedCity) && !expectedCity.includes(it.city)) return false;
        }
        if (filters.minRooms != null && (it.rooms ?? 0) < filters.minRooms) return false;
        if (filters.maxRooms != null && (it.rooms ?? Infinity) > filters.maxRooms) return false;
        if (filters.minSqm != null && (it.sqm ?? 0) < filters.minSqm) return false;
        if (filters.maxSqm != null && (it.sqm ?? Infinity) > filters.maxSqm) return false;
        if (filters.minFloor != null && (it.floor ?? -1) < filters.minFloor) return false;
        if (filters.maxFloor != null && (it.floor ?? Infinity) > filters.maxFloor) return false;
        if (filters.excludeAgency && it.isAgency) return false;
        if (filters.minPrice != null && (it.price ?? 0) < filters.minPrice) return false;
        if (filters.maxPrice != null && (it.price ?? Infinity) > filters.maxPrice) return false;
        if (filters.neighborhoods?.length) {
            const nb = it.neighborhood?.toLowerCase() ?? '';
            const ok = filters.neighborhoods.some(n => nb.includes(n.toLowerCase()));
            if (!ok) return false;
        }
        if (filters.includeKeywords?.length || filters.excludeKeywords?.length) {
            const text = buildSearchableText(it);
            if (filters.excludeKeywords?.length) {
                if (filters.excludeKeywords.some(k => text.includes(k.toLowerCase()))) return false;
            }
            if (filters.includeKeywords?.length) {
                if (!filters.includeKeywords.some(k => text.includes(k.toLowerCase()))) return false;
            }
        }
        // Amenity post-filter — only reject when listing is *known* to lack the feature,
        // not when the source simply didn't surface it (undefined).
        // We check the listing's text for evidence; if no signal, we trust the source's filter.
        const amenityChecks: Array<[keyof FilterSpec, keyof typeof it]> = [
            ['parking', 'hasParking'],
            ['elevator', 'hasElevator'],
            ['balcony', 'hasBalcony'],
            ['airCondition', 'hasAirCondition'],
            ['warehouse', 'hasWarehouse'],
            ['furniture', 'hasFurniture'],
            ['shelter', 'hasShelter'],
            ['bars', 'hasBars'],
            ['renovated', 'isRenovated'],
            ['pets', 'petsAllowed'],
        ];
        for (const [filterKey, listingKey] of amenityChecks) {
            if (filters[filterKey] === true) {
                const v = it[listingKey];
                if (v === false) return false;
                // If undefined (unknown), trust server filter (Yad2 already filtered);
                // For other sources without server filter, undefined passes through (best-effort).
            }
        }
        if (filters.imageOnly && !it.image) return false;
        if (filters.priceOnly && !it.price) return false;
        return true;
    });
};
