'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bed, BookmarkPlus, Building2, Check, Clock, Coins, ExternalLink, Heart, Loader2, Maximize2, MapPin, Sparkles, UserCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface ListingCardData {
    sourceId: string;
    token: string;
    link: string;
    image?: string;
    city?: string;
    neighborhood?: string;
    street?: string;
    houseNumber?: number | string;
    floor?: number;
    rooms?: number;
    sqm?: number;
    price?: number;
    propertyType?: string;
    isAgency?: boolean;
    tags?: string[];
    userState?: 'favorite' | 'dismissed' | null;
    status?: 'active' | 'price_changed' | 'removed';
    eventKind?: 'new' | 'price_drop' | 'price_rise' | 'removed';
    oldPrice?: number;
    newPrice?: number;
    createdAt?: string;
    firstSeenAt?: string;
    inTracker?: boolean;
}

const fmtAge = (iso?: string) => {
    if (!iso) return null;
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.round(ms / 60_000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.round(hr / 24);
    if (d < 30) return `${d}d ago`;
    const mo = Math.round(d / 30);
    return `${mo}mo ago`;
};

const fmtPrice = (n?: number) => {
    if (!n) return '—';
    if (n >= 1_000_000) return `₪${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 50_000) return `₪${Math.round(n / 1000)}K`;
    return `₪${n.toLocaleString()}/mo`;
};

// Brand-aligned source colors (border + label tint).
// yad2 brand = orange-red, onmap = teal, fallback = primary.
const SOURCE_STYLES: Record<string, { ring: string; bg: string; text: string; label: string }> = {
    yad2: {
        ring: 'ring-orange-500/30 hover:ring-orange-500/60',
        bg: 'bg-orange-500/15',
        text: 'text-orange-400',
        label: 'Yad2',
    },
    onmap: {
        ring: 'ring-teal-500/30 hover:ring-teal-500/60',
        bg: 'bg-teal-500/15',
        text: 'text-teal-400',
        label: 'Onmap',
    },
    homeless: {
        ring: 'ring-violet-500/30 hover:ring-violet-500/60',
        bg: 'bg-violet-500/15',
        text: 'text-violet-400',
        label: 'Homeless',
    },
};

const getSourceStyle = (id: string) => SOURCE_STYLES[id] ?? {
    ring: 'ring-border hover:ring-primary/40',
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    label: id,
};

export function ListingCard({ data, compact = false }: { data: ListingCardData; compact?: boolean }) {
    const addr = [data.street, data.houseNumber].filter(Boolean).join(' ');
    const fullAddr = [data.neighborhood, addr].filter(Boolean).join(' • ');
    const src = getSourceStyle(data.sourceId);
    const detailHref = `/listings/${data.sourceId}/${data.token}`;
    const isRemoved = data.status === 'removed' || data.eventKind === 'removed';
    const isPriceDrop = data.eventKind === 'price_drop';
    const [tracking, setTracking] = useState(false);
    const [tracked, setTracked] = useState(data.inTracker ?? false);
    const track = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (tracking || tracked) return;
        setTracking(true);
        const me = typeof window !== 'undefined' ? localStorage.getItem('tracker:me') : null;
        try {
            const r = await fetch('/api/tracker/apartments', {
                method: 'POST',
                body: JSON.stringify({ mode: 'import', sourceId: data.sourceId, token: data.token, createdBy: me }),
            });
            if (r.ok) { setTracked(true); toast.success('Added to tracker'); }
            else { const j = await r.json().catch(() => ({})); toast.error(j.error ?? 'Failed'); }
        } finally { setTracking(false); }
    };

    return (
        <Card className={`overflow-hidden p-0 group transition-all hover:shadow-lg hover:-translate-y-0.5 bg-card/50 backdrop-blur ring-1 ${src.ring} ${data.userState === 'dismissed' ? 'opacity-50' : ''} ${data.userState === 'favorite' ? 'ring-pink-500/50' : ''}`}>
            <Link href={detailHref} className="block">
                <div className={`relative bg-muted ${compact ? 'aspect-[16/10]' : 'aspect-[4/3]'} overflow-hidden`}>
                    {data.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={data.image}
                            alt=""
                            loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                            <Building2 className="h-10 w-10" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/0 to-black/0" />

                    {/* Top-right corner: source pill + (agency or no-fee) */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                        <Badge className={`backdrop-blur border-0 font-mono text-[10px] uppercase tracking-wider ${src.bg} ${src.text}`}>
                            {src.label}
                        </Badge>
                        {data.isAgency === true && (
                            <Badge className="backdrop-blur border-0 font-medium text-[10px] bg-amber-500/20 text-amber-300 gap-1">
                                <Coins className="h-3 w-3" />תיווך
                            </Badge>
                        )}
                        {data.isAgency === false && (
                            <Badge className="backdrop-blur border-0 font-medium text-[10px] bg-emerald-500/20 text-emerald-300 gap-1">
                                <UserCheck className="h-3 w-3" />ללא תיווך
                            </Badge>
                        )}
                    </div>

                    {/* Top-left corner: status events + favorite */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                        {isRemoved && (
                            <Badge className="bg-destructive text-white border-0 font-medium text-[10px]">REMOVED</Badge>
                        )}
                        {isPriceDrop && (
                            <Badge className="bg-emerald-500 text-white border-0 font-medium text-[10px]">
                                ↓ {data.oldPrice && data.newPrice ? `−₪${(data.oldPrice - data.newPrice).toLocaleString()}` : 'price drop'}
                            </Badge>
                        )}
                        {data.userState === 'favorite' && (
                            <Badge className="bg-pink-500 text-white border-0 font-medium text-[10px] gap-1">
                                <Heart className="h-3 w-3 fill-current" />Favorited
                            </Badge>
                        )}
                        {data.userState === 'dismissed' && (
                            <Badge className="bg-zinc-700 text-zinc-300 border-0 font-medium text-[10px] gap-1">
                                <X className="h-3 w-3" />Dismissed
                            </Badge>
                        )}
                    </div>

                    {/* Bottom-left: price */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between gap-2">
                        <div className="text-white">
                            <div className="text-2xl font-semibold tracking-tight font-mono drop-shadow-lg">
                                {fmtPrice(data.price)}
                            </div>
                            {data.propertyType && (
                                <div className="text-xs text-white/80 mt-0.5 line-clamp-1">{data.propertyType}</div>
                            )}
                        </div>
                        <ExternalLink className="h-4 w-4 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>

                <div className="p-3 space-y-2">
                    <div className="flex items-start gap-1.5 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0">
                            <div className="font-medium truncate">{data.city ?? '—'}</div>
                            {fullAddr && <div className="text-xs text-muted-foreground truncate">{fullAddr}</div>}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {data.rooms != null && <Stat icon={<Bed className="h-3 w-3" />} label={`${data.rooms} rooms`} />}
                        {data.sqm != null && <Stat icon={<Maximize2 className="h-3 w-3" />} label={`${data.sqm} sqm`} />}
                        {data.floor != null && <Stat icon={<Building2 className="h-3 w-3" />} label={`Floor ${data.floor}`} />}
                    </div>

                    {(data.createdAt || data.firstSeenAt) && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80 pt-0.5">
                            <Clock className="h-3 w-3" />
                            {data.createdAt ? (
                                <span>posted <span className="text-foreground/80">{fmtAge(data.createdAt)}</span></span>
                            ) : (
                                <span>tracked <span className="text-foreground/80">{fmtAge(data.firstSeenAt)}</span></span>
                            )}
                        </div>
                    )}

                    {data.tags && data.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                            {data.tags.slice(0, 3).map((t, i) => (
                                <span key={i} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-primary/5 rounded px-1.5 py-0.5">
                                    <Sparkles className="h-2.5 w-2.5" />{t}
                                </span>
                            ))}
                            {data.tags.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">+{data.tags.length - 3}</span>
                            )}
                        </div>
                    )}

                    <button
                        onClick={track}
                        disabled={tracking || tracked}
                        className={`w-full inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors mt-1 ${
                            tracked
                                ? 'bg-emerald-500/15 text-emerald-400 cursor-default'
                                : 'bg-primary/15 hover:bg-primary/25 text-primary'
                        }`}
                    >
                        {tracking ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : tracked ? <><Check className="h-3.5 w-3.5" />In tracker</>
                            : <><BookmarkPlus className="h-3.5 w-3.5" />Add to Interested</>}
                    </button>
                </div>
            </Link>
        </Card>
    );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 rounded-md px-2 py-0.5 font-mono">
            {icon}
            {label}
        </span>
    );
}
