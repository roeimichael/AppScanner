import { NextResponse } from 'next/server';
import { getNeighborhoods } from '@/lib/yad2/neighborhoods';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const cityId = Number(url.searchParams.get('cityId'));
    const force = url.searchParams.get('refresh') === '1';
    if (!cityId) return NextResponse.json({ error: 'cityId required' }, { status: 400 });
    try {
        const hoods = await getNeighborhoods(cityId, force);
        return NextResponse.json({ cityId, hoods });
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
    }
}
