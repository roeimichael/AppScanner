'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Filter, MapPinned } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ListingsMap = dynamic(() => import('@/components/listings-map').then(m => m.ListingsMap), {
    ssr: false,
    loading: () => <Skeleton className="h-[70vh] rounded-xl" />,
});

interface MapListing {
    sourceId: string;
    token: string;
    link: string;
    image?: string;
    city?: string;
    neighborhood?: string;
    street?: string;
    houseNumber?: number | string;
    rooms?: number;
    sqm?: number;
    price?: number;
    isAgency?: boolean;
    lat?: number;
    lon?: number;
    searchId: string;
    searchName?: string;
}

export default function MapPage() {
    const [listings, setListings] = useState<MapListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchFilter, setSearchFilter] = useState<string>('all');
    const [sourceFilter, setSourceFilter] = useState<string>('all');
    const [colorBy, setColorBy] = useState<'source' | 'price'>('source');
    const [hideDismissed, setHideDismissed] = useState(true);

    useEffect(() => {
        fetch('/api/listings').then(r => r.json()).then(j => {
            setListings(j.listings ?? []);
            setLoading(false);
        });
    }, []);

    const searches = useMemo(() => {
        const m = new Map<string, string>();
        for (const l of listings) m.set(l.searchId, l.searchName ?? l.searchId);
        return [...m.entries()].map(([id, name]) => ({ id, name }));
    }, [listings]);

    const sources = useMemo(() => [...new Set(listings.map(l => l.sourceId))], [listings]);

    const filtered = useMemo(() => {
        return listings.filter(l => {
            if (searchFilter !== 'all' && l.searchId !== searchFilter) return false;
            if (sourceFilter !== 'all' && l.sourceId !== sourceFilter) return false;
            if (hideDismissed && (l as MapListing & { userState?: string }).userState === 'dismissed') return false;
            return true;
        });
    }, [listings, searchFilter, sourceFilter, hideDismissed]);

    const withCoords = filtered.filter(l => typeof l.lat === 'number' && typeof l.lon === 'number').length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
                        <MapPinned className="h-7 w-7 text-primary" />
                        Map
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {loading ? '…' : `${withCoords} of ${filtered.length} listings have coordinates`}
                    </p>
                </div>
            </div>

            {!loading && listings.length > 0 && (
                <Card className="p-3 flex flex-wrap items-center gap-3 bg-card/50 backdrop-blur">
                    <Filter className="h-4 w-4 text-muted-foreground" />

                    {searches.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Search</span>
                            <Tabs value={searchFilter} onValueChange={setSearchFilter}>
                                <TabsList>
                                    <TabsTrigger value="all">All</TabsTrigger>
                                    {searches.map(s => (
                                        <TabsTrigger key={s.id} value={s.id}>{s.name}</TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </div>
                    )}

                    {sources.length > 1 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Source</span>
                            <Tabs value={sourceFilter} onValueChange={setSourceFilter}>
                                <TabsList>
                                    <TabsTrigger value="all">All</TabsTrigger>
                                    {sources.map(s => (
                                        <TabsTrigger key={s} value={s}>
                                            <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{
                                                background: s === 'yad2' ? '#fb923c' : s === 'onmap' ? '#2dd4bf' : '#a78bfa',
                                            }} />
                                            {s}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Color</span>
                        <Tabs value={colorBy} onValueChange={(v) => setColorBy(v as 'source' | 'price')}>
                            <TabsList>
                                <TabsTrigger value="source">By source</TabsTrigger>
                                <TabsTrigger value="price">By price</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <button
                        onClick={() => setHideDismissed(v => !v)}
                        className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${hideDismissed ? 'bg-muted/30 border-border text-muted-foreground' : 'bg-primary/10 border-primary/40 text-primary'}`}
                    >
                        {hideDismissed ? 'show dismissed' : 'hide dismissed'}
                    </button>

                    <div className="ml-auto flex gap-2">
                        <Badge variant="outline" className="font-mono">{filtered.length} pts</Badge>
                    </div>
                </Card>
            )}

            {loading ? (
                <Skeleton className="h-[70vh] rounded-xl" />
            ) : listings.length === 0 ? (
                <Card className="py-16 text-center bg-card/50 backdrop-blur border-dashed">
                    <div className="space-y-3 max-w-sm mx-auto">
                        <div className="h-12 w-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                            <MapPinned className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold">No listings yet</h3>
                        <p className="text-sm text-muted-foreground">Run a scan to populate the map.</p>
                    </div>
                </Card>
            ) : (
                <ListingsMap listings={filtered} colorBy={colorBy} />
            )}
        </div>
    );
}
