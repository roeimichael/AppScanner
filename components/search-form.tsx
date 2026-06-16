'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Building2, Home, Loader2, MapPin, Save, Sliders, Sparkles, Wrench, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ListingCard } from '@/components/listing-card';
import { CITIES } from '@/lib/yad2/cities';
import { FOCUS_CITIES } from '@/lib/focus-cities';
import { Slider } from '@/components/ui/slider';
import type { FilterSpec, Preferences, PropertyType } from '@/lib/sources/types';

const PROPERTY_TYPES: { id: PropertyType; label: string }[] = [
    { id: 'apartment', label: 'Apartment' },
    { id: 'garden_apt', label: 'Garden apt' },
    { id: 'penthouse', label: 'Penthouse' },
    { id: 'rooftop', label: 'Rooftop' },
    { id: 'duplex', label: 'Duplex' },
    { id: 'studio', label: 'Studio' },
    { id: 'private_house', label: 'Private house' },
    { id: 'cottage', label: 'Cottage' },
];

const SOURCES = [
    { id: 'yad2', label: 'Yad2' },
    { id: 'onmap', label: 'Onmap' },
];

const INTERVALS = [
    { v: 15, label: '15 min' },
    { v: 30, label: '30 min' },
    { v: 60, label: '1 hour' },
    { v: 180, label: '3 hours' },
    { v: 360, label: '6 hours' },
    { v: 720, label: '12 hours' },
];

export interface SearchFormValue {
    id?: string;
    name: string;
    enabled: boolean;
    intervalMinutes: number;
    sources: string[];
    filters: FilterSpec;
    preferences?: Preferences;
    activeHoursStart?: number;
    activeHoursEnd?: number;
}

interface AmenityDef {
    key: keyof FilterSpec;
    label: string;
    icon: string;
}
const AMENITIES: AmenityDef[] = [
    { key: 'parking', label: 'Parking', icon: '🅿️' },
    { key: 'elevator', label: 'Elevator', icon: '🛗' },
    { key: 'balcony', label: 'Balcony', icon: '🌅' },
    { key: 'airCondition', label: 'Air conditioning', icon: '❄️' },
    { key: 'shelter', label: 'Shelter (ממ"ד)', icon: '🛡️' },
    { key: 'warehouse', label: 'Storage', icon: '📦' },
    { key: 'furniture', label: 'Furnished', icon: '🛋️' },
    { key: 'renovated', label: 'Renovated', icon: '✨' },
    { key: 'accessibility', label: 'Accessible', icon: '♿' },
    { key: 'bars', label: 'Window bars', icon: '🪟' },
    { key: 'pets', label: 'Pet-friendly', icon: '🐾' },
];

const QUALITY_FILTERS: AmenityDef[] = [
    { key: 'imageOnly', label: 'Has photos', icon: '📷' },
    { key: 'priceOnly', label: 'Price visible', icon: '💰' },
    { key: 'priceDropped', label: 'Recently dropped', icon: '📉' },
    { key: 'excludeAgency', label: 'Hide agency listings', icon: '🚫' },
];

interface PrefDef {
    weightKey: keyof Preferences;
    idealKey?: keyof Preferences;
    label: string;
    placeholder?: string;
    step?: number;
}
const NUMERIC_PREFS: PrefDef[] = [
    { weightKey: 'weightPrice', idealKey: 'idealPrice', label: 'Price', placeholder: '7000', step: 250 },
    { weightKey: 'weightSqm', idealKey: 'idealSqm', label: 'Square meters', placeholder: '90', step: 5 },
    { weightKey: 'weightRooms', idealKey: 'idealRooms', label: 'Rooms', placeholder: '4', step: 0.5 },
    { weightKey: 'weightFloor', idealKey: 'idealFloor', label: 'Floor', placeholder: '3', step: 1 },
];

