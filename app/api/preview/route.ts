import { NextResponse } from 'next/server';
import { getSource } from '@/lib/sources';

export const dynamic = 'force-dynamic';

// Live filter preview — fetches from selected sources without writing anything.
export async function POST(req: Request) {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Bad body' }, { status: 400 });
    const { sources = ['yad2'], filters = {} } = body as { sources?: string[]; filters?: Record<string, unknown> };

    const results: { sourceId: string; count: number; listings: unknown[]; error?: string }[] = [];
    for (const sid of sources) {
        const src = getSource(sid);
        if (!src) {
            results.push({ sourceId: sid, count: 0, listings: [], error: 'Unknown source' });
            continue;
        }
        try {
            const listings = await src.fetchListings(filters as never);
            results.push({ sourceId: sid, count: listings.length, listings: listings.slice(0, 50) });
        } catch (e) {
            results.push({ sourceId: sid, count: 0, listings: [], error: e instanceof Error ? e.message : String(e) });
        }
    }
    return NextResponse.json({ results });
}
