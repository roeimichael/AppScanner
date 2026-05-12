'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListingCard, type ListingCardData } from '@/components/listing-card';

interface Notif {
    id: string;
    searchId: string;
    listingToken: string;
    sourceId: string;
    snapshot: ListingCardData;
    sentAt: string;
    channel: string;
    status: string;
    error?: string;
}

interface SearchSummary { id: string; name: string; }

const fmtRelative = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.round(diff / 60_000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.round(hr / 24)}d ago`;
};

export default function NotificationsPage() {
    const [items, setItems] = useState<Notif[]>([]);
    const [searches, setSearches] = useState<SearchSummary[]>([]);
    const [filter, setFilter] = useState<string>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/notifications').then(r => r.json()),
            fetch('/api/searches').then(r => r.json()),
        ]).then(([nj, sj]) => {
            setItems(nj.notifications);
            setSearches((sj.searches ?? []).map((s: SearchSummary) => ({ id: s.id, name: s.name })));
            setLoading(false);
        });
    }, []);

    const filtered = useMemo(() => {
        if (filter === 'all') return items;
        return items.filter(i => i.searchId === filter);
    }, [items, filter]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">Activity</h1>
                <p className="text-sm text-muted-foreground mt-1">Every listing we&apos;ve picked up across your searches.</p>
            </div>

            {!loading && searches.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Tabs value={filter} onValueChange={setFilter}>
                        <TabsList>
                            <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2 font-mono">{items.length}</Badge></TabsTrigger>
                            {searches.map(s => {
                                const c = items.filter(i => i.searchId === s.id).length;
                                return (
                                    <TabsTrigger key={s.id} value={s.id}>
                                        {s.name} <Badge variant="secondary" className="ml-2 font-mono">{c}</Badge>
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </Tabs>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
                </div>
            ) : filtered.length === 0 ? (
                <Card className="py-16 text-center bg-card/50 backdrop-blur border-dashed">
                    <div className="space-y-3 max-w-sm mx-auto">
                        <div className="h-12 w-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                            <Bell className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold">Nothing yet</h3>
                        <p className="text-sm text-muted-foreground">When new listings appear, they&apos;ll show here.</p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((n, i) => (
                        <div key={`${n.id}:${n.sentAt}:${i}`} className="space-y-1.5">
                            <ListingCard data={n.snapshot} />
                            <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                                <span>{fmtRelative(n.sentAt)}</span>
                                <Badge
                                    variant={n.status === 'sent' ? 'default' : n.status === 'failed' ? 'destructive' : 'secondary'}
                                    className="font-mono text-[10px]"
                                >
                                    {n.status}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
