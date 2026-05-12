// Neighborhood catalog per Yad2 cityId. Yad2 has no "list all hoods" endpoint,
// so we sweep the address-autocomplete with 2-letter Hebrew prefixes and union
// the results filtered by cityId. Result is cached on disk per city for ~30 days.

import fs from 'fs/promises';
import path from 'path';

export interface Neighborhood {
    id: string;          // Yad2 hoodId
    name: string;        // Hebrew display name (without ", city" suffix)
}

const HEBREW = 'אבגדהוזחטיכלמנסעפצקרשת';
const CACHE_DIR = path.join(process.cwd(), 'data', 'neighborhoods');
const CACHE_TTL_MS = 30 * 24 * 3600 * 1000;

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'he-IL,he;q=0.9',
};

interface AutocompleteHood {
    fullTitleText: string;
    cityId: string;
    hoodId: string;
}

const stripCitySuffix = (full: string): string => {
    const i = full.lastIndexOf(',');
    return i === -1 ? full : full.slice(0, i).trim();
};

const cachePath = (cityId: number) => path.join(CACHE_DIR, `${cityId}.json`);

const readCache = async (cityId: number): Promise<Neighborhood[] | null> => {
    try {
        const raw = await fs.readFile(cachePath(cityId), 'utf-8');
        const parsed: { fetchedAt: string; hoods: Neighborhood[] } = JSON.parse(raw);
        if (Date.now() - new Date(parsed.fetchedAt).getTime() > CACHE_TTL_MS) return null;
        return parsed.hoods;
    } catch {
        return null;
    }
};

const writeCache = async (cityId: number, hoods: Neighborhood[]): Promise<void> => {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cachePath(cityId), JSON.stringify({ fetchedAt: new Date().toISOString(), hoods }, null, 2));
};

const sweepRemote = async (cityId: number): Promise<Neighborhood[]> => {
    const seen = new Map<string, string>();
    const prefixes: string[] = [];
    for (const a of HEBREW) for (const b of HEBREW) prefixes.push(a + b);

    // Run requests in batches of ~16 to stay polite.
    const batchSize = 16;
    for (let i = 0; i < prefixes.length; i += batchSize) {
        const batch = prefixes.slice(i, i + batchSize);
        await Promise.all(batch.map(async q => {
            const url = `https://gw.yad2.co.il/address-autocomplete/realestate/v2?text=${encodeURIComponent(q)}`;
            try {
                const res = await fetch(url, { headers: HEADERS, cache: 'no-store' });
                if (!res.ok) return;
                const json: { hoods?: AutocompleteHood[] } = await res.json();
                for (const h of json.hoods ?? []) {
                    if (h.cityId === String(cityId) && !seen.has(h.hoodId)) {
                        seen.set(h.hoodId, stripCitySuffix(h.fullTitleText));
                    }
                }
            } catch { /* skip */ }
        }));
    }

    return [...seen.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'he'));
};

export const getNeighborhoods = async (cityId: number, force = false): Promise<Neighborhood[]> => {
    if (!force) {
        const cached = await readCache(cityId);
        if (cached) return cached;
    }
    const hoods = await sweepRemote(cityId);
    if (hoods.length > 0) await writeCache(cityId, hoods);
    return hoods;
};
