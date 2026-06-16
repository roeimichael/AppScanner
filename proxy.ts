import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Auth is OFF until the public Supabase env vars are present, so the app keeps working
// unauthenticated until Google sign-in is configured (no risk of locking yourself out).
const AUTH_ENABLED = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Paths reachable without a session.
const PUBLIC_PREFIXES = ['/login', '/auth'];

// Next.js 16 "proxy" convention (formerly middleware).
export async function proxy(request: NextRequest) {
    if (!AUTH_ENABLED) return NextResponse.next();

    const { pathname } = request.nextUrl;
    const { response, user } = await updateSession(request);
    const isPublic = PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'));

    if (!user && !isPublic) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('next', pathname);
        return NextResponse.redirect(url);
    }
    if (user && pathname === '/login') {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        url.search = '';
        return NextResponse.redirect(url);
    }
    return response;
}

// Run on everything except Next internals, static assets, and /api (cron uses a bearer secret,
// not a session — it must not be gated).
export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)'],
};
