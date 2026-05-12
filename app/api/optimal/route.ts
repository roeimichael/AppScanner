import { NextResponse } from 'next/server';
import { listAllSeenListings, listSearches } from '@/lib/storage';
import { scoreListingWithFreshness } from '@/lib/scoring';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const searchIdFilter = url.searchParams.get('searchId');
    const includeDismissed = url.searchParams.get('includeDismissed') === '1';
    const includeRemoved = url.searchParams.get('includeRemoved') === '1';

    const [entries, searches] = await Promise.all([listAllSeenListings(), listSearches()]);
    const searchMap = new Map(searches.map(s => [s.id, s]));

    const refTime = new Date();
    type ScoredItem = ReturnType<typeof scoreOne>;

    function scoreOne(e: typeof entries[number]) {
        const search = searchMap.get(e.searchId);
        const breakdown = scoreListingWithFreshness(e.entry.snapshot, e.entry.firstSeenAt, search?.preferences, refTime);
        return {
            ...e.entry.snapshot,
            searchId: e.searchId,
            searchName: search?.name ?? '?',
            firstSeenAt: e.entry.firstSeenAt,
            lastSeenAt: e.entry.lastSeenAt,
            status: e.entry.status,
            userState: e.entry.userState ?? null,
            score: breakdown.score,
            breakdown: breakdown.factors,
        };
    }

    // Dedupe by sourceId+token; keep highest-scoring instance.
    const map = new Map<string, ScoredItem>();
    for (const e of entries) {
        if (searchIdFilter && e.searchId !== searchIdFilter) continue;
        if (!includeDismissed && e.entry.userState === 'dismissed') continue;
        if (!includeRemoved && e.entry.status === 'removed') continue;
        const item = scoreOne(e);
        const key = `${item.sourceId}:${item.token}`;
        const prev = map.get(key);
        if (!prev || item.score > prev.score) map.set(key, item);
    }

    const sorted = [...map.values()].sort((a, b) => b.score - a.score);
    return NextResponse.json({ listings: sorted });
}
