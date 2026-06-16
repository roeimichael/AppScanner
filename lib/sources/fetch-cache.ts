import { getSource } from './index';
import type { DealType, Listing } from './types';

// Shared per-(source, city, dealType) fetch cache. The expensive part is hitting the source;
// the listings for "Tel Aviv rent on yad2" are the same regardless of which search/user asked,
// so we pull each city ONCE (broad: city + dealType only, newest-first) and let callers apply
// their own price/room/amenity filters locally. This collapses N searches (or N users) for the
// same city into a single source request per TTL window — so 100 users hammering 5 cities is
// ~10 pulls per cycle, not hundreds.
//
// In-memory + TTL: dedups across all searches within one /api/scan run (they run sequentially
// in one process) and across closely-spaced runs on a warm instance. The sources are
// recency-sorted and finite, and we only care about new listings, so broad-newest is the right
// scope.

interface Entry { at: number; listings: Listing[] }

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<Listing[]>>();

const keyOf = (sourceId: string, cityId: number, dealType: DealType) => `${sourceId}:${cityId}:${dealType}`;

export const getCityListings = async (sourceId: string, cityId: number, dealType: DealType): Promise<Listing[]> => {
    const key = keyOf(sourceId, cityId, dealType);

    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.listings;

    // Coalesce concurrent callers onto one in-flight request.
    const pending = inflight.get(key);
    if (pending) return pending;

    const src = getSource(sourceId);
    if (!src) throw new Error(`Unknown source: ${sourceId}`);

    const p = (async () => {
        try {
            const listings = await src.fetchListings({ cityId, dealType });
            cache.set(key, { at: Date.now(), listings });
            return listings;
        } finally {
            inflight.delete(key);
        }
    })();
    inflight.set(key, p);
    return p;
};

// Test/diagnostic helper.
export const clearCityCache = () => { cache.clear(); inflight.clear(); };
