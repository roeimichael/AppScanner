'use client';

import { ArrowDownAZ, ArrowDownNarrowWide, ArrowUpNarrowWide, Clock, Coins, Filter, Heart, Image as ImageIcon, MapPinned, Search as SearchIcon, Sparkles, TrendingDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export type SortKey =
    | 'score_desc'
    | 'posted_desc'
    | 'tracked_desc'
    | 'price_asc'
    | 'price_desc'
    | 'sqm_desc'
    | 'rooms_desc';

export const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
    { key: 'score_desc', label: 'Best fit', icon: <Sparkles className="h-3.5 w-3.5" /> },
    { key: 'posted_desc', label: 'Newest posted', icon: <Clock className="h-3.5 w-3.5" /> },
    { key: 'tracked_desc', label: 'Newest tracked', icon: <Clock className="h-3.5 w-3.5" /> },
    { key: 'price_asc', label: 'Cheapest first', icon: <ArrowUpNarrowWide className="h-3.5 w-3.5" /> },
    { key: 'price_desc', label: 'Most expensive', icon: <ArrowDownNarrowWide className="h-3.5 w-3.5" /> },
    { key: 'sqm_desc', label: 'Largest first', icon: <ArrowDownAZ className="h-3.5 w-3.5" /> },
    { key: 'rooms_desc', label: 'Most rooms', icon: <ArrowDownAZ className="h-3.5 w-3.5" /> },
];

export interface QuickFilters {
    favoritesOnly: boolean;
    hideDismissed: boolean;
    hideRemoved: boolean;
    hasImage: boolean;
    noAgency: boolean;
    priceDropOnly: boolean;
    minPrice?: number;
    maxPrice?: number;
    minRooms?: number;
    maxRooms?: number;
    minSqm?: number;
    cityFilter?: string;
    text?: string;
}

export const defaultQuickFilters = (): QuickFilters => ({
    favoritesOnly: false,
    hideDismissed: true,
    hideRemoved: true,
    hasImage: false,
    noAgency: false,
    priceDropOnly: false,
});

