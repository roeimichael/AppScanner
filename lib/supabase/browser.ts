import { createBrowserClient } from '@supabase/ssr';

// Browser (anon) Supabase client for auth. Separate from lib/supabase.ts, which is the
// server-only service-role admin client used for data access.
export const createClient = () =>
    createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
