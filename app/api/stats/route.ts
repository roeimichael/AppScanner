import { NextResponse } from 'next/server';
import { listNotifications, listSearches, loadSeen } from '@/lib/storage';

export async function GET() {
    const searches = await listSearches();
    const enabledCount = searches.filter(s => s.enabled).length;

    let totalTracked = 0;
    for (const s of searches) {
        for (const sourceId of s.sources) {
            const seen = await loadSeen(`${sourceId}:${s.id}`);
            totalTracked += Object.keys(seen).length;
        }
    }

    const notifs = await listNotifications(500);
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const newToday = notifs.filter(n => new Date(n.sentAt).getTime() >= dayAgo).length;

    const lastRun = searches
        .map(s => s.lastRunAt)
        .filter((s): s is string => !!s)
        .sort()
        .pop() ?? null;

    return NextResponse.json({
        searchesTotal: searches.length,
        searchesEnabled: enabledCount,
        totalTracked,
        newLast24h: newToday,
        lastRunAt: lastRun,
    });
}