export function SortFilterBar({
    sort, onSort, filters, onFilters, totalCount, filteredCount,
}: {
    sort: SortKey;
    onSort: (k: SortKey) => void;
    filters: QuickFilters;
    onFilters: (f: QuickFilters) => void;
    totalCount: number;
    filteredCount: number;
}) {
    const active = SORT_OPTIONS.find(o => o.key === sort)!;

    const toggle = (k: keyof QuickFilters) => {
        onFilters({ ...filters, [k]: !filters[k] } as QuickFilters);
    };

    const setNum = (k: keyof QuickFilters, v: string) => {
        const n = v ? Number(v) : undefined;
        onFilters({ ...filters, [k]: n } as QuickFilters);
    };

    const activeFilterCount = [
        filters.favoritesOnly, filters.hasImage, filters.noAgency, filters.priceDropOnly,
        filters.minPrice != null, filters.maxPrice != null, filters.minRooms != null,
        filters.maxRooms != null, filters.minSqm != null, !!filters.cityFilter, !!filters.text,
    ].filter(Boolean).length;

    const clearAll = () => onFilters(defaultQuickFilters());

    return (
        <Card className="p-3 bg-card/50 backdrop-blur space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                    <SearchIcon className="h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search city, street, neighborhood…"
                        value={filters.text ?? ''}
                        onChange={(e) => onFilters({ ...filters, text: e.target.value || undefined })}
                        className="h-8 w-64"
                    />
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger render={
                        <Button variant="outline" size="sm" className="gap-2">
                            {active.icon}
                            <span>{active.label}</span>
                        </Button>
                    } />
                    <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {SORT_OPTIONS.map(o => (
                            <DropdownMenuItem key={o.key} onClick={() => onSort(o.key)} className={sort === o.key ? 'bg-accent' : ''}>
                                <span className="mr-2">{o.icon}</span>
                                {o.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="h-6 w-px bg-border" />

                <Chip on={filters.favoritesOnly} onClick={() => toggle('favoritesOnly')} icon={<Heart className="h-3 w-3" />} label="Favorites" tint="pink" />
                <Chip on={filters.hasImage} onClick={() => toggle('hasImage')} icon={<ImageIcon className="h-3 w-3" />} label="With photo" />
                <Chip on={filters.noAgency} onClick={() => toggle('noAgency')} icon={<Coins className="h-3 w-3" />} label="No fee" tint="emerald" />
                <Chip on={filters.priceDropOnly} onClick={() => toggle('priceDropOnly')} icon={<TrendingDown className="h-3 w-3" />} label="Price drop" tint="emerald" />
                <Chip on={!filters.hideDismissed} onClick={() => toggle('hideDismissed')} icon={<X className="h-3 w-3" />} label="Show dismissed" />
                <Chip on={!filters.hideRemoved} onClick={() => toggle('hideRemoved')} icon={<MapPinned className="h-3 w-3" />} label="Show removed" />

                <div className="ml-auto flex items-center gap-2">
                    {activeFilterCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs h-7">
                            Clear filters
                        </Button>
                    )}
                    <Badge variant="outline" className="font-mono">
                        {filteredCount === totalCount ? `${totalCount}` : `${filteredCount}/${totalCount}`}
                    </Badge>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <NumPair label="Price"
                    minVal={filters.minPrice} maxVal={filters.maxPrice}
                    setMin={v => setNum('minPrice', v)} setMax={v => setNum('maxPrice', v)}
                    step={250}
                />
                <NumPair label="Rooms"
                    minVal={filters.minRooms} maxVal={filters.maxRooms}
                    setMin={v => setNum('minRooms', v)} setMax={v => setNum('maxRooms', v)}
                    step={0.5}
                />
                <NumPair label="Min sqm"
                    minVal={filters.minSqm}
                    setMin={v => setNum('minSqm', v)}
                />
            </div>
        </Card>
    );
}

function Chip({ on, onClick, icon, label, tint }: {
    on: boolean; onClick: () => void; icon: React.ReactNode; label: string; tint?: 'pink' | 'emerald' | 'amber';
}) {
    const tints: Record<string, string> = {
        pink: 'bg-pink-500/15 border-pink-500/40 text-pink-400',
        emerald: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
        amber: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
    };
    const onClass = tint ? tints[tint] : 'bg-primary/15 border-primary/40 text-primary';
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-colors ${on ? onClass : 'bg-background border-border text-muted-foreground hover:bg-accent'}`}
        >
            {icon}{label}
        </button>
    );
}

function NumPair({ label, minVal, maxVal, setMin, setMax, step }: {
    label: string;
    minVal?: number;
    maxVal?: number;
    setMin: (v: string) => void;
    setMax?: (v: string) => void;
    step?: number;
}) {
    return (
        <div className="inline-flex items-center gap-1.5">
            <span className="text-muted-foreground">{label}</span>
            <Input
                type="number"
                step={step ?? 1}
                placeholder="min"
                value={minVal ?? ''}
                onChange={(e) => setMin(e.target.value)}
                className="h-7 w-20 text-xs"
            />
            {setMax && (
                <>
                    <span className="text-muted-foreground">–</span>
                    <Input
                        type="number"
                        step={step ?? 1}
                        placeholder="max"
                        value={maxVal ?? ''}
                        onChange={(e) => setMax(e.target.value)}
                        className="h-7 w-20 text-xs"
                    />
                </>
            )}
        </div>
    );
}

// Apply sort + filter pipeline in one place.
export interface SortableListing {
    sourceId: string;
    token: string;
    score?: number;
    price?: number;
    sqm?: number;
    rooms?: number;
    isAgency?: boolean;
    image?: string;
    eventKind?: string;
    status?: string;
    userState?: 'favorite' | 'dismissed' | null;
    createdAt?: string;
    firstSeenAt?: string;
    city?: string;
    neighborhood?: string;
    street?: string;
}

export const applySortFilter = <T extends SortableListing>(items: T[], filters: QuickFilters, sort: SortKey): T[] => {
    let out = items;
    if (filters.favoritesOnly) out = out.filter(l => l.userState === 'favorite');
    if (filters.hideDismissed) out = out.filter(l => l.userState !== 'dismissed');
    if (filters.hideRemoved) out = out.filter(l => l.status !== 'removed');
    if (filters.hasImage) out = out.filter(l => !!l.image);
    if (filters.noAgency) out = out.filter(l => l.isAgency === false);
    if (filters.priceDropOnly) out = out.filter(l => l.eventKind === 'price_drop');
    if (filters.minPrice != null) out = out.filter(l => (l.price ?? 0) >= filters.minPrice!);
    if (filters.maxPrice != null) out = out.filter(l => (l.price ?? Infinity) <= filters.maxPrice!);
    if (filters.minRooms != null) out = out.filter(l => (l.rooms ?? 0) >= filters.minRooms!);
    if (filters.maxRooms != null) out = out.filter(l => (l.rooms ?? Infinity) <= filters.maxRooms!);
    if (filters.minSqm != null) out = out.filter(l => (l.sqm ?? 0) >= filters.minSqm!);
    if (filters.text) {
        const q = filters.text.toLowerCase();
        out = out.filter(l => [l.city, l.neighborhood, l.street].some(s => s?.toLowerCase().includes(q)));
    }

    const sorted = [...out];
    switch (sort) {
        case 'score_desc':
            sorted.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
            break;
        case 'posted_desc':
            sorted.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
            break;
        case 'tracked_desc':
            sorted.sort((a, b) => new Date(b.firstSeenAt ?? 0).getTime() - new Date(a.firstSeenAt ?? 0).getTime());
            break;
        case 'price_asc':
            sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
            break;
        case 'price_desc':
            sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
            break;
        case 'sqm_desc':
            sorted.sort((a, b) => (b.sqm ?? 0) - (a.sqm ?? 0));
            break;
        case 'rooms_desc':
            sorted.sort((a, b) => (b.rooms ?? 0) - (a.rooms ?? 0));
            break;
    }
    return sorted;
};
