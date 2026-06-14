import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

const STATUSES = ['pool', 'interested', 'contacted', 'scheduled', 'visited', 'rejected', 'signed'] as const;

const PatchSchema = z.object({
    status: z.enum(STATUSES).optional(),
    assignedTo: z.string().max(40).nullable().optional(),
    title: z.string().min(1).max(200).optional(),
    price: z.number().int().positive().nullable().optional(),
    address: z.string().max(300).nullable().optional(),
    neighborhood: z.string().max(120).nullable().optional(),
    city: z.string().max(120).nullable().optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const sb = supabase();
    const [{ data: apt, error: e1 }, { data: notes, error: e2 }] = await Promise.all([
        sb.from('tracked_apartments').select('*').eq('id', id).maybeSingle(),
        sb.from('tracker_notes').select('*').eq('apartment_id', id).order('created_at', { ascending: true }),
    ]);
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    if (!apt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
        apartment: {
            id: apt.id,
            sourceId: apt.source_id,
            token: apt.token,
            url: apt.url,
            title: apt.title,
            price: apt.price,
            rooms: apt.rooms,
            sqm: apt.sqm,
            address: apt.address,
            neighborhood: apt.neighborhood,
            city: apt.city,
            imageUrl: apt.image_url,
            snapshot: apt.snapshot,
            status: apt.status,
            assignedTo: apt.assigned_to,
            createdBy: apt.created_by,
            createdAt: apt.created_at,
            updatedAt: apt.updated_at,
        },
        notes: (notes ?? []).map((n: { id: string; author: string; body: string; created_at: string }) => ({
            id: n.id, author: n.author, body: n.body, createdAt: n.created_at,
        })),
    });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.assignedTo !== undefined) updates.assigned_to = parsed.data.assignedTo;
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.price !== undefined) updates.price = parsed.data.price;
    if (parsed.data.address !== undefined) updates.address = parsed.data.address;
    if (parsed.data.neighborhood !== undefined) updates.neighborhood = parsed.data.neighborhood;
    if (parsed.data.city !== undefined) updates.city = parsed.data.city;

    const sb = supabase();
    const { error } = await sb.from('tracked_apartments').update(updates).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const sb = supabase();
    const { error } = await sb.from('tracked_apartments').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
