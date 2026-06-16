'use client';

import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

const AUTH_ENABLED = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Shows the signed-in user + a sign-out button in the sidebar. Renders nothing when auth
// isn't configured or no one is signed in, so the app looks unchanged until login is live.
export function UserMenu() {
    const [email, setEmail] = useState<string | null>(null);

    useEffect(() => {
        if (!AUTH_ENABLED) return;
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    }, []);

    if (!AUTH_ENABLED || !email) return null;

    return (
        <form action="/auth/signout" method="post" className="mb-1">
            <div className="px-3 pb-1 text-[11px] text-muted-foreground truncate" title={email}>{email}</div>
            <button
                type="submit"
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
            </button>
        </form>
    );
}
