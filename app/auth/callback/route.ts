import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// OAuth redirect target: exchanges the code for a session cookie, optionally enforces an
// email allowlist (set ALLOWED_EMAILS="a@x.com,b@y.com" to restrict; empty = open sign-in),
// then sends the user on to their original destination.
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') || '/';

    if (!code) return NextResponse.redirect(`${origin}/login?error=missing_code`);

    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/login?error=auth`);

    const allow = (process.env.ALLOWED_EMAILS ?? '')
        .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (allow.length > 0) {
        const email = data.user?.email?.toLowerCase();
        if (!email || !allow.includes(email)) {
            await supabase.auth.signOut();
            return NextResponse.redirect(`${origin}/login?error=not_allowed`);
        }
    }

    return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/'}`);
}
