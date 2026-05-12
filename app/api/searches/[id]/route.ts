import { NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteSearch, getSearch, upsertSearch } from '@/lib/storage';
import { runOneSearch } from '@/lib/scan';

const UpdateSchema = z.object({
    name: z.string().min(1).optional(),
    enabled: z.boolean().optional(),
    intervalMinutes: z.number().int().min(15).max(720).optional(),
    sources: z.array(z.string()).optional(),
    filters: z.record(z.string(), z.any()).optional(),
    preferences: z.record(z.string(), z.any()).nullable().optional(),
    activeHoursStart: z.number().int().min(0).max(23).nullable().optional(),
    activeHoursEnd: z.number().int().min(0).max(23).nullable().optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const search = await getSearch(id);
    if (!search) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ search });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const existing = await getSearch(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }

    // Coerce nulls to undefined for optional numeric fields (zod allows null for "clear", storage uses undefined)
    const patch = { ...parsed.data } as Record<string, unknown>;
    if (patch.activeHoursStart === null) patch.activeHoursStart = undefined;
    if (patch.activeHoursEnd === null) patch.activeHoursEnd = undefined;
    if (patch.preferences === null) patch.preferences = undefined;
    const merged = { ...existing, ...patch, id };
    const saved = await upsertSearch(merged as Parameters<typeof upsertSearch>[0]);
    return NextResponse.json({ search: saved });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    await deleteSearch(id);
    return NextResponse.json({ ok: true });
}

// POST = trigger an immediate scan for this search (ignores interval)
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const search = await getSearch(id);
    if (!search) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const outcome = await runOneSearch(search);
    return NextResponse.json({ outcome });
}