const FEATURE_PREFS: { weightKey: keyof Preferences; label: string; icon: string }[] = [
    { weightKey: 'weightAgencyFee', label: 'Avoid agency fee', icon: '💸' },
    { weightKey: 'weightParking', label: 'Parking', icon: '🅿️' },
    { weightKey: 'weightElevator', label: 'Elevator', icon: '🛗' },
    { weightKey: 'weightBalcony', label: 'Balcony', icon: '🌅' },
    { weightKey: 'weightAirCondition', label: 'Air conditioning', icon: '❄️' },
    { weightKey: 'weightFurniture', label: 'Furnished', icon: '🛋️' },
    { weightKey: 'weightShelter', label: 'Shelter', icon: '🛡️' },
    { weightKey: 'weightWarehouse', label: 'Storage', icon: '📦' },
    { weightKey: 'weightRenovated', label: 'Renovated', icon: '✨' },
    { weightKey: 'weightPets', label: 'Pet-friendly', icon: '🐾' },
    { weightKey: 'weightImage', label: 'Has photos', icon: '📷' },
    { weightKey: 'weightFreshness', label: 'Recency', icon: '⏱️' },
    { weightKey: 'weightLrt', label: 'Near light rail', icon: '🚈' },
];

const blank: SearchFormValue = {
    name: '',
    enabled: true,
    intervalMinutes: 60,
    sources: ['yad2', 'onmap'],
    filters: { dealType: 'rent', propertyTypes: ['apartment'] },
};

type BudgetTier = 'tight' | 'balanced' | 'spacious';

// Budget-aware ranking presets: derive feature importances from the price band.
// Tight budgets prioritize price + no-fee; bigger budgets prioritize size + amenities.
function suggestByPrice(filters: FilterSpec): { prefs: Preferences; tier: BudgetTier } | null {
    const rep = filters.minPrice != null && filters.maxPrice != null
        ? (filters.minPrice + filters.maxPrice) / 2
        : filters.maxPrice ?? filters.minPrice ?? null;
    if (rep == null) return null;

    const sale = filters.dealType === 'sale';
    const lowCut = sale ? 1_800_000 : 5_500;
    const highCut = sale ? 3_000_000 : 8_000;
    const idealRooms = filters.minRooms != null && filters.maxRooms != null
        ? (filters.minRooms + filters.maxRooms) / 2
        : filters.minRooms ?? filters.maxRooms ?? 3;
    const idealPrice = Math.round(rep);

    if (rep <= lowCut) {
        return { tier: 'tight', prefs: {
            idealPrice, idealRooms, idealSqm: 65,
            weightPrice: 9, weightAgencyFee: 9, weightFreshness: 6, weightLrt: 6,
            weightRooms: 6, weightSqm: 4, weightImage: 4,
            weightParking: 3, weightElevator: 3, weightBalcony: 3, weightAirCondition: 3,
            weightShelter: 2, weightWarehouse: 1, weightRenovated: 2, weightFurniture: 2, weightPets: 0,
        } };
    }
    if (rep >= highCut) {
        return { tier: 'spacious', prefs: {
            idealPrice, idealRooms, idealSqm: 110,
            weightPrice: 4, weightAgencyFee: 4, weightFreshness: 5, weightLrt: 5,
            weightRooms: 7, weightSqm: 8, weightImage: 4,
            weightParking: 7, weightElevator: 6, weightBalcony: 7, weightAirCondition: 6,
            weightShelter: 5, weightWarehouse: 4, weightRenovated: 6, weightFurniture: 5, weightPets: 2,
        } };
    }
    return { tier: 'balanced', prefs: {
        idealPrice, idealRooms, idealSqm: 85,
        weightPrice: 7, weightAgencyFee: 6, weightFreshness: 5, weightLrt: 6,
        weightRooms: 7, weightSqm: 6, weightImage: 4,
        weightParking: 5, weightElevator: 4, weightBalcony: 5, weightAirCondition: 4,
        weightShelter: 3, weightWarehouse: 2, weightRenovated: 4, weightFurniture: 3, weightPets: 1,
    } };
}

interface PreviewListing {
    sourceId: string;
    token: string;
    link: string;
    image?: string;
    city?: string;
    neighborhood?: string;
    street?: string;
    houseNumber?: number;
    floor?: number;
    rooms?: number;
    sqm?: number;
    price?: number;
    propertyType?: string;
    isAgency?: boolean;
}

