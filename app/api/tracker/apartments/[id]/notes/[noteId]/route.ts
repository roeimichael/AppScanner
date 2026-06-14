import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; noteId: string }> }) {
    const { id, noteId } = await ctx.params;
    const sb = supabase();
    const { error } = await sb.from('tracker_notes').delete().eq('id', noteId).eq('apartment_id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
