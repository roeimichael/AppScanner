'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';

// Auth pages render bare (no sidebar); everything else gets the app shell.
const BARE_PREFIXES = ['/login', '/auth'];

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const bare = BARE_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'));
    if (bare) return <>{children}</>;

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 min-w-0 px-6 md:px-10 py-8">
                <div className="max-w-6xl mx-auto">{children}</div>
            </main>
        </div>
    );
}
