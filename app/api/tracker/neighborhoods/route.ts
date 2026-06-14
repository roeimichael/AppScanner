import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

const PostSchema = z.object({
    name: z.string().min(1).max(120),
    city: z.string().max(120).nullable().optional(),
    note: z.string().max(500).nullable().optional(),
});

interface NbhdRow {
    id: string;
    name: string;
    city: string | null;
    note: string | null;
    created_at: string;
}

export async function GET() {
    const sb = supabase();
    const { data, error } = await sb
        .from('target_neighborhoods')
        .select('*')
        .order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
        neighborhoods: (data ?? []).map((r: NbhdRow) => ({
            id: r.id, name: r.name, city: r.city, note: r.note, createdAt: r.created_at,
        })),
    });
}

export async function POST(req: Request) {
    const parsed = PostSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    const sb = supabase();
    const { data, error } = await sb
        .from('target_neighborhoods')
        .insert({ name: parsed.data.name, city: parsed.data.city ?? null, note: parsed.data.note ?? null })
        .select()
        .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
        neighborhood: { id: data.id, name: data.name, city: data.city, note: data.note, createdAt: data.created_at },
    });
}
