'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Bucket {
    bucket: string;
    count: number;
    bySource: Record<string, number>;
}

type Range = '24h' | '7d' | '30d';

const SOURCE_COLOR: Record<string, string> = {
    yad2: 'rgb(251 146 60)',
    onmap: 'rgb(45 212 191)',
    homeless: 'rgb(167 139 250)',
};

const fmtBucket = (key: string, range: Range) => {
    if (range === '24h') {
        const hr = key.slice(11, 13);
        return `${hr}:00`;
    }
    return key.slice(5);
};

export function ListingFlowChart() {
    const [buckets, setBuckets] = useState<Bucket[]>([]);
    const [range, setRange] = useState<Range>('30d');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/listing-flow?range=${range}`)
            .then(r => r.json())
            .then(j => { setBuckets(j.buckets ?? []); setLoading(false); });
    }, [range]);

    if (loading) return <Skeleton className="h-44 rounded-xl" />;

    const max = Math.max(1, ...buckets.map(b => b.count));
    const total = buckets.reduce((s, b) => s + b.count, 0);
    const sourceIds = [...new Set(buckets.flatMap(b => Object.keys(b.bySource)))];

    return (
        <Card className="bg-card/50 backdrop-blur">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Listings posted ({total} in window)
                </CardTitle>
                <div className="flex items-center gap-1 text-xs">
                    {(['24h', '7d', '30d'] as const).map(r => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-2 py-1 rounded-md border transition-colors ${range === r ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-background border-border text-muted-foreground hover:bg-accent'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-end gap-px h-32">
                    {buckets.map(b => {
                        const heightPct = b.count === 0 ? 1 : (b.count / max) * 100;
                        return (
                            <div key={b.bucket} className="flex-1 flex flex-col items-center min-w-0 group" title={`${b.bucket} — ${b.count}`}>
                                <div className="text-[9px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity h-3">
                                    {b.count || ''}
                                </div>
                                <div
                                    className="w-full rounded-t flex flex-col-reverse overflow-hidden bg-muted/30"
                                    style={{ height: `${heightPct}%`, minHeight: '3px' }}
                                >
                                    {sourceIds.map(sid => {
                                        const v = b.bySource[sid] ?? 0;
                                        if (v === 0) return null;
                                        const portion = (v / b.count) * 100;
                                        return (
                                            <div
                                                key={sid}
                                                style={{ height: `${portion}%`, background: SOURCE_COLOR[sid] ?? 'gray' }}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground font-mono">
                    <span>{buckets[0] ? fmtBucket(buckets[0].bucket, range) : ''}</span>
                    <span>{range === '24h' ? 'last 24 hours, hourly' : `last ${range === '7d' ? 7 : 30} days, daily`}</span>
                    <span>{buckets[buckets.length - 1] ? fmtBucket(buckets[buckets.length - 1].bucket, range) : ''}</span>
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                    {sourceIds.map(sid => (
                        <span key={sid} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SOURCE_COLOR[sid] }} />
                            {sid}
                        </span>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
