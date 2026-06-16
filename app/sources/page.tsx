'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Boxes, CheckCircle2, ExternalLink, Globe, Loader2, Radio, Wrench, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LIVE_SOURCES, CONSIDERED_SOURCES, STATUS_LABEL, type CatalogSource } from '@/lib/source-catalog';

type Health = { ok: boolean; count: number; error?: string };

export default function SourcesPage() {
    const [health, setHealth] = useState<Record<string, Health>>({});
    const [testing, setTesting] = useState<string | null>(null);
    const [linkCount, setLinkCount] = useState<number | null>(null);

    useEffect(() => {
        fetch('/api/links').then(r => r.json()).then(j => setLinkCount((j.links ?? []).length)).catch(() => {});
    }, []);

    // On-demand live probe (avoids auto-spending ScraperAPI quota on page load).
    const test = async (id: string) => {
        setTesting(id);
        try {
            const r = await fetch('/api/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sources: [id], filters: { cityId: 5000, dealType: 'rent' } }),
            }).then(x => x.json());
            const res = (r.results ?? [])[0] ?? { count: 0, error: 'no result' };
            const h: Health = { ok: !res.error, count: res.count ?? 0, error: res.error };
            setHealth(prev => ({ ...prev, [id]: h }));
            toast[h.ok ? 'success' : 'error'](h.ok ? `${res.count} listings from ${id} (Tel Aviv)` : `${id}: ${res.error}`);
        } finally {
            setTesting(null);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
                    <Boxes className="h-7 w-7 text-primary" />
                    Sources
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Where listings come from. Live feeds flow straight into Pool, Map and Telegram; manual spots live under Links.
                </p>
            </div>

            {/* Live */}
            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-emerald-400" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider">Live feeds</h2>
                    <span className="text-xs text-muted-foreground/70 font-mono">{LIVE_SOURCES.length} scanning</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {LIVE_SOURCES.map(s => (
                        <SourceCard key={s.id} s={s} live health={health[s.id]} testing={testing === s.id} onTest={() => test(s.id)} />
                    ))}
                </div>
            </section>

            {/* Considered */}
            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider">Evaluated / roadmap</h2>
                    <span className="text-xs text-muted-foreground/70 font-mono">{CONSIDERED_SOURCES.length}</span>
                </div>
                <p className="text-xs text-muted-foreground -mt-1">Probed but not wired in — with the honest reason why.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {CONSIDERED_SOURCES.map(s => <SourceCard key={s.id} s={s} />)}
                </div>
            </section>

            {/* Manual */}
            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider">Manual hunting spots</h2>
                </div>
                <Card className="p-4 bg-card/40 backdrop-blur flex items-center justify-between gap-4 flex-wrap">
                    <div className="text-sm text-muted-foreground">
                        Facebook groups, marketplaces and sites we don&apos;t scrape — curated links you open yourself.
                        {linkCount != null && <span className="text-foreground"> {linkCount} saved.</span>}
                    </div>
                    <Link href="/links"><Button variant="outline" size="sm">Open Links <ExternalLink className="h-3.5 w-3.5" /></Button></Link>
                </Card>
            </section>
        </div>
    );
}

const STATUS_STYLE: Record<string, string> = {
    'live': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'needs-proxy': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'html-possible': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'needs-login': 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
    'manual-only': 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

function SourceCard({ s, live = false, health, testing, onTest }: {
    s: CatalogSource;
    live?: boolean;
    health?: Health;
    testing?: boolean;
    onTest?: () => void;
}) {
    return (
        <Card className={`p-4 bg-card/40 backdrop-blur space-y-3 ${live ? '' : 'border-dashed opacity-90'}`}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <a href={s.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline truncate flex items-center gap-1">
                        {s.name}<ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                    </a>
                </div>
                <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_STYLE[s.status] ?? ''}`}>
                    {STATUS_LABEL[s.status]}
                </Badge>
            </div>

            {s.note && <p className="text-xs text-muted-foreground leading-relaxed">{s.note}</p>}

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                <Meta label="Fetch" value={s.fetch} />
                <Meta label="Cost" value={s.cost} />
            </div>

            <div className="flex flex-wrap gap-1">
                {s.data.map(d => (
                    <span key={d} className="text-[10px] font-mono text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">{d}</span>
                ))}
            </div>

            {live && (
                <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onTest} disabled={testing}>
                        {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5" />}
                        Test live
                    </Button>
                    {health && (
                        <span className={`text-xs inline-flex items-center gap-1 ${health.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                            {health.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                            {health.ok ? `${health.count} in Tel Aviv` : (health.error ?? 'error').slice(0, 40)}
                        </span>
                    )}
                </div>
            )}
        </Card>
    );
}

function Meta({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <span className="text-muted-foreground/70 uppercase tracking-wider">{label}: </span>
            <span className="text-foreground/90">{value}</span>
        </div>
    );
}
