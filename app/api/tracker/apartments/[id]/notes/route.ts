import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

const PostSchema = z.object({
    author: z.string().min(1).max(40),
    body: z.string().min(1).max(2000),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const parsed = PostSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    const sb = supabase();
    const { data, error } = await sb
        .from('tracker_notes')
        .insert({ apartment_id: id, author: parsed.data.author, body: parsed.data.body })
        .select()
        .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Bump parent updated_at so UI sorts by recent activity if needed.
    await sb.from('tracked_apartments').update({ updated_at: new Date().toISOString() }).eq('id', id);
    return NextResponse.json({
        note: { id: data.id, author: data.author, body: data.body, createdAt: data.created_at },
    });
}
