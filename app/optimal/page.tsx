'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListingCard, type ListingCardData } from '@/components/listing-card';
import { SortFilterBar, applySortFilter, defaultQuickFilters, type QuickFilters, type SortKey } from '@/components/sort-filter-bar';

interface ScoredFactor {
    key: string;
    label: string;
    weight: number;
    value: number;
    contribution: number;
    detail?: string;
}

interface ScoredListing extends ListingCardData {
    searchId: string;
    searchName?: string;
    score: number;
    breakdown: ScoredFactor[];
    firstSeenAt?: string;
}

const scoreColor = (s: number) => {
    if (s >= 85) return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
    if (s >= 70) return 'text-lime-400 bg-lime-500/15 border-lime-500/30';
    if (s >= 50) return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
    return 'text-muted-foreground bg-muted border-border';
};

export default function OptimalPage() {
    const [items, setItems] = useState<ScoredListing[]>([]);
    const [searches, setSearches] = useState<{ id: string; name: string }[]>([]);
    const [searchFilter, setSearchFilter] = useState<string>('all');
    const [sort, setSort] = useState<SortKey>('score_desc');
    const [filters, setFilters] = useState<QuickFilters>(defaultQuickFilters);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            fetch('/api/optimal?includeDismissed=1&includeRemoved=1').then(r => r.json()),
            fetch('/api/searches').then(r => r.json()),
        ]).then(([oj, sj]) => {
            setItems(oj.listings ?? []);
            setSearches((sj.searches ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
            setLoading(false);
        });
    }, []);

    const scoped = useMemo(
        () => searchFilter === 'all' ? items : items.filter(i => i.searchId === searchFilter),
        [items, searchFilter],
    );

    const filtered = useMemo(() => applySortFilter(scoped, filters, sort), [scoped, filters, sort]);

    const top = filtered[0];
    const rest = filtered.slice(1);

    const allWeightsZero = items.length > 0 && items.every(i => i.breakdown.length === 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
                    <Sparkles className="h-7 w-7 text-primary" />
                    Optimal listings
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Tracked listings ranked by how well they match your &ldquo;ranking preferences&rdquo;. Edit any search to tune what counts.
                </p>
            </div>

            {!loading && allWeightsZero && (
                <Card className="bg-amber-500/5 border-amber-500/30">
                    <CardContent className="py-4 text-sm">
                        <strong className="text-amber-400">No ranking preferences set.</strong>{' '}
                        <span className="text-muted-foreground">
                            All listings score 50 (neutral). Open a search → <em>Ranking</em> tab to set ideal price/sqm and feature weights.
                        </span>
                    </CardContent>
                </Card>
            )}

            {!loading && items.length > 0 && (
                <div className="space-y-2">
                    {searches.length > 1 && (
                        <Tabs value={searchFilter} onValueChange={setSearchFilter}>
                            <TabsList>
                                <TabsTrigger value="all">All searches</TabsTrigger>
                                {searches.map(s => <TabsTrigger key={s.id} value={s.id}>{s.name}</TabsTrigger>)}
                            </TabsList>
                        </Tabs>
                    )}
                    <SortFilterBar
                        sort={sort}
                        onSort={setSort}
                        filters={filters}
                        onFilters={setFilters}
                        totalCount={scoped.length}
                        filteredCount={filtered.length}
                    />
                </div>
            )}

            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-64 rounded-xl" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
                    </div>
                </div>
            ) : filtered.length === 0 ? (
                <Card className="py-16 text-center bg-card/50 backdrop-blur border-dashed">
                    <p className="text-muted-foreground">No tracked listings yet — run a scan first.</p>
                </Card>
            ) : (
                <>
                    {/* Featured top match */}
                    {top && (
                        <Card className="bg-gradient-to-br from-primary/10 via-card/50 to-card/50 backdrop-blur border-primary/30 ring-1 ring-primary/20">
                            <CardHeader>
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div>
                                        <Badge className="bg-primary/20 text-primary border-primary/30 mb-2">
                                            <Sparkles className="h-3 w-3 mr-1" />Top match
                                        </Badge>
                                        <CardTitle className="text-2xl">{top.city} — {top.neighborhood ?? ''}</CardTitle>
                                    </div>
                                    <ScoreBadge score={top.score} large />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid lg:grid-cols-2 gap-6">
                                    <ListingCard data={top} />
                                    <ScoreBreakdown factors={top.breakdown} />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {rest.length > 0 && (
                        <div>
                            <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3 font-medium">
                                Next {rest.length} {rest.length === 1 ? 'match' : 'matches'}
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {rest.map(l => (
                                    <div key={`${l.sourceId}:${l.token}`} className="space-y-2">
                                        <div className="relative">
                                            <ListingCard data={l} />
                                            <div className="absolute top-2 left-1/2 -translate-x-1/2">
                                                <ScoreBadge score={l.score} />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setExpanded(expanded === l.token ? null : l.token)}
                                            className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                                        >
                                            <ChevronDown className={`h-3 w-3 transition-transform ${expanded === l.token ? 'rotate-180' : ''}`} />
                                            {expanded === l.token ? 'hide' : 'why'}
                                        </button>
                                        {expanded === l.token && (
                                            <Card className="p-3 bg-card/30">
                                                <ScoreBreakdown factors={l.breakdown} compact />
                                            </Card>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function ScoreBadge({ score, large = false }: { score: number; large?: boolean }) {
    const cls = scoreColor(score);
    return (
        <div className={`inline-flex items-center gap-1.5 rounded-full border ${cls} backdrop-blur ${large ? 'px-4 py-2' : 'px-3 py-1'}`}>
            <Sparkles className={large ? 'h-4 w-4' : 'h-3 w-3'} />
            <span className={`font-mono tabular-nums font-semibold ${large ? 'text-2xl' : 'text-sm'}`}>{score}</span>
            <span className="text-xs opacity-70">/100</span>
        </div>
    );
}

function ScoreBreakdown({ factors, compact = false }: { factors: ScoredFactor[]; compact?: boolean }) {
    if (factors.length === 0) {
        return <p className="text-sm text-muted-foreground">No ranking preferences set yet.</p>;
    }
    const maxContrib = Math.max(...factors.map(f => f.contribution), 0.01);
    return (
        <div className={`space-y-${compact ? 1.5 : 2}`}>
            {!compact && (
                <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    Score breakdown
                </h3>
            )}
            {factors.map((f) => (
                <div key={f.key} className="space-y-0.5">
                    <div className="flex items-center justify-between text-sm">
                        <span>{f.label}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                            {f.detail && <span className="mr-2">{f.detail}</span>}
                            <span>w{f.weight} × {(f.value * 100).toFixed(0)}%</span>
                        </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                            className="h-full bg-primary"
                            style={{ width: `${(f.contribution / maxContrib) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
