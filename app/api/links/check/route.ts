import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Reachability check for saved links. Pings each URL once with a browser-like UA and a
// short timeout, then classifies: any HTTP response < 500 means the host is alive (a 403
// login wall still counts — the spot exists); a network error / timeout / 5xx is unreachable.
// Results are returned to the client only (not persisted) — re-run any time from the page.

export const maxDuration = 30;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function ping(url: string): Promise<{ status: 'ok' | 'unreachable'; httpStatus: number | null }> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
        const res = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            signal: ctrl.signal,
            headers: { 'user-agent': UA, accept: 'text/html,*/*' },
        });
        return { status: res.status < 500 ? 'ok' : 'unreachable', httpStatus: res.status };
    } catch {
        return { status: 'unreachable', httpStatus: null };
    } finally {
        clearTimeout(timer);
    }
}

export async function POST() {
    const sb = supabase();
    const { data, error } = await sb.from('relevant_links').select('id,url');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const links = (data ?? []) as { id: string; url: string }[];
    const results = await Promise.all(
        links.map(async (l) => ({ id: l.id, ...(await ping(l.url)) })),
    );
    return NextResponse.json({ results });
}
