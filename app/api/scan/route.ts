import { NextResponse } from 'next/server';
import { runDueSearches } from '@/lib/scan';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const isAuthorized = (req: Request): boolean => {
    const expected = process.env.CRON_SECRET;
    if (!expected) return true; // no secret configured = open (dev mode)
    const auth = req.headers.get('authorization');
    if (auth === `Bearer ${expected}`) return true;
    const url = new URL(req.url);
    if (url.searchParams.get('secret') === expected) return true;
    return false;
};

const handle = async (req: Request) => {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === '1';
    const skipNotify = url.searchParams.get('bootstrap') === '1';
    const outcomes = await runDueSearches(force, { skipNotify });
    return NextResponse.json({ outcomes, ranAt: new Date().toISOString(), bootstrap: skipNotify });
};

export const GET = handle;
export const POST = handle;
