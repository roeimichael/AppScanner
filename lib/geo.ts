// Reverse-geocode coordinates → neighborhood label using OpenStreetMap Nominatim.
// Free, rate-limited (≤1 req/sec). Used to fill in `neighborhood` for listings whose
// advertiser left it blank but did supply coords (mostly Yad2 private listings).

interface NominatimAddress {
    suburb?: string;
    neighbourhood?: string;
    city_district?: string;
    quarter?: string;
    road?: string;
}
interface NominatimReply {
    address?: NominatimAddress;
    display_name?: string;
}

const cache = new Map<string, string | null>();
const CACHE_LIMIT = 1000;

const cacheKey = (lat: number, lon: number) =>
    `${lat.toFixed(4)},${lon.toFixed(4)}`;

export const reverseHood = async (lat: number, lon: number): Promise<string | null> => {
    const k = cacheKey(lat, lon);
    if (cache.has(k)) return cache.get(k)!;

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=he&zoom=16&addressdetails=1`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'appscanner/1.0 (apartment-tracker)' },
            cache: 'no-store',
        });
        if (!res.ok) { cache.set(k, null); return null; }
        const j: NominatimReply = await res.json();
        const a = j.address ?? {};
        // Concatenate every available neighborhood-level field so the substring filter
        // has a wider net (Yad2 hood names vary in granularity vs Nominatim).
        const parts = [a.suburb, a.neighbourhood, a.city_district, a.quarter].filter(Boolean) as string[];
        const result = parts.length ? Array.from(new Set(parts)).join(' / ') : null;
        if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
        cache.set(k, result);
        return result;
    } catch {
        cache.set(k, null);
        return null;
    }
};

// Helper to throttle multiple reverse-geo calls (Nominatim asks for ≤1 req/sec).
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const reverseHoodMany = async (
    items: Array<{ lat?: number; lon?: number }>,
    onResult: (i: number, hood: string | null) => void,
): Promise<void> => {
    let idx = 0;
    for (const it of items) {
        if (it.lat != null && it.lon != null) {
            const hood = await reverseHood(it.lat, it.lon);
            onResult(idx, hood);
            await sleep(1100);
        }
        idx++;
    }
};
