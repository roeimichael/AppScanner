import { NextResponse } from 'next/server';
import { listAllSeenListings, listSearches } from '@/lib/storage';

export async function GET() {
    const [entries, searches] = await Promise.all([listAllSeenListings(), listSearches()]);
    const searchMap = new Map(searches.map(s => [s.id, s.name]));
    // Dedupe by sourceId+token (a listing can appear in multiple searches)
    const seen = new Map<string, ReturnType<typeof formatItem>>();
    function formatItem(e: typeof entries[number]) {
        return {
            ...e.entry.snapshot,
            searchId: e.searchId,
            searchName: searchMap.get(e.searchId) ?? '?',
            firstSeenAt: e.entry.firstSeenAt,
            lastSeenAt: e.entry.lastSeenAt,
            status: e.entry.status,
            userState: e.entry.userState ?? null,
            priceHistoryLen: e.entry.priceHistory?.length ?? 0,
        };
    }
    for (const e of entries) {
        const key = `${e.entry.snapshot.sourceId}:${e.entry.snapshot.token}`;
        const cur = seen.get(key);
        const formatted = formatItem(e);
        if (!cur || (cur.firstSeenAt > formatted.firstSeenAt)) seen.set(key, formatted);
    }
    return NextResponse.json({ listings: [...seen.values()] });
}
