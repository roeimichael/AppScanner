'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Activity, Bell, ListPlus, Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatsRow } from '@/components/stats-row';
import { SearchRow } from '@/components/search-row';
import { ActivityChart } from '@/components/activity-chart';
import { ListingFlowChart } from '@/components/listing-flow-chart';

interface SearchT {
    id: string;
    name: string;
    enabled: boolean;
    intervalMinutes: number;
    sources: string[];
    filters: Record<string, unknown>;
    lastRunAt: string | null;
    lastRunStatus: 'ok' | 'error' | null;
    lastRunError: string | null;
    createdAt: string;
}

interface StatsT {
    searchesTotal: number;
    searchesEnabled: number;
    totalTracked: number;
    newLast24h: number;
    lastRunAt: string | null;
}

const fmtRelative = (iso: string | null) => {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.round(diff / 60_000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.round(hr / 24)}d ago`;
};

export default function Page() {
    const [searches, setSearches] = useState<SearchT[]>([]);
    const [stats, setStats] = useState<StatsT | null>(null);
    const [loading, setLoading] = useState(true);
    const [scanningAll, setScanningAll] = useState(false);

    const load = async () => {
        const [s, st] = await Promise.all([
            fetch('/api/searches').then(r => r.json()),
            fetch('/api/stats').then(r => r.json()),
        ]);
        setSearches(s.searches);
        setStats(st);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const scanAll = async () => {
        setScanningAll(true);
        try {
            const r = await fetch('/api/scan?force=1');
            const j = await r.json();
            const ok = (j.outcomes ?? []).filter((o: { status: string }) => o.status === 'ok').length;
            const newTotal = (j.outcomes ?? []).reduce((sum: number, o: { newCount?: number }) => sum + (o.newCount ?? 0), 0);
            toast.success(`Scanned ${ok} searches`, { description: `${newTotal} new listings total` });
        } finally {
            setScanningAll(false);
            load();
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Searches</h1>
                    <p className="text-sm text-muted-foreground mt-1">Active scans run on schedule. Get notified the second a new listing matches.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={scanAll} disabled={scanningAll || searches.length === 0}>
                        {scanningAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Scan all
                    </Button>
                    <Link href="/searches/new"><Button><Plus className="h-4 w-4" />New search</Button></Link>
                </div>
            </div>

            {loading || !stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
            ) : (
                <StatsRow
                    items={[
                        { label: 'Active searches', value: `${stats.searchesEnabled}/${stats.searchesTotal}`, icon: Search, accent: stats.searchesEnabled > 0 ? 'success' : 'default' },
                        { label: 'Listings tracked', value: stats.totalTracked.toLocaleString(), icon: ListPlus, sub: 'across all searches' },
                        { label: 'New last 24h', value: stats.newLast24h, icon: Bell, accent: stats.newLast24h > 0 ? 'success' : 'default' },
                        { label: 'Last scan', value: fmtRelative(stats.lastRunAt), icon: Activity, sub: stats.lastRunAt ? new Date(stats.lastRunAt).toLocaleString() : 'no scans yet' },
                    ]}
                />
            )}

            {!loading && searches.length > 0 && (
                <div className="space-y-4">
                    <ListingFlowChart />
                    <ActivityChart />
                </div>
            )}

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
            ) : searches.length === 0 ? (
                <Card className="py-16 text-center bg-card/50 backdrop-blur border-dashed">
                    <div className="space-y-3 max-w-sm mx-auto">
                        <div className="h-12 w-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                            <Search className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold">No searches yet</h3>
                        <p className="text-sm text-muted-foreground">Create your first apartment search and we&apos;ll watch the listings for you.</p>
                        <Link href="/searches/new"><Button><Plus className="h-4 w-4" />Create your first search</Button></Link>
                    </div>
                </Card>
            ) : (
                <div className="space-y-3">
                    {searches.map(s => <SearchRow key={s.id} search={s} onChange={load} />)}
                </div>
            )}
        </div>
    );
}
