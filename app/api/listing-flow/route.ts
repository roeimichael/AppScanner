import { NextResponse } from 'next/server';
import { listAllSeenListings } from '@/lib/storage';

// Buckets every tracked listing by its createdAt (when posted on the source site),
// falling back to firstSeenAt for listings missing creation date. Default 30-day daily view.
// `range=24h` gives hourly buckets over the last 24 hours.
export async function GET(req: Request) {
    const url = new URL(req.url);
    const range = url.searchParams.get('range') ?? '30d';
    const all = await listAllSeenListings();
    const now = Date.now();

    let buckets: { bucket: string; count: number; bySource: Record<string, number> }[];

    if (range === '24h') {
        const hours = 24;
        const grid: Record<string, { bucket: string; count: number; bySource: Record<string, number> }> = {};
        for (let i = hours - 1; i >= 0; i--) {
            const t = new Date(now - i * 3600_000);
            const key = t.toISOString().slice(0, 13) + ':00';
            grid[key] = { bucket: key, count: 0, bySource: {} };
        }
        for (const { entry } of all) {
            const iso = entry.snapshot.createdAt ?? entry.firstSeenAt;
            if (!iso) continue;
            if (now - new Date(iso).getTime() > hours * 3600_000) continue;
            const key = iso.slice(0, 13) + ':00';
            const b = grid[key];
            if (!b) continue;
            b.count++;
            const sid = entry.snapshot.sourceId;
            b.bySource[sid] = (b.bySource[sid] ?? 0) + 1;
        }
        buckets = Object.values(grid);
    } else {
        const days = range === '7d' ? 7 : 30;
        const grid: Record<string, { bucket: string; count: number; bySource: Record<string, number> }> = {};
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now - i * 86400_000);
            const key = d.toISOString().slice(0, 10);
            grid[key] = { bucket: key, count: 0, bySource: {} };
        }
        for (const { entry } of all) {
            const iso = entry.snapshot.createdAt ?? entry.firstSeenAt;
            if (!iso) continue;
            const key = iso.slice(0, 10);
            const b = grid[key];
            if (!b) continue;
            b.count++;
            const sid = entry.snapshot.sourceId;
            b.bySource[sid] = (b.bySource[sid] ?? 0) + 1;
        }
        buckets = Object.values(grid);
    }

    return NextResponse.json({ range, buckets, total: all.length });
}
