'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink, Globe, Plus, ShoppingBag, Trash2, Users2, ShieldCheck, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LINK_SUGGESTIONS } from '@/lib/link-suggestions';

type Kind = 'fb_group' | 'marketplace' | 'site' | 'other';
type LinkStatus = 'ok' | 'unreachable';

interface Link { id: string; name: string; url: string; kind: Kind; note: string | null; createdAt: string }

const KIND_LABEL: Record<Kind, string> = {
    fb_group: 'Facebook groups',
    marketplace: 'Marketplaces',
    site: 'Other sites',
    other: 'Other',
};
const KIND_ICON: Record<Kind, React.ComponentType<{ className?: string }>> = {
    fb_group: Users2,
    marketplace: ShoppingBag,
    site: Globe,
    other: Globe,
};
const KIND_ORDER: Kind[] = ['fb_group', 'marketplace', 'site', 'other'];

const hostOf = (u: string) => { try { return new URL(u).host.replace(/^www\./, ''); } catch { return u; } };

export default function LinksPage() {
    const [links, setLinks] = useState<Link[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<Record<string, LinkStatus>>({});
    const [checking, setChecking] = useState(false);

    const load = async () => {
        const r = await fetch('/api/links').then(x => x.json());
        setLinks(r.links ?? []);
        setLoading(false);
    };
    useEffect(() => { load(); }, []);

    const grouped = useMemo(() => {
        const g: Record<Kind, Link[]> = { fb_group: [], marketplace: [], site: [], other: [] };
        for (const l of links) g[l.kind].push(l);
        return g;
    }, [links]);

    const existingUrls = useMemo(() => new Set(links.map(l => l.url)), [links]);
    const suggestions = useMemo(() => LINK_SUGGESTIONS.filter(s => !existingUrls.has(s.url)), [existingUrls]);

    const checkAll = async () => {
        setChecking(true);
        try {
            const r = await fetch('/api/links/check', { method: 'POST' }).then(x => x.json());
            if (r.error) { toast.error(r.error); return; }
            const map: Record<string, LinkStatus> = {};
            for (const res of r.results as { id: string; status: LinkStatus }[]) map[res.id] = res.status;
            setStatus(map);
            const dead = Object.values(map).filter(s => s === 'unreachable').length;
            toast.success(dead ? `${dead} link${dead > 1 ? 's' : ''} unreachable` : 'All links reachable');
        } finally { setChecking(false); }
    };

    const add = async (s: { name: string; url: string; kind: Kind; note?: string | null }) => {
        const r = await fetch('/api/links', {
            method: 'POST',
            body: JSON.stringify({ name: s.name, url: s.url, kind: s.kind, note: s.note ?? null }),
        });
        if (r.ok) { toast.success('Added'); load(); }
        else { const j = await r.json().catch(() => ({})); toast.error(j.error ?? 'Failed'); }
    };

    const remove = async (id: string) => {
        if (!confirm('Remove this link?')) return;
        const r = await fetch(`/api/links/${id}`, { method: 'DELETE' });
        if (r.ok) { toast.success('Removed'); load(); }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Relevant links</h1>
                    <p className="text-sm text-muted-foreground mt-1">Hunting spots beyond yad2 + onmap. Add anywhere new listings tend to land.</p>
                </div>
                <div className="flex items-center gap-2">
                    {links.length > 0 && (
                        <Button variant="outline" onClick={checkAll} disabled={checking}>
                            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            Check links
                        </Button>
                    )}
                    <AddLinkDialog onAdded={load} />
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
            ) : (
                <div className="space-y-6">
                    {links.length === 0 ? (
                        <Card className="py-12 text-center bg-card/50 backdrop-blur border-dashed">
                            <p className="text-sm text-muted-foreground">No links yet. Add your own, or grab one of the suggestions below.</p>
                        </Card>
                    ) : (
                        KIND_ORDER.map(kind => {
                            const items = grouped[kind];
                            if (items.length === 0) return null;
                            const Icon = KIND_ICON[kind];
                            return (
                                <div key={kind}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{KIND_LABEL[kind]}</h2>
                                        <span className="text-xs text-muted-foreground/70 font-mono">{items.length}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {items.map(l => {
                                            const st = status[l.id];
                                            return (
                                                <Card key={l.id} className="p-3 bg-card/40 backdrop-blur hover:bg-card/70 transition-colors group">
                                                    <div className="flex items-start gap-2">
                                                        {st && (
                                                            <span
                                                                title={st === 'ok' ? 'Reachable' : 'Unreachable — host did not respond'}
                                                                className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${st === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}
                                                            />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <a href={l.url} target="_blank" rel="noreferrer" className="font-medium text-sm hover:underline truncate flex items-center gap-1.5">
                                                                {l.name}
                                                                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                                                            </a>
                                                            <div className="text-[11px] text-muted-foreground font-mono truncate">{hostOf(l.url)}</div>
                                                            {l.note && <div className="text-xs text-muted-foreground mt-1">{l.note}</div>}
                                                        </div>
                                                        <button onClick={() => remove(l.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {suggestions.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Suggested spots</h2>
                                <span className="text-xs text-muted-foreground/70 font-mono">{suggestions.length}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {suggestions.map(s => (
                                    <Card key={s.url} className="p-3 bg-card/30 backdrop-blur border-dashed flex items-start gap-2">
                                        <div className="flex-1 min-w-0">
                                            <a href={s.url} target="_blank" rel="noreferrer" className="font-medium text-sm hover:underline truncate flex items-center gap-1.5">
                                                {s.name}
                                                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                                            </a>
                                            <div className="text-[11px] text-muted-foreground font-mono truncate">{hostOf(s.url)}</div>
                                            {s.note && <div className="text-xs text-muted-foreground mt-1">{s.note}</div>}
                                        </div>
                                        <Button size="sm" variant="ghost" className="shrink-0 h-7 px-2 text-xs" onClick={() => add(s)}>
                                            <Plus className="h-3.5 w-3.5" /> Add
                                        </Button>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function AddLinkDialog({ onAdded }: { onAdded: () => void }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [kind, setKind] = useState<Kind>('fb_group');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const reset = () => { setName(''); setUrl(''); setKind('fb_group'); setNote(''); };

    const submit = async () => {
        if (!name.trim() || !url.trim()) { toast.error('Name + URL required'); return; }
        try { new URL(url.trim()); } catch { toast.error('URL must start with http(s)://'); return; }
        setSubmitting(true);
        try {
            const r = await fetch('/api/links', {
                method: 'POST',
                body: JSON.stringify({ name: name.trim(), url: url.trim(), kind, note: note.trim() || null }),
            });
            if (r.ok) { toast.success('Added'); reset(); setOpen(false); onAdded(); }
            else { const j = await r.json().catch(() => ({})); toast.error(j.error ?? 'Failed'); }
        } finally { setSubmitting(false); }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button><Plus className="h-4 w-4" />Add link</Button>} />
            <DialogContent>
                <DialogHeader><DialogTitle>Add a hunting spot</DialogTitle></DialogHeader>
                <div className="space-y-3">
                    <div><Label className="text-xs">Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="דירות להשכרה תל אביב" /></div>
                    <div><Label className="text-xs">URL *</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.facebook.com/groups/..." /></div>
                    <div>
                        <Label className="text-xs">Kind</Label>
                        <Select value={kind} onValueChange={(v) => v && setKind(v as Kind)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fb_group">Facebook group</SelectItem>
                                <SelectItem value="marketplace">Marketplace</SelectItem>
                                <SelectItem value="site">Site / aggregator</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div><Label className="text-xs">Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="any tip, e.g. 'private owners only'" /></div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={submit} disabled={submitting}>Add</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
