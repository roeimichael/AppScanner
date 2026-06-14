import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const sb = supabase();
    const { error } = await sb.from('relevant_links').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
