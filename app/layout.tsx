import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
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
            <body className="min-h-full bg-background text-foreground">
                <TooltipProvider delay={150}>
                    <div className="flex min-h-screen">
                        <Sidebar />
                        <main className="flex-1 min-w-0 px-6 md:px-10 py-8">
                            <div className="max-w-6xl mx-auto">{children}</div>
                        </main>
                    </div>
                    <Toaster richColors position="top-right" />
                </TooltipProvider>
            </body>
        </html>
    );
}
