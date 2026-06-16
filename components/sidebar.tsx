'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Boxes, Building2, Cog, Home, ListChecks, Map as MapIcon, Sparkles } from 'lucide-react';
import { UserMenu } from '@/components/user-menu';

const NAV = [
    { href: '/', label: 'Searches', icon: Home },
    { href: '/optimal', label: 'Pool', icon: Sparkles },
    { href: '/tracker', label: 'Tracker', icon: ListChecks },
    { href: '/sources', label: 'Sources', icon: Boxes },
    { href: '/map', label: 'Map', icon: MapIcon },
] as const;

export function Sidebar() {
    const pathname = usePathname();
    const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

    return (
        <aside className="sticky top-0 h-screen w-56 shrink-0 border-r border-border/60 bg-card/30 backdrop-blur flex flex-col">
            <Link href="/" className="flex items-center gap-2.5 px-5 h-16 border-b border-border/60">
                <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="leading-tight">
                    <div className="text-lg font-semibold tracking-tight">appscanner</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest">apartment radar</div>
                </div>
            </Link>

            <nav className="flex-1 px-3 py-4 space-y-1">
                {NAV.map(({ href, label, icon: Icon }) => {
                    const active = isActive(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                                active
                                    ? 'bg-primary/15 text-primary font-medium'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            }`}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            <div className="px-3 py-4 border-t border-border/60">
                <UserMenu />
                <Link
                    href="/settings"
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                        isActive('/settings')
                            ? 'bg-primary/15 text-primary font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                >
                    <Cog className="h-4 w-4 shrink-0" />
                    Settings
                </Link>
            </div>
        </aside>
    );
}
