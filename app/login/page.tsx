'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Building2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/browser';

const AUTH_ENABLED = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const ERROR_TEXT: Record<string, string> = {
    auth: 'Sign-in failed. Please try again.',
    not_allowed: 'That account isn’t on the access list.',
    missing_code: 'Sign-in was interrupted. Please try again.',
};

function LoginInner() {
    const params = useSearchParams();
    const next = params.get('next') || '/';
    const errorKey = params.get('error');
    const [pending, setPending] = useState(false);

    const signIn = async () => {
        if (!AUTH_ENABLED) return;
        setPending(true);
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (error) setPending(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-sm p-8 bg-card/60 backdrop-blur space-y-6 text-center">
                <div className="space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/15 mx-auto flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">appscanner</h1>
                        <p className="text-sm text-muted-foreground mt-1">Sign in to access your apartment radar.</p>
                    </div>
                </div>

                {errorKey && (
                    <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                        {ERROR_TEXT[errorKey] ?? 'Something went wrong.'}
                    </div>
                )}

                {AUTH_ENABLED ? (
                    <Button className="w-full" size="lg" onClick={signIn} disabled={pending}>
                        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                        Continue with Google
                    </Button>
                ) : (
                    <p className="text-sm text-muted-foreground">Sign-in isn’t configured yet.</p>
                )}
            </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
            <LoginInner />
        </Suspense>
    );
}

function GoogleIcon() {
    return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
    );
}
