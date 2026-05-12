'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AlertTriangle, ChevronRight, Clock, Loader2, Pencil, Play, Trash2, Database } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { findCity, cityNameEn } from '@/lib/yad2/cities';

interface Search {
    id: string;
    name: string;
    enabled: boolean;
    intervalMinutes: number;
    sources: string[];
    filters: Record<string, unknown>;
    lastRunAt: string | null;
    lastRunStatus: 'ok' | 'error' | null;
    lastRunError: string | null;
}

const fmtRelative = (iso: string | null) => {
    if (!iso) return 'never run';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.round(diff / 60_000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.round(hr / 24)}d ago`;
};

const fmtPriceShort = (n: number, dealType: string) => {
    if (dealType === 'sale') return `₪${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 50_000) return `₪${Math.round(n / 1000)}K`;
    return `₪${n.toLocaleString()}`;
};

const filterChips = (f: Record<string, unknown>): { key: string; label: string }[] => {
    const out: { key: string; label: string }[] = [];
    const dealType = (f.dealType as string) ?? 'rent';
    out.push({ key: 'deal', label: dealType === 'sale' ? 'Buy' : 'Rent' });
    if (f.cityId) {
        const c = findCity(f.cityId as number);
        out.push({ key: 'city', label: c ? (cityNameEn(c) ?? c.name) : `city ${f.cityId}` });
    }
    if (f.minRooms || f.maxRooms) out.push({ key: 'rooms', label: `${f.minRooms ?? '?'}–${f.maxRooms ?? '?'} rooms` });
    if (f.minPrice || f.maxPrice) {
        const lo = f.minPrice ? fmtPriceShort(f.minPrice as number, dealType) : '';
        const hi = f.maxPrice ? fmtPriceShort(f.maxPrice as number, dealType) : '';
        const suf = dealType === 'rent' ? '/mo' : '';
        out.push({ key: 'price', label: (lo && hi ? `${lo}–${hi}` : lo || hi) + suf });
    }
    if (f.minSqm || f.maxSqm) out.push({ key: 'sqm', label: `${f.minSqm ?? '?'}–${f.maxSqm ?? '?'} sqm` });
    if (f.minFloor != null || f.maxFloor != null) out.push({ key: 'floor', label: `floor ${f.minFloor ?? '?'}–${f.maxFloor ?? '?'}` });
    if (Array.isArray(f.propertyTypes) && (f.propertyTypes as string[]).length > 0) {
        out.push({ key: 'pt', label: (f.propertyTypes as string[]).join(', ') });
    }
    if (f.excludeAgency) out.push({ key: 'noagy', label: 'no agency' });
    return out;
};

export function SearchRow({ search, onChange, trackedCount }: { search: Search; onChange: () => void; trackedCount?: number }) {
    const [scanning, setScanning] = useState(false);
    const [busyToggle, setBusyToggle] = useState(false);

    const toggle = async () => {
        setBusyToggle(true);
        try {
            await fetch(`/api/searches/${search.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !search.enabled }),
            });
            onChange();
        } finally {
            setBusyToggle(false);
        }
    };

    const scanNow = async () => {
        setScanning(true);
        try {
            const r = await fetch(`/api/searches/${search.id}`, { method: 'POST' });
            const j = await r.json();
            if (j.outcome?.status === 'ok') {
                toast.success(`${search.name}: ${j.outcome.newCount} new`, {
                    description: `${j.outcome.fetched} listings fetched • ${j.outcome.notifyStatus === 'sent' ? 'Telegram sent' : j.outcome.notifyStatus === 'failed' ? 'Telegram failed' : 'No telegram configured'}`,
                });
            } else {
                toast.error(`${search.name}`, { description: j.outcome?.error ?? 'failed' });
            }
        } finally {
            setScanning(false);
            onChange();
        }
    };

    const remove = async () => {
        await fetch(`/api/searches/${search.id}`, { method: 'DELETE' });
        toast.success(`Deleted ${search.name}`);
        onChange();
    };

    const chips = filterChips(search.filters);

    return (
        <Card className="p-4 hover:border-primary/40 transition-colors bg-card/50 backdrop-blur">
            <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/searches/${search.id}`} className="font-semibold text-base hover:underline truncate">
                            {search.name}
                        </Link>
                        {search.lastRunStatus === 'error' && (
                            <Badge variant="destructive" className="gap-1" title={search.lastRunError ?? ''}><AlertTriangle className="h-3 w-3" />error</Badge>
                        )}
                        {!search.enabled && <Badge variant="secondary">paused</Badge>}
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {chips.map((c) => (
                            <Badge key={c.key} variant="outline" className="font-mono text-[11px] font-normal">
                                {c.label}
                            </Badge>
                        ))}
                        {search.sources.map(s => (
                            <Badge key={s} className="font-mono text-[11px] font-normal bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                                {s}
                            </Badge>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            every {search.intervalMinutes}m
                        </span>
                        <span>last scan: {fmtRelative(search.lastRunAt)}</span>
                        {trackedCount != null && (
                            <span className="inline-flex items-center gap-1">
                                <Database className="h-3 w-3" />
                                {trackedCount} tracked
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <span title={search.enabled ? 'Pause' : 'Activate'}>
                        <Switch checked={search.enabled} disabled={busyToggle} onCheckedChange={toggle} />
                    </span>

                    <Button size="icon" variant="ghost" disabled={scanning} onClick={scanNow} title="Scan now">
                        {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    </Button>

                    <Link href={`/searches/${search.id}`} title="Edit">
                        <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                    </Link>

                    <AlertDialog>
                        <AlertDialogTrigger render={<Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></Button>} />
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete search?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    &ldquo;{search.name}&rdquo; and its tracked-listing history will be removed. Notifications log is preserved.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={remove} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <Link href={`/searches/${search.id}`}>
                        <Button size="icon" variant="ghost"><ChevronRight className="h-4 w-4" /></Button>
                    </Link>
                </div>
            </div>
        </Card>
    );
}
