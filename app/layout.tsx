import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import { Bell, Building2, Cog, Home, Map as MapIcon, Sparkles } from 'lucide-react';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'appscanner',
    description: 'Apartment listing notifier',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}>
            <body className="min-h-full flex flex-col bg-background text-foreground">
                <TooltipProvider delay={150}>
                    <header className="border-b border-border/60 sticky top-0 z-40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <nav className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-1">
                            <Link href="/" className="flex items-center gap-2 font-semibold mr-4">
                                <Building2 className="h-5 w-5 text-primary" />
                                <span>appscanner</span>
                            </Link>
                            <NavLink href="/" icon={<Home className="h-4 w-4" />}>Searches</NavLink>
                            <NavLink href="/optimal" icon={<Sparkles className="h-4 w-4" />}>Optimal</NavLink>
                            <NavLink href="/map" icon={<MapIcon className="h-4 w-4" />}>Map</NavLink>
                            <NavLink href="/notifications" icon={<Bell className="h-4 w-4" />}>Activity</NavLink>
                            <div className="ml-auto">
                                <NavLink href="/settings" icon={<Cog className="h-4 w-4" />}>Settings</NavLink>
                            </div>
                        </nav>
                    </header>
                    <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">{children}</main>
                    <Toaster richColors position="top-right" />
                </TooltipProvider>
            </body>
        </html>
    );
}

function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md px-3 py-1.5 transition-colors"
        >
            {icon}
            {children}
        </Link>
    );
}
