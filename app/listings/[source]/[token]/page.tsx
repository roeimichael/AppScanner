'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
    ArrowLeft, Bed, Building2, ChevronLeft, ChevronRight, Coins,
    ExternalLink, Heart, Loader2, MapPin, Maximize2, Sparkles,
    TrendingDown, TrendingUp, UserCheck, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

interface PricePoint { at: string; price: number; }
interface Listing {
    sourceId: string;
    token: string;
    link: string;
    image?: string;
    images?: string[];
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
    description?: string;
    lat?: number;
    lon?: number;
}
interface DetailResponse {
    listing: Listing;
    priceHistory: PricePoint[];
    firstSeenAt: string;
    lastSeenAt: string;
    status?: 'active' | 'price_changed' | 'removed';
    userState?: 'favorite' | 'dismissed' | null;
    searchId: string;
}

const fmtPrice = (n?: number) => {
    if (!n) return '—';
    if (n >= 1_000_000) return `₪${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 50_000) return `₪${Math.round(n / 1000)}K`;
    return `₪${n.toLocaleString()}/mo`;
};

const SOURCE_COLOR: Record<string, string> = {
    yad2: 'border-orange-500/50 bg-orange-500/10 text-orange-400',
    onmap: 'border-teal-500/50 bg-teal-500/10 text-teal-400',
};

export default function ListingDetailPage() {
    const params = useParams();
    const router = useRouter();
    const source = params.source as string;
    const token = params.token as string;

    const [data, setData] = useState<DetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [imgIdx, setImgIdx] = useState(0);
    const [updating, setUpdating] = useState(false);

    const load = async () => {
        const r = await fetch(`/api/listings/${source}/${token}`);
        if (!r.ok) {
            setLoading(false);
            return;
        }
        const j = await r.json();
        setData(j);
        setLoading(false);
    };

    useEffect(() => { load(); }, [source, token]);

    const setUserState = async (state: 'favorite' | 'dismissed' | null) => {
        if (!data) return;
        setUpdating(true);
        try {
            await fetch(`/api/listings/${source}/${token}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userState: state }),
            });
            toast.success(
                state === 'favorite' ? 'Added to favorites' :
                state === 'dismissed' ? 'Dismissed' : 'Cleared'
            );
            await load();
        } finally {
            setUpdating(false);
        }
    };

    const images = useMemo(() => {
        if (!data?.listing) return [] as string[];
        return data.listing.images && data.listing.images.length > 0
            ? data.listing.images
            : data.listing.image ? [data.listing.image] : [];
    }, [data]);

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-96 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-12 space-y-3">
                <h1 className="text-2xl font-semibold">Listing not found</h1>
                <p className="text-muted-foreground">It may have been removed or never tracked.</p>
                <Button onClick={() => router.push('/')}>Back to dashboard</Button>
            </div>
        );
    }

    const l = data.listing;
    const fav = data.userState === 'favorite';
    const dismissed = data.userState === 'dismissed';
    const removed = data.status === 'removed';
    const trendlineMin = Math.min(...data.priceHistory.map(p => p.price));
    const trendlineMax = Math.max(...data.priceHistory.map(p => p.price));
    const firstPrice = data.priceHistory[0]?.price;
    const lastPrice = data.priceHistory[data.priceHistory.length - 1]?.price ?? l.price;
    const priceDelta = (firstPrice != null && lastPrice != null) ? lastPrice - firstPrice : 0;

    return (
        <div className="space-y-6">
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />Back to searches
            </Link>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left: gallery + main */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="overflow-hidden p-0 bg-card/50 backdrop-blur">
                        <div className="relative aspect-[16/10] bg-muted">
                            {images.length > 0 ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={images[imgIdx]}
                                    alt=""
                                    className="absolute inset-0 h-full w-full object-cover"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                    <Building2 className="h-16 w-16" />
                                </div>
                            )}
                            {images.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setImgIdx((imgIdx - 1 + images.length) % images.length)}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/60 backdrop-blur text-white grid place-items-center hover:bg-black/80"
                                    ><ChevronLeft className="h-5 w-5" /></button>
                                    <button
                                        onClick={() => setImgIdx((imgIdx + 1) % images.length)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/60 backdrop-blur text-white grid place-items-center hover:bg-black/80"
                                    ><ChevronRight className="h-5 w-5" /></button>
                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                                        {images.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setImgIdx(i)}
                                                className={`h-1.5 rounded-full transition-all ${i === imgIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
                                            />
                                        ))}
                                    </div>
                                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur text-white text-xs font-mono">
                                        {imgIdx + 1}/{images.length}
                                    </div>
                                </>
                            )}
                            {removed && (
                                <div className="absolute inset-0 bg-destructive/30 backdrop-blur-sm flex items-center justify-center">
                                    <Badge variant="destructive" className="text-base px-4 py-2">REMOVED</Badge>
                                </div>
                            )}
                        </div>
                        <CardContent className="space-y-3 p-5">
                            <div className="flex items-start gap-3 flex-wrap">
                                <div className="flex-1 min-w-0">
                                    <div className="text-3xl font-mono font-semibold">{fmtPrice(l.price)}</div>
                                    {priceDelta !== 0 && (
                                        <div className={`text-sm flex items-center gap-1 mt-1 ${priceDelta < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {priceDelta < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                                            {priceDelta < 0 ? '−' : '+'}₪{Math.abs(priceDelta).toLocaleString()} since first seen
                                        </div>
                                    )}
                                </div>
                                <Badge className={`border ${SOURCE_COLOR[l.sourceId] ?? 'border-border'} font-mono`}>
                                    {l.sourceId}
                                </Badge>
                                {l.isAgency === true && (
                                    <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 gap-1">
                                        <Coins className="h-3 w-3" />תיווך
                                    </Badge>
                                )}
                                {l.isAgency === false && (
                                    <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 gap-1">
                                        <UserCheck className="h-3 w-3" />ללא תיווך
                                    </Badge>
                                )}
                            </div>

                            <Separator />

                            <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                                <div>
                                    <div className="font-medium">{l.city ?? '—'}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {[l.neighborhood, l.street, l.houseNumber].filter(Boolean).join(' • ')}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {l.rooms != null && <Stat icon={<Bed className="h-3.5 w-3.5" />} label={`${l.rooms} rooms`} />}
                                {l.sqm != null && <Stat icon={<Maximize2 className="h-3.5 w-3.5" />} label={`${l.sqm} sqm`} />}
                                {l.floor != null && <Stat icon={<Building2 className="h-3.5 w-3.5" />} label={`Floor ${l.floor}`} />}
                                {l.propertyType && <Stat icon={<Sparkles className="h-3.5 w-3.5" />} label={l.propertyType} />}
                            </div>

                            {l.tags && l.tags.length > 0 && (
                                <>
                                    <Separator />
                                    <div className="flex flex-wrap gap-1.5">
                                        {l.tags.map((t, i) => (
                                            <Badge key={i} variant="secondary" className="font-normal">
                                                <Sparkles className="h-3 w-3 mr-1" />{t}
                                            </Badge>
                                        ))}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {data.priceHistory.length >= 2 && (
                        <Card className="bg-card/50 backdrop-blur">
                            <CardHeader>
                                <CardTitle className="text-base">Price history</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <PriceSparkline points={data.priceHistory} min={trendlineMin} max={trendlineMax} />
                                <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                                    {data.priceHistory.slice(-3).reverse().map((p, i) => (
                                        <div key={i} className="text-muted-foreground">
                                            <div className="font-mono text-foreground">{fmtPrice(p.price)}</div>
                                            <div className="text-xs">{new Date(p.at).toLocaleDateString()}</div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right: actions + meta */}
                <div className="space-y-4">
                    <Card className="bg-card/50 backdrop-blur">
                        <CardContent className="p-4 space-y-2">
                            <a href={l.link} target="_blank" rel="noreferrer" className="block">
                                <Button className="w-full" size="lg">
                                    <ExternalLink className="h-4 w-4" />Open original listing
                                </Button>
                            </a>
                            <div className="flex gap-2">
                                <Button
                                    variant={fav ? 'default' : 'outline'}
                                    className={`flex-1 ${fav ? 'bg-pink-500/90 text-white hover:bg-pink-500' : ''}`}
                                    onClick={() => setUserState(fav ? null : 'favorite')}
                                    disabled={updating}
                                >
                                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={`h-4 w-4 ${fav ? 'fill-current' : ''}`} />}
                                    {fav ? 'Favorited' : 'Favorite'}
                                </Button>
                                <Button
                                    variant={dismissed ? 'destructive' : 'outline'}
                                    className="flex-1"
                                    onClick={() => setUserState(dismissed ? null : 'dismissed')}
                                    disabled={updating}
                                >
                                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                    {dismissed ? 'Dismissed' : 'Dismiss'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 backdrop-blur">
                        <CardContent className="p-4 space-y-2 text-sm">
                            <Row label="First tracked" value={new Date(data.firstSeenAt).toLocaleString()} />
                            <Row label="Last seen" value={new Date(data.lastSeenAt).toLocaleString()} />
                            <Row label="Status" value={
                                <Badge variant={removed ? 'destructive' : 'secondary'} className="font-mono text-[10px]">
                                    {removed ? 'removed' : 'active'}
                                </Badge>
                            } />
                            <Row label="Token" value={<code className="text-xs">{l.token}</code>} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-sm bg-muted/60 rounded-md px-3 py-1.5">
            {icon}{label}
        </span>
    );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{label}</span>
            <span>{value}</span>
        </div>
    );
}

function PriceSparkline({ points, min, max }: { points: PricePoint[]; min: number; max: number }) {
    if (points.length < 2) return null;
    const W = 600, H = 60;
    const span = max - min || 1;
    const dx = W / (points.length - 1);
    const path = points.map((p, i) => {
        const x = i * dx;
        const y = H - ((p.price - min) / span) * H;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16">
            <path d={path} fill="none" stroke="currentColor" strokeWidth={2} className="text-primary" />
            {points.map((p, i) => {
                const x = i * dx;
                const y = H - ((p.price - min) / span) * H;
                return <circle key={i} cx={x} cy={y} r={3} className="fill-primary" />;
            })}
        </svg>
    );
}