export function SearchForm({ initial }: { initial?: SearchFormValue }) {
    const router = useRouter();
    const [value, setValue] = useState<SearchFormValue>(() => {
        const v = initial ?? blank;
        // Backfill dealType so legacy records (saved before this field existed) default to rent.
        if (!v.filters.dealType) v.filters.dealType = 'rent';
        return v;
    });
    const [saving, setSaving] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [preview, setPreview] = useState<{ count: number; sample: PreviewListing[]; error?: string } | null>(null);
    const [neighborhoodInput, setNeighborhoodInput] = useState('');
    const [hoodCatalog, setHoodCatalog] = useState<{ id: string; name: string }[]>([]);
    const [hoodLoading, setHoodLoading] = useState(false);
    const [hoodCityId, setHoodCityId] = useState<number | undefined>(undefined);
    const [includeKwInput, setIncludeKwInput] = useState('');
    const [excludeKwInput, setExcludeKwInput] = useState('');
    const [tab, setTab] = useState('basics');

    useEffect(() => {
        if (value.filters.cityId) {
            const c = CITIES.find(c => c.id === value.filters.cityId);
            if (c && value.filters.regionId !== c.regionId) {
                setValue(v => ({ ...v, filters: { ...v.filters, regionId: c.regionId } }));
            }
        }
    }, [value.filters.cityId, value.filters.regionId]);

    useEffect(() => {
        const cid = value.filters.cityId;
        if (!cid || cid === hoodCityId) return;
        setHoodLoading(true);
        setHoodCityId(cid);
        fetch(`/api/neighborhoods?cityId=${cid}`)
            .then(r => r.json())
            .then(d => setHoodCatalog(Array.isArray(d.hoods) ? d.hoods : []))
            .catch(() => setHoodCatalog([]))
            .finally(() => setHoodLoading(false));
    }, [value.filters.cityId, hoodCityId]);

    const refreshHoods = () => {
        const cid = value.filters.cityId;
        if (!cid) return;
        setHoodLoading(true);
        fetch(`/api/neighborhoods?cityId=${cid}&refresh=1`)
            .then(r => r.json())
            .then(d => setHoodCatalog(Array.isArray(d.hoods) ? d.hoods : []))
            .catch(() => undefined)
            .finally(() => setHoodLoading(false));
    };

    const toggleHood = (name: string) => {
        const cur = value.filters.neighborhoods ?? [];
        const next = cur.includes(name) ? cur.filter(x => x !== name) : [...cur, name];
        setFilter('neighborhoods', next.length ? next : undefined);
    };

    const setFilter = <K extends keyof FilterSpec>(k: K, v: FilterSpec[K]) =>
        setValue(prev => ({ ...prev, filters: { ...prev.filters, [k]: v } }));

    const setPref = <K extends keyof Preferences>(k: K, v: Preferences[K]) =>
        setValue(prev => ({ ...prev, preferences: { ...(prev.preferences ?? {}), [k]: v } }));

    const applyPriceSuggestion = () => {
        const res = suggestByPrice(value.filters);
        if (!res) { toast.error('Set a price range first (in Basics).'); return; }
        setValue(v => ({ ...v, preferences: { ...res.prefs } }));
        const label = res.tier === 'tight' ? 'tight budget — price & no-fee prioritized'
            : res.tier === 'spacious' ? 'bigger budget — size & amenities prioritized'
            : 'mid budget — balanced';
        toast.success(`Ranking tuned for a ${label}.`);
    };

    const togglePT = (pt: PropertyType, on: boolean) => {
        const cur = value.filters.propertyTypes ?? [];
        const next = on ? [...new Set([...cur, pt])] : cur.filter(x => x !== pt);
        setFilter('propertyTypes', next.length ? next : undefined);
    };

    const toggleSource = (id: string, on: boolean) => {
        const cur = value.sources;
        const next = on ? [...new Set([...cur, id])] : cur.filter(x => x !== id);
        setValue(v => ({ ...v, sources: next }));
    };

    const addNeighborhood = () => {
        const t = neighborhoodInput.trim();
        if (!t) return;
        const cur = value.filters.neighborhoods ?? [];
        if (!cur.includes(t)) setFilter('neighborhoods', [...cur, t]);
        setNeighborhoodInput('');
    };

    const removeNeighborhood = (n: string) => {
        const cur = value.filters.neighborhoods ?? [];
        setFilter('neighborhoods', cur.filter(x => x !== n));
    };

    const addKeyword = (kind: 'includeKeywords' | 'excludeKeywords', input: string, setInput: (s: string) => void) => {
        const t = input.trim();
        if (!t) return;
        const cur = value.filters[kind] ?? [];
        if (!cur.includes(t)) setFilter(kind, [...cur, t]);
        setInput('');
    };
    const removeKeyword = (kind: 'includeKeywords' | 'excludeKeywords', kw: string) => {
        const cur = value.filters[kind] ?? [];
        setFilter(kind, cur.filter(x => x !== kw));
    };

    const runPreview = async () => {
        setPreviewing(true);
        setPreview(null);
        try {
            const r = await fetch('/api/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sources: value.sources, filters: value.filters }),
            });
            const j = await r.json();
            const first = j.results?.[0];
            if (first?.error) {
                setPreview({ count: 0, sample: [], error: first.error });
            } else {
                setPreview({ count: first?.count ?? 0, sample: (first?.listings ?? []).slice(0, 12) });
            }
        } catch (e) {
            setPreview({ count: 0, sample: [], error: e instanceof Error ? e.message : 'failed' });
        } finally {
            setPreviewing(false);
        }
    };

    const save = async () => {
        if (!value.name.trim()) { toast.error('Give the search a name'); setTab('basics'); return; }
        if (!value.sources.length) { toast.error('Pick at least one source'); setTab('basics'); return; }
        if (!value.filters.cityId && !value.filters.regionId) { toast.error('Pick a city or region'); setTab('location'); return; }

        setSaving(true);
        try {
            const url = value.id ? `/api/searches/${value.id}` : '/api/searches';
            const method = value.id ? 'PATCH' : 'POST';
            const body = value.id
                ? {
                    name: value.name,
                    enabled: value.enabled,
                    intervalMinutes: value.intervalMinutes,
                    sources: value.sources,
                    filters: value.filters,
                    preferences: value.preferences ?? null,
                    activeHoursStart: value.activeHoursStart ?? null,
                    activeHoursEnd: value.activeHoursEnd ?? null,
                }
                : value;
            const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!r.ok) {
                const j = await r.json().catch(() => ({}));
                toast.error(j.error ?? `Save failed (${r.status})`);
                return;
            }
            toast.success(value.id ? 'Saved' : 'Search created');
            router.push('/');
            router.refresh();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="grid grid-cols-6 w-full max-w-3xl">
                    <TabsTrigger value="basics"><Sparkles className="h-3.5 w-3.5 mr-1" />Basics</TabsTrigger>
                    <TabsTrigger value="location"><MapPin className="h-3.5 w-3.5 mr-1" />Location</TabsTrigger>
                    <TabsTrigger value="property"><Home className="h-3.5 w-3.5 mr-1" />Property</TabsTrigger>
                    <TabsTrigger value="amenities"><Wrench className="h-3.5 w-3.5 mr-1" />Amenities</TabsTrigger>
                    <TabsTrigger value="preferences"><Sliders className="h-3.5 w-3.5 mr-1" />Ranking</TabsTrigger>
                    <TabsTrigger value="preview"><Building2 className="h-3.5 w-3.5 mr-1" />Preview</TabsTrigger>
                </TabsList>

                <TabsContent value="basics" className="mt-6">
                    <Card className="bg-card/50 backdrop-blur">
                        <CardHeader><CardTitle>Basics</CardTitle></CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-1.5">
                                <Label>Looking for</Label>
                                <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
                                    {(['rent', 'sale'] as const).map(t => {
                                        const on = (value.filters.dealType ?? 'rent') === t;
                                        return (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setFilter('dealType', t)}
                                                className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${on ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                            >
                                                {t === 'rent' ? 'Rent' : 'Buy'}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Name</Label>
                                <Input
                                    value={value.name}
                                    onChange={e => setValue(v => ({ ...v, name: e.target.value }))}
                                    placeholder={value.filters.dealType === 'sale' ? 'e.g. Petah Tikva 4–5 rooms under 3M' : 'e.g. Petah Tikva 4 rooms under 7000/mo'}
                                />
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <p className="text-xs text-muted-foreground">
                                    Pick a <strong className="text-foreground">city</strong> and you&apos;re ready to go — a price/room range is optional, and the
                                    other tabs are just fine-tuning. By default a search returns everything in the city.
                                </p>
                                <div className="space-y-1.5">
                                    <Label>City</Label>
                                    <Select
                                        value={value.filters.cityId ? String(value.filters.cityId) : ''}
                                        onValueChange={v => setFilter('cityId', v ? Number(v) : undefined)}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Pick a city" /></SelectTrigger>
                                        <SelectContent>
                                            {FOCUS_CITIES.map(c => (
                                                <SelectItem key={c.cityId} value={String(c.cityId)}>
                                                    {c.name} — {c.hebrew}{c.hasLrt ? ' 🚈' : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[11px] text-muted-foreground">Supported cities (each has map + light-rail data). Need another? Use Custom city ID under Location.</p>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <RangeRow
                                        label={value.filters.dealType === 'sale' ? 'Price (₪)' : 'Monthly rent (₪)'}
                                        min={value.filters.minPrice}
                                        max={value.filters.maxPrice}
                                        step={value.filters.dealType === 'sale' ? 50_000 : 250}
                                        onMin={n => setFilter('minPrice', n)}
                                        onMax={n => setFilter('maxPrice', n)}
                                    />
                                    <RangeRow label="Rooms" min={value.filters.minRooms} max={value.filters.maxRooms} step={0.5} onMin={n => setFilter('minRooms', n)} onMax={n => setFilter('maxRooms', n)} />
                                </div>
                            </div>

                            <Separator />

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Scan interval</Label>
                                    <Select value={String(value.intervalMinutes)} onValueChange={v => setValue(s => ({ ...s, intervalMinutes: Number(v) }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {INTERVALS.map(i => <SelectItem key={i.v} value={String(i.v)}>{i.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Sources</Label>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {SOURCES.map(s => {
                                            const on = value.sources.includes(s.id);
                                            return (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => toggleSource(s.id, !on)}
                                                    className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${on ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-transparent border-border text-muted-foreground hover:bg-accent'}`}
                                                >
                                                    {s.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-base">Active</Label>
                                    <p className="text-xs text-muted-foreground">When off, this search won&apos;t be scanned by cron.</p>
                                </div>
                                <Switch checked={value.enabled} onCheckedChange={v => setValue(s => ({ ...s, enabled: v }))} />
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <Label className="text-base">Quiet hours (Israel time)</Label>
                                <p className="text-xs text-muted-foreground">Only scan within this window — leave blank for 24h scanning.</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Start hour (0–23)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={23}
                                            placeholder="8"
                                            value={value.activeHoursStart ?? ''}
                                            onChange={e => setValue(s => ({ ...s, activeHoursStart: e.target.value ? Number(e.target.value) : undefined }))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">End hour (0–23)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={23}
                                            placeholder="22"
                                            value={value.activeHoursEnd ?? ''}
                                            onChange={e => setValue(s => ({ ...s, activeHoursEnd: e.target.value ? Number(e.target.value) : undefined }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="location" className="mt-6">
                    <Card className="bg-card/50 backdrop-blur">
                        <CardHeader>
                            <CardTitle>Location</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <p className="text-xs text-muted-foreground">City is set in <strong className="text-foreground">Basics</strong>. Use this tab to narrow to specific neighborhoods (optional).</p>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-muted-foreground">Custom city ID</Label>
                                    <Input
                                        type="number"
                                        placeholder="from Yad2 URL"
                                        value={value.filters.cityId ?? ''}
                                        onChange={e => setFilter('cityId', e.target.value ? Number(e.target.value) : undefined)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-muted-foreground">Region ID (auto)</Label>
                                    <Input
                                        type="number"
                                        placeholder="auto-filled"
                                        value={value.filters.regionId ?? ''}
                                        onChange={e => setFilter('regionId', e.target.value ? Number(e.target.value) : undefined)}
                                    />
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <Label>Neighborhoods <span className="text-muted-foreground font-normal text-xs">(substring match — leave empty for whole city)</span></Label>
                                    {value.filters.cityId && (
                                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={refreshHoods} disabled={hoodLoading}>
                                            {hoodLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Refresh list'}
                                        </Button>
                                    )}
                                </div>

                                {!value.filters.cityId ? (
                                    <p className="text-xs text-muted-foreground">Pick a city first to load its neighborhoods.</p>
                                ) : hoodLoading && hoodCatalog.length === 0 ? (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Loader2 className="h-3 w-3 animate-spin" /> Loading neighborhoods…
                                    </div>
                                ) : hoodCatalog.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">No neighborhoods found for this city — use the free-text input below.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                        {hoodCatalog.map(h => {
                                            const on = (value.filters.neighborhoods ?? []).includes(h.name);
                                            return (
                                                <button
                                                    type="button"
                                                    key={h.id}
                                                    onClick={() => toggleHood(h.name)}
                                                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${on ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-background border-border text-muted-foreground hover:bg-accent'}`}
                                                >
                                                    {h.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                <Separator className="my-2" />

                                <Label className="text-xs text-muted-foreground">Add custom (free text)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={neighborhoodInput}
                                        onChange={e => setNeighborhoodInput(e.target.value)}
                                        placeholder="e.g. כפר גנים"
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNeighborhood(); } }}
                                    />
                                    <Button type="button" variant="outline" onClick={addNeighborhood}>Add</Button>
                                </div>

                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {(value.filters.neighborhoods ?? []).map(n => (
                                        <Badge key={n} variant="secondary" className="gap-1 cursor-pointer hover:bg-destructive/20" onClick={() => removeNeighborhood(n)}>
                                            {n}
                                            <X className="h-3 w-3" />
                                        </Badge>
                                    ))}
                                    {(value.filters.neighborhoods ?? []).length === 0 && (
                                        <span className="text-xs text-muted-foreground">No neighborhood filter — all neighborhoods in the city are included.</span>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="property" className="mt-6">
                    <Card className="bg-card/50 backdrop-blur">
                        <CardHeader><CardTitle>Property</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <p className="text-xs text-muted-foreground">Rooms &amp; price live in <strong className="text-foreground">Basics</strong>. These are extra, optional constraints.</p>
                            <RangeRow label="Square meters" min={value.filters.minSqm} max={value.filters.maxSqm} step={1} onMin={n => setFilter('minSqm', n)} onMax={n => setFilter('maxSqm', n)} />
                            <RangeRow label="Floor" min={value.filters.minFloor} max={value.filters.maxFloor} step={1} onMin={n => setFilter('minFloor', n)} onMax={n => setFilter('maxFloor', n)} />

                            <Separator />

                            <div className="space-y-2">
                                <Label>Property types</Label>
                                <div className="flex flex-wrap gap-2">
                                    {PROPERTY_TYPES.map(t => {
                                        const on = value.filters.propertyTypes?.includes(t.id) ?? false;
                                        return (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => togglePT(t.id, !on)}
                                                className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${on ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-transparent border-border text-muted-foreground hover:bg-accent'}`}
                                            >
                                                {t.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-base">Hide agency listings</Label>
                                    <p className="text-xs text-muted-foreground">Show only private sellers (no מתווך).</p>
                                </div>
                                <Switch checked={!!value.filters.excludeAgency} onCheckedChange={c => setFilter('excludeAgency', c)} />
                            </div>

                            <Separator />

                            <div className="space-y-3">
                                <div>
                                    <Label>Must include any of</Label>
                                    <p className="text-xs text-muted-foreground mb-2">Listing must mention at least one of these in title/description/tags.</p>
                                    <div className="flex gap-2">
                                        <Input
                                            value={includeKwInput}
                                            onChange={e => setIncludeKwInput(e.target.value)}
                                            placeholder="e.g. מעלית, חניה, מרפסת"
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword('includeKeywords', includeKwInput, setIncludeKwInput); } }}
                                        />
                                        <Button type="button" variant="outline" onClick={() => addKeyword('includeKeywords', includeKwInput, setIncludeKwInput)}>Add</Button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {(value.filters.includeKeywords ?? []).map(k => (
                                            <Badge key={k} className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 gap-1 cursor-pointer hover:bg-destructive/20 hover:text-destructive" onClick={() => removeKeyword('includeKeywords', k)}>
                                                +{k} <X className="h-3 w-3" />
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <Label>Must NOT include</Label>
                                    <p className="text-xs text-muted-foreground mb-2">Skip listings that mention any of these (e.g. roommates, sublet, אורחים).</p>
                                    <div className="flex gap-2">
                                        <Input
                                            value={excludeKwInput}
                                            onChange={e => setExcludeKwInput(e.target.value)}
                                            placeholder="e.g. שותפים, sublet"
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword('excludeKeywords', excludeKwInput, setExcludeKwInput); } }}
                                        />
                                        <Button type="button" variant="outline" onClick={() => addKeyword('excludeKeywords', excludeKwInput, setExcludeKwInput)}>Add</Button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {(value.filters.excludeKeywords ?? []).map(k => (
                                            <Badge key={k} className="bg-destructive/15 text-destructive border-destructive/30 gap-1 cursor-pointer hover:bg-destructive/30" onClick={() => removeKeyword('excludeKeywords', k)}>
                                                −{k} <X className="h-3 w-3" />
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="amenities" className="mt-6">
                    <Card className="bg-card/50 backdrop-blur">
                        <CardHeader>
                            <CardTitle>Amenities</CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                                Each toggle below makes the amenity required (listings without it are excluded).
                                Native Yad2 filters; for other sources we filter post-fetch when info is available.
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label className="mb-3 block">Must-have features</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {AMENITIES.map(a => {
                                        const on = !!value.filters[a.key];
                                        return (
                                            <button
                                                key={a.key as string}
                                                type="button"
                                                onClick={() => setFilter(a.key, (!on) as never)}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${on ? 'bg-primary/15 border-primary/50 text-primary' : 'bg-background border-border text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                                            >
                                                <span className="text-base">{a.icon}</span>
                                                <span>{a.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <Label className="mb-3 block">Quality filters</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {QUALITY_FILTERS.map(a => {
                                        const on = !!value.filters[a.key];
                                        return (
                                            <button
                                                key={a.key as string}
                                                type="button"
                                                onClick={() => setFilter(a.key, (!on) as never)}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${on ? 'bg-primary/15 border-primary/50 text-primary' : 'bg-background border-border text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                                            >
                                                <span className="text-base">{a.icon}</span>
                                                <span>{a.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="preferences" className="mt-6">
                    <Card className="bg-card/50 backdrop-blur">
                        <CardHeader>
                            <CardTitle>Ranking preferences</CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                                Tune what makes the &ldquo;perfect&rdquo; apartment for you. These don&apos;t exclude listings — they
                                <strong className="text-foreground"> rank </strong>them. The Optimal page sorts every tracked listing by fit score.
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3 flex-wrap">
                                <div className="min-w-0">
                                    <div className="text-sm font-medium flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> Suggest by price range</div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Auto-set all the importances from your budget — tight budgets prioritize price &amp; no-fee,
                                        bigger budgets prioritize size &amp; amenities. You can still tweak below.
                                    </p>
                                </div>
                                <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={applyPriceSuggestion}>
                                    <Sparkles className="h-3.5 w-3.5" /> Suggest
                                </Button>
                            </div>

                            <div>
                                <Label className="mb-3 block">Ideal values + importance</Label>
                                <div className="space-y-4">
                                    {NUMERIC_PREFS.map(p => (
                                        <PrefRow
                                            key={p.weightKey}
                                            label={p.label}
                                            ideal={value.preferences?.[p.idealKey!] as number | undefined}
                                            weight={(value.preferences?.[p.weightKey] as number | undefined) ?? 0}
                                            placeholder={p.placeholder}
                                            step={p.step}
                                            onIdeal={(n) => setPref(p.idealKey!, n)}
                                            onWeight={(n) => setPref(p.weightKey, n)}
                                        />
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <Label className="mb-3 block">Feature importance</Label>
                                <p className="text-xs text-muted-foreground mb-3">Slide right to give the feature more pull on the ranking. 0 = ignore.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {FEATURE_PREFS.map(f => (
                                        <FeatureWeightRow
                                            key={f.weightKey}
                                            label={f.label}
                                            icon={f.icon}
                                            weight={(value.preferences?.[f.weightKey] as number | undefined) ?? 0}
                                            onChange={(n) => setPref(f.weightKey, n)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="preview" className="mt-6 space-y-4">
                    <Card className="bg-card/50 backdrop-blur">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Live preview</span>
                                <Button onClick={runPreview} disabled={previewing} variant="outline">
                                    {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                    {previewing ? 'Fetching…' : preview ? 'Refresh' : 'Run preview'}
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!preview && !previewing && (
                                <p className="text-sm text-muted-foreground">Run a preview to see what your filter currently matches.</p>
                            )}
                            {preview?.error && (
                                <p className="text-sm text-destructive">⚠ {preview.error}</p>
                            )}
                            {preview && !preview.error && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Badge variant="secondary" className="font-mono">{preview.count}</Badge>
                                        <span className="text-muted-foreground">listings match — showing {preview.sample.length}</span>
                                    </div>
                                    {preview.sample.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No listings match. Try widening the filter.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {preview.sample.map(l => <ListingCard key={`${l.sourceId}:${l.token}`} data={l} compact />)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="flex items-center gap-2 sticky bottom-4 bg-background/80 backdrop-blur p-2 rounded-lg border">
                <Button onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? 'Saving…' : value.id ? 'Save changes' : 'Create search'}
                </Button>
                <Button variant="ghost" onClick={() => router.push('/')}>Cancel</Button>
            </div>
        </div>
    );
}

function PrefRow({ label, ideal, weight, placeholder, step, onIdeal, onWeight }: {
    label: string;
    ideal?: number;
    weight: number;
    placeholder?: string;
    step?: number;
    onIdeal: (n: number | undefined) => void;
    onWeight: (n: number) => void;
}) {
    return (
        <div className="grid grid-cols-12 gap-3 items-center">
            <Label className="col-span-3 sm:col-span-2 text-sm">{label}</Label>
            <div className="col-span-3">
                <Input
                    type="number"
                    step={step ?? 1}
                    placeholder={placeholder}
                    value={ideal ?? ''}
                    onChange={e => onIdeal(e.target.value ? Number(e.target.value) : undefined)}
                />
            </div>
            <div className="col-span-5 sm:col-span-6 flex items-center gap-2">
                <Slider
                    value={[weight]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={(v) => onWeight(Array.isArray(v) ? (v[0] ?? 0) : (v as number))}
                    className="flex-1"
                />
            </div>
            <span className="col-span-1 text-xs font-mono text-muted-foreground tabular-nums text-right">{weight}/10</span>
        </div>
    );
}

function FeatureWeightRow({ label, icon, weight, onChange }: {
    label: string;
    icon: string;
    weight: number;
    onChange: (n: number) => void;
}) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-base shrink-0">{icon}</span>
            <span className="text-sm w-32 shrink-0">{label}</span>
            <Slider
                value={[weight]}
                min={0}
                max={10}
                step={1}
                onValueChange={(v) => onChange(Array.isArray(v) ? (v[0] ?? 0) : (v as number))}
                className="flex-1"
            />
            <span className="text-xs font-mono text-muted-foreground tabular-nums w-10 text-right">{weight}/10</span>
        </div>
    );
}

function RangeRow({ label, min, max, step, onMin, onMax }: {
    label: string;
    min?: number;
    max?: number;
    step?: number;
    onMin: (n: number | undefined) => void;
    onMax: (n: number | undefined) => void;
}) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Input type="number" step={step ?? 1} placeholder="Min" value={min ?? ''} onChange={e => onMin(e.target.value ? Number(e.target.value) : undefined)} />
                </div>
                <div>
                    <Input type="number" step={step ?? 1} placeholder="Max" value={max ?? ''} onChange={e => onMax(e.target.value ? Number(e.target.value) : undefined)} />
                </div>
            </div>
        </div>
    );
}
