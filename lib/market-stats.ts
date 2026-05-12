// Per-city ₪/sqm distribution stats over currently-tracked listings.
// Used to rate a single listing's price-per-sqm vs market (z-score + percentile).

import { listAllSeenListings } from './storage';

export interface PpsqmStats {
    city: string | null;
    n: number;
    mean: number;       // ₪/sqm mean
    stddev: number;     // ₪/sqm stddev
    median: number;
    p25: number;
    p75: number;
    samples: number[];  // sorted ₪/sqm values, used for percentile of a query value
}

const computeStats = (samples: number[]): Omit<PpsqmStats, 'city'> => {
    const sorted = [...samples].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = n === 0 ? 0 : sorted.reduce((s, v) => s + v, 0) / n;
    const variance = n === 0 ? 0 : sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const stddev = Math.sqrt(variance);
    const pick = (q: number) => sorted[Math.min(n - 1, Math.max(0, Math.floor(q * (n - 1))))] ?? 0;
    return {
        n,
        mean,
        stddev,
        median: pick(0.5),
        p25: pick(0.25),
        p75: pick(0.75),
        samples: sorted,
    };
};

const cache: { at: number; byCity: Map<string, PpsqmStats> } = { at: 0, byCity: new Map() };
const CACHE_TTL_MS = 5 * 60 * 1000;

export const getPpsqmStats = async (city: string | undefined): Promise<PpsqmStats | null> => {
    if (!city) return null;
    if (Date.now() - cache.at < CACHE_TTL_MS) {
        const hit = cache.byCity.get(city);
        if (hit) return hit;
    }

    const all = await listAllSeenListings();
    const byCity = new Map<string, number[]>();
    for (const { entry } of all) {
        const c = entry.snapshot.city;
        const p = entry.snapshot.price;
        const s = entry.snapshot.sqm;
        if (!c || !p || !s || s < 15) continue;
        // Drop obvious outliers (incomplete data) — sane bounds for IL rentals
        const ppsqm = p / s;
        if (ppsqm < 10 || ppsqm > 1000) continue;
        if (!byCity.has(c)) byCity.set(c, []);
        byCity.get(c)!.push(ppsqm);
    }

    cache.at = Date.now();
    cache.byCity.clear();
    for (const [c, samples] of byCity) {
        cache.byCity.set(c, { city: c, ...computeStats(samples) });
    }

    return cache.byCity.get(city) ?? null;
};

// Returns a one-line human label like "₪71/sqm — 12% below avg, top quartile".
export const ratePpsqm = (price?: number, sqm?: number, stats?: PpsqmStats | null): { ppsqm: number; label: string; z: number } | null => {
    if (!price || !sqm || sqm < 15) return null;
    const ppsqm = price / sqm;
    if (!stats || stats.n < 5) {
        return { ppsqm, label: `₪${Math.round(ppsqm)}/sqm`, z: 0 };
    }
    const z = stats.stddev > 0 ? (ppsqm - stats.mean) / stats.stddev : 0;
    const pct = (ppsqm / stats.mean - 1) * 100;
    const direction = pct < 0 ? 'below' : 'above';
    const absPct = Math.abs(pct).toFixed(0);
    let band = '';
    if (ppsqm <= stats.p25) band = ', top 25% (cheap)';
    else if (ppsqm >= stats.p75) band = ', bottom 25% (pricey)';
    return {
        ppsqm,
        label: `₪${Math.round(ppsqm)}/sqm — ${absPct}% ${direction} avg${band}`,
        z,
    };
};
