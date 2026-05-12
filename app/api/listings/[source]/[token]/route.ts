import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findListingAnywhere, setListingUserState } from '@/lib/storage';

export async function GET(_req: Request, ctx: { params: Promise<{ source: string; token: string }> }) {
    const { source, token } = await ctx.params;
    const found = await findListingAnywhere(source, token);
    if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
        listing: found.entry.snapshot,
        priceHistory: found.entry.priceHistory ?? [],
        firstSeenAt: found.entry.firstSeenAt,
        lastSeenAt: found.entry.lastSeenAt,
        status: found.entry.status,
        userState: found.entry.userState ?? null,
        searchId: found.searchId,
    });
}

const PatchSchema = z.object({
    userState: z.enum(['favorite', 'dismissed']).nullable(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ source: string; token: string }> }) {
    const { source, token } = await ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    const touched = await setListingUserState(source, token, parsed.data.userState);
    if (touched === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, touched });
}
