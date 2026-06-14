import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

const KINDS = ['fb_group', 'marketplace', 'site', 'other'] as const;

const PostSchema = z.object({
    name: z.string().min(1).max(200),
    url: z.string().url(),
    kind: z.enum(KINDS).default('other'),
    note: z.string().max(500).nullable().optional(),
});

interface Row {
    id: string;
    name: string;
    url: string;
    kind: typeof KINDS[number];
    note: string | null;
    created_at: string;
}

const mapRow = (r: Row) => ({
    id: r.id, name: r.name, url: r.url, kind: r.kind, note: r.note, createdAt: r.created_at,
});

export async function GET() {
    const sb = supabase();
    const { data, error } = await sb.from('relevant_links').select('*').order('kind').order('created_at');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ links: (data ?? []).map((r: Row) => mapRow(r)), kinds: KINDS });
}

export async function POST(req: Request) {
    const parsed = PostSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    const sb = supabase();
    const { data, error } = await sb
        .from('relevant_links')
        .insert({ name: parsed.data.name, url: parsed.data.url, kind: parsed.data.kind, note: parsed.data.note ?? null })
        .select()
        .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ link: mapRow(data as Row) });
}
