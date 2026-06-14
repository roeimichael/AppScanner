import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { findListingAnywhere } from '@/lib/storage';

const STATUSES = ['pool', 'interested', 'contacted', 'scheduled', 'visited', 'rejected', 'signed'] as const;

const ManualSchema = z.object({
    url: z.string().url(),
    title: z.string().min(1).max(200),
    price: z.number().int().positive().nullable().optional(),
    rooms: z.number().min(0).max(20).nullable().optional(),
    sqm: z.number().int().positive().nullable().optional(),
    address: z.string().max(300).nullable().optional(),
    neighborhood: z.string().max(120).nullable().optional(),
    city: z.string().max(120).nullable().optional(),
    createdBy: z.string().max(40).nullable().optional(),
    assignedTo: z.string().max(40).nullable().optional(),
});

const ImportSchema = z.object({
    sourceId: z.string().min(1),
    token: z.string().min(1),
    createdBy: z.string().max(40).nullable().optional(),
});

interface AptRow {
    id: string;
    source_id: string | null;
    token: string | null;
    url: string;
    title: string;
    price: number | null;
    rooms: number | null;
    sqm: number | null;
    address: string | null;
    neighborhood: string | null;
    city: string | null;
    image_url: string | null;
    snapshot: unknown;
    status: string;
    assigned_to: string | null;
    created_by: string | null;
    auto_imported: boolean;
    created_at: string;
    updated_at: string;
}

const mapRow = (r: AptRow) => ({
    id: r.id,
    sourceId: r.source_id,
    token: r.token,
    url: r.url,
    title: r.title,
    price: r.price,
    rooms: r.rooms,
    sqm: r.sqm,
    address: r.address,
    neighborhood: r.neighborhood,
    city: r.city,
    imageUrl: r.image_url,
    snapshot: r.snapshot,
    status: r.status,
    assignedTo: r.assigned_to,
    createdBy: r.created_by,
    autoImported: r.auto_imported,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
});

export async function GET() {
    const sb = supabase();
    const { data: apartments, error: e1 } = await sb
        .from('tracked_apartments')
        .select('*')
        .order('created_at', { ascending: false });
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

    const ids = (apartments ?? []).map((a: AptRow) => a.id);
    let noteCounts = new Map<string, number>();
    let lastNotes = new Map<string, { author: string; body: string; createdAt: string }>();
    if (ids.length > 0) {
        const { data: notes } = await sb
            .from('tracker_notes')
            .select('apartment_id, author, body, created_at')
            .in('apartment_id', ids)
            .order('created_at', { ascending: false });
        for (const n of (notes ?? []) as { apartment_id: string; author: string; body: string; created_at: string }[]) {
            noteCounts.set(n.apartment_id, (noteCounts.get(n.apartment_id) ?? 0) + 1);
            if (!lastNotes.has(n.apartment_id)) {
                lastNotes.set(n.apartment_id, { author: n.author, body: n.body, createdAt: n.created_at });
            }
        }
    }

    return NextResponse.json({
        apartments: (apartments ?? []).map((r: AptRow) => ({
            ...mapRow(r),
            noteCount: noteCounts.get(r.id) ?? 0,
            lastNote: lastNotes.get(r.id) ?? null,
        })),
        statuses: STATUSES,
    });
}

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);
    const sb = supabase();

    // Two modes: import existing scanned listing, or add a manual link.
    if (body && body.mode === 'import') {
        const parsed = ImportSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
        const found = await findListingAnywhere(parsed.data.sourceId, parsed.data.token);
        if (!found) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        const snap = found.entry.snapshot;
        const addr = [snap.street, snap.houseNumber].filter(Boolean).join(' ') || null;
        // If already in tracker (e.g. previously auto-imported into pool), promote it to interested.
        const { data: existing } = await sb
            .from('tracked_apartments')
            .select('id, status')
            .eq('source_id', snap.sourceId)
            .eq('token', snap.token)
            .maybeSingle();
        if (existing) {
            const { data, error } = await sb
                .from('tracked_apartments')
                .update({ status: 'interested', updated_at: new Date().toISOString() })
                .eq('id', existing.id)
                .select()
                .single();
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ apartment: mapRow(data as AptRow) });
        }
        const { data, error } = await sb
            .from('tracked_apartments')
            .insert({
                source_id: snap.sourceId,
                token: snap.token,
                url: snap.link,
                title: [snap.city, addr, snap.rooms ? `${snap.rooms} rooms` : null].filter(Boolean).join(' • ') || snap.link,
                price: snap.price ?? null,
                rooms: snap.rooms ?? null,
                sqm: snap.sqm ?? null,
                address: addr,
                neighborhood: snap.neighborhood ?? null,
                city: snap.city ?? null,
                image_url: snap.image ?? null,
                snapshot: snap,
                created_by: parsed.data.createdBy ?? null,
                status: 'interested',
            })
            .select()
            .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ apartment: mapRow(data as AptRow) });
    }

    const parsed = ManualSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;
    const { data, error } = await sb
        .from('tracked_apartments')
        .insert({
            url: d.url,
            title: d.title,
            price: d.price ?? null,
            rooms: d.rooms ?? null,
            sqm: d.sqm ?? null,
            address: d.address ?? null,
            neighborhood: d.neighborhood ?? null,
            city: d.city ?? null,
            created_by: d.createdBy ?? null,
            assigned_to: d.assignedTo ?? null,
            status: 'interested',  // manual adds skip the pool — explicitly flagged by a roommate.
        })
        .select()
        .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ apartment: mapRow(data as AptRow) });
}
