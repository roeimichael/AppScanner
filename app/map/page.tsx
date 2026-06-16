'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPinned, TrainFront } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FOCUS_CITIES, focusCityById } from '@/lib/focus-cities';
import {
    SortFilterBar, applySortFilter, defaultQuickFilters,
    type QuickFilters, type SortKey,
} from '@/components/sort-filter-bar';

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
    userState?: 'favorite' | 'dismissed' | null;
    status?: string;
    createdAt?: string;
    firstSeenAt?: string;
}

export default function MapPage() {
    const [listings, setListings] = useState<MapListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [cityId, setCityId] = useState<number | null>(null);
    const [sourceFilter, setSourceFilter] = useState<string>('all');
    const [colorBy, setColorBy] = useState<'source' | 'price'>('source');
    const [filters, setFilters] = useState<QuickFilters>(defaultQuickFilters());
    const [sort, setSort] = useState<SortKey>('posted_desc');

    useEffect(() => {
        fetch('/api/listings').then(r => r.json()).then(j => {
            setListings(j.listings ?? []);
            setLoading(false);
        });
    }, []);

    const sources = useMemo(() => [...new Set(listings.map(l => l.sourceId))], [listings]);
    const selectedCity = focusCityById(cityId ?? undefined);

    // Map-specific narrowing first (city + source), then the shared Pool-style filters.
    const base = useMemo(() => listings.filter(l => {
        if (selectedCity && l.city !== selectedCity.hebrew) return false;
        if (sourceFilter !== 'all' && l.sourceId !== sourceFilter) return false;
        return true;
    }), [listings, selectedCity, sourceFilter]);

    const filtered = useMemo(() => applySortFilter(base, filters, sort), [base, filters, sort]);

    const withCoords = filtered.filter(l => typeof l.lat === 'number' && typeof l.lon === 'number').length;
    const center: [number, number] | null = selectedCity ? [selectedCity.lat, selectedCity.lon] : null;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
                    <MapPinned className="h-7 w-7 text-primary" />
                    Map
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {loading ? '…' : `${withCoords} of ${filtered.length} listings plotted`}
                </p>
            </div>

            {!loading && listings.length > 0 && (
                <>
                    <Card className="p-3 space-y-3 bg-card/50 backdrop-blur">
                        {/* City — recenters the map */}
                        <Group label="City">
                            <Chip active={cityId === null} onClick={() => setCityId(null)} label="All" />
                            {FOCUS_CITIES.map(c => (
                                <Chip key={c.cityId} active={cityId === c.cityId} onClick={() => setCityId(c.cityId)} label={c.name} lrt={c.hasLrt} />
                            ))}
                        </Group>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/40 pt-3">
                            {sources.length > 1 && (
                                <Group label="Source">
                                    <Chip active={sourceFilter === 'all'} onClick={() => setSourceFilter('all')} label="All" />
                                    {sources.map(s => (
                                        <Chip key={s} active={sourceFilter === s} onClick={() => setSourceFilter(s)} label={s}
                                              dot={s === 'yad2' ? '#fb923c' : s === 'onmap' ? '#2dd4bf' : '#f472b6'} />
                                    ))}
                                </Group>
                            )}
                            <Group label="Color by">
                                <Chip active={colorBy === 'source'} onClick={() => setColorBy('source')} label="Source" />
                                <Chip active={colorBy === 'price'} onClick={() => setColorBy('price')} label="Price" />
                            </Group>
                        </div>

                        {/* Single light-rail line (no longer duplicated in the subtitle) */}
                        <div className="text-xs border-t border-border/40 pt-2">
                            {selectedCity ? (
                                selectedCity.hasLrt ? (
                                    <span className="text-red-400 inline-flex items-center gap-1.5"><TrainFront className="h-3.5 w-3.5" /> Red Line runs through {selectedCity.name}.</span>
                                ) : (
                                    <span className="text-muted-foreground">No operational light rail in {selectedCity.name} yet.</span>
                                )
                            ) : (
                                <span className="text-red-400 inline-flex items-center gap-1.5"><TrainFront className="h-3.5 w-3.5" /> Red line on the map = Tel Aviv Light Rail.</span>
                            )}
                        </div>
                    </Card>

                    {/* Pool-style dynamic filtering — same bar as the Pool page */}
                    <SortFilterBar
                        sort={sort}
                        onSort={setSort}
                        filters={filters}
                        onFilters={setFilters}
                        totalCount={base.length}
                        filteredCount={filtered.length}
                    />
                </>
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
                <ListingsMap listings={filtered} colorBy={colorBy} center={center} />
            )}
        </div>
    );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">{label}</span>
            <div className="flex flex-wrap items-center gap-1.5">{children}</div>
        </div>
    );
}

function Chip({ active, onClick, label, lrt, dot }: {
    active: boolean;
    onClick: () => void;
    label: string;
    lrt?: boolean;
    dot?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-colors ${active ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-background border-border text-muted-foreground hover:bg-accent'}`}
        >
            {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
            {label}
            {lrt && <TrainFront className="h-3 w-3 text-red-400" />}
        </button>
    );
}
