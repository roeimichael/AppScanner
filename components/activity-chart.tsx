'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface DailyBucket {
    date: string;
    newCount: number;
    bySource: Record<string, number>;
}
interface SourceHealth {
    sourceId: string;
    successRate: number;
    ok: number;
    error: number;
    avgDurationMs: number;
    lastError?: string;
    lastAt?: string;
}

const SOURCE_COLOR: Record<string, string> = {
    yad2: 'rgb(251 146 60)',
    onmap: 'rgb(45 212 191)',
    homeless: 'rgb(167 139 250)',
};

export function ActivityChart() {
    const [daily, setDaily] = useState<DailyBucket[]>([]);
    const [sources, setSources] = useState<SourceHealth[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/activity').then(r => r.json()).then(j => {
            setDaily(j.daily ?? []);
            setSources(j.sources ?? []);
            setLoading(false);
        });
    }, []);

    if (loading) return <Skeleton className="h-44 rounded-xl" />;

    const maxCount = Math.max(1, ...daily.map(d => d.newCount));
    const sourceIds = [...new Set(daily.flatMap(d => Object.keys(d.bySource)))];

    return (
        <div className="grid lg:grid-cols-3 gap-4">
            <Card className="bg-card/50 backdrop-blur lg:col-span-2">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        New listings per day
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end gap-1 h-32">
                        {daily.map((d) => {
                            const total = d.newCount;
                            const heightPct = total === 0 ? 1 : (total / maxCount) * 100;
                            return (
                                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0 group h-full">
                                    <div className="text-[10px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                        {total}
                                    </div>
                                    <div className="flex-1 w-full flex items-end">
                                    <div
                                        className="w-full rounded-t flex flex-col-reverse overflow-hidden bg-muted/40"
                                        style={{ height: `${heightPct}%`, minHeight: '4px' }}
                                    >
                                        {sourceIds.map(sid => {
                                            const v = d.bySource[sid] ?? 0;
                                            if (v === 0) return null;
                                            const portion = (v / total) * 100;
                                            return (
                                                <div
                                                    key={sid}
                                                    style={{ height: `${portion}%`, background: SOURCE_COLOR[sid] ?? 'gray' }}
                                                    title={`${sid}: ${v}`}
                                                />
                                            );
                                        })}
                                    </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground font-mono">
                        <span>{daily[0]?.date}</span>
                        <span>last 14 days</span>
                        <span>{daily[daily.length - 1]?.date}</span>
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

            <Card className="bg-card/50 backdrop-blur">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Source health
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {sources.length === 0 && (
                        <p className="text-xs text-muted-foreground">No scans yet.</p>
                    )}
                    {sources.map((s) => {
                        const ok = s.successRate >= 0.95;
                        const warn = s.successRate >= 0.7 && s.successRate < 0.95;
                        const fail = s.successRate < 0.7;
                        return (
                            <div key={s.sourceId} className="flex items-center justify-between gap-2 text-sm">
                                <span className="font-mono text-xs uppercase tracking-wider" style={{ color: SOURCE_COLOR[s.sourceId] }}>
                                    {s.sourceId}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground font-mono">{s.avgDurationMs}ms</span>
                                    <Badge
                                        variant="secondary"
                                        className={`font-mono text-[10px] ${ok ? 'bg-emerald-500/15 text-emerald-300' : warn ? 'bg-amber-500/15 text-amber-300' : 'bg-destructive/20 text-destructive'}`}
                                    >
                                        {fail && <AlertTriangle className="h-3 w-3 mr-0.5" />}
                                        {Math.round(s.successRate * 100)}%
                                    </Badge>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
}
