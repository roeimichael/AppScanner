import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server-side (anon) Supabase client bound to the request cookies — used by route handlers
// and server components to read/refresh the signed-in user. Data access still goes through
// the service-role admin client in lib/supabase.ts.
export const createClient = async () => {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                    } catch {
                        // Called from a Server Component — safe to ignore; middleware refreshes the session.
                    }
                },
            },
        },
    );
};
