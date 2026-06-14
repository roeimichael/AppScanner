'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink, MapPin, MessageSquare, Plus, Trash2, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Status = 'interested' | 'contacted' | 'scheduled' | 'visited' | 'rejected' | 'signed';

const STATUSES: Status[] = ['interested', 'contacted', 'scheduled', 'visited', 'rejected', 'signed'];
const STATUS_LABEL: Record<Status, string> = {
    interested: 'Interested', contacted: 'Contacted', scheduled: 'Scheduled',
    visited: 'Visited', rejected: 'Rejected', signed: 'Signed',
};
const STATUS_BAR: Record<Status, string> = {
    interested: 'bg-blue-500',
    contacted:  'bg-amber-500',
    scheduled:  'bg-violet-500',
    visited:    'bg-teal-500',
    rejected:   'bg-zinc-500',
    signed:     'bg-emerald-500',
};

interface Apt {
    id: string;
    sourceId: string | null;
    token: string | null;
    url: string;
    title: string;
    price: number | null;
    rooms: number | null;
    sqm: number | null;
    address: string | null;
    neighborhood: string | null;
    city: string | null;
    imageUrl: string | null;
    status: Status;
    assignedTo: string | null;
    createdBy: string | null;
    autoImported: boolean;
    createdAt: string;
    updatedAt: string;
    noteCount: number;
    lastNote: { author: string; body: string; createdAt: string } | null;
}

interface Note { id: string; author: string; body: string; createdAt: string }
interface Neighborhood { id: string; name: string; city: string | null; note: string | null }

const fmtPrice = (n: number | null) => n ? `₪${n.toLocaleString()}` : '—';
const fmtAge = (iso: string) => {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.round(h / 24)}d`;
};

export default function TrackerPage() {
    const [apartments, setApartments] = useState<Apt[]>([]);
    const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
    const [roommates, setRoommates] = useState<string[]>([]);
    const [me, setMe] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [openApt, setOpenApt] = useState<string | null>(null);
    const [hideRejected, setHideRejected] = useState(true);
    const [draggingId, setDraggingId] = useState<string | null>(null);

    const load = async () => {
        const [a, n, r] = await Promise.all([
            fetch('/api/tracker/apartments').then(x => x.json()),
            fetch('/api/tracker/neighborhoods').then(x => x.json()),
            fetch('/api/tracker/roommates').then(x => x.json()),
        ]);
        setApartments(a.apartments ?? []);
        setNeighborhoods(n.neighborhoods ?? []);
        setRoommates(r.roommates ?? []);
        if (!me && (r.roommates ?? []).length > 0) {
            const saved = typeof window !== 'undefined' ? localStorage.getItem('tracker:me') : null;
            setMe(saved && r.roommates.includes(saved) ? saved : r.roommates[0]);
        }
        setLoading(false);
    };
    useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
    useEffect(() => { if (me && typeof window !== 'undefined') localStorage.setItem('tracker:me', me); }, [me]);

    const byStatus = useMemo(() => {
        const groups: Record<Status, Apt[]> = { interested: [], contacted: [], scheduled: [], visited: [], rejected: [], signed: [] };
        for (const a of apartments) {
            if (a.status in groups) groups[a.status as Status].push(a);
        }
        return groups;
    }, [apartments]);

    const setStatus = async (id: string, status: Status) => {
        setApartments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
        const r = await fetch(`/api/tracker/apartments/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
        if (!r.ok) { toast.error('Status update failed'); load(); }
    };

    const setAssigned = async (id: string, assignedTo: string | null) => {
        setApartments(prev => prev.map(a => a.id === id ? { ...a, assignedTo } : a));
        const r = await fetch(`/api/tracker/apartments/${id}`, { method: 'PATCH', body: JSON.stringify({ assignedTo }) });
        if (!r.ok) { toast.error('Assignee update failed'); load(); }
    };

    const remove = async (id: string) => {
        if (!confirm('Remove this apartment?')) return;
        setApartments(prev => prev.filter(a => a.id !== id));
        await fetch(`/api/tracker/apartments/${id}`, { method: 'DELETE' });
    };

    const visibleColumns = hideRejected ? STATUSES.filter(s => s !== 'rejected') : STATUSES;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Tracker</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Apartments we&apos;re actively chasing. Promote from <a href="/optimal" className="text-primary hover:underline">/optimal</a> or paste a link manually.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {roommates.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <Select value={me} onValueChange={(v) => v && setMe(v)}>
                                <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="I am…" /></SelectTrigger>
                                <SelectContent>{roommates.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    )}
                    <AddManualDialog me={me} onAdded={load} />
                </div>
            </div>

            <NeighborhoodList neighborhoods={neighborhoods} onChange={load} />

            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <div>
                    <span className="font-medium text-foreground">{apartments.length}</span> total ·
                    <span> {byStatus.rejected.length} rejected</span> ·
                    drag between columns to update status
                </div>
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                    <input type="checkbox" checked={hideRejected} onChange={(e) => setHideRejected(e.target.checked)} className="h-3.5 w-3.5" />
                    Hide rejected
                </label>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
                </div>
            ) : apartments.length === 0 ? (
                <Card className="py-16 text-center bg-card/50 backdrop-blur border-dashed">
                    <p className="text-sm text-muted-foreground">
                        Nothing here yet. Browse the pool on <a href="/optimal" className="text-primary hover:underline">/optimal</a> and hit <b>+ Add to Interested</b>, or paste a link with <b>Add link</b>.
                    </p>
                </Card>
            ) : (
                <div className="grid gap-3 overflow-x-auto pb-4" style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(240px, 1fr))` }}>
                    {visibleColumns.map(status => (
                        <KanbanColumn
                            key={status}
                            status={status}
                            apartments={byStatus[status]}
                            roommates={roommates}
                            draggingId={draggingId}
                            onDragStart={setDraggingId}
                            onDragEnd={() => setDraggingId(null)}
                            onDrop={(id) => setStatus(id, status)}
                            onAssign={setAssigned}
                            onOpen={setOpenApt}
                            onRemove={remove}
                        />
                    ))}
                </div>
            )}

            <Dialog open={!!openApt} onOpenChange={(v) => !v && setOpenApt(null)}>
                <DialogContent className="max-w-2xl">
                    {openApt && <AptDetail id={openApt} me={me} onClose={() => setOpenApt(null)} onChange={load} />}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function KanbanColumn({ status, apartments, roommates, draggingId, onDragStart, onDragEnd, onDrop, onAssign, onOpen, onRemove }: {
    status: Status;
    apartments: Apt[];
    roommates: string[];
    draggingId: string | null;
    onDragStart: (id: string) => void;
    onDragEnd: () => void;
    onDrop: (id: string) => void;
    onAssign: (id: string, who: string | null) => void;
    onOpen: (id: string) => void;
    onRemove: (id: string) => void;
}) {
    const [isOver, setIsOver] = useState(false);
    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
            onDragLeave={() => setIsOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsOver(false);
                const id = e.dataTransfer.getData('text/apt-id');
                if (id) onDrop(id);
            }}
            className={`rounded-xl border bg-card/30 backdrop-blur flex flex-col min-h-[400px] transition-colors ${isOver ? 'border-primary/60 bg-primary/5' : 'border-border/60'}`}
        >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${STATUS_BAR[status]}`} />
                    <span className="text-sm font-medium">{STATUS_LABEL[status]}</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">{apartments.length}</span>
            </div>
            <div className="p-2 space-y-2 flex-1">
                {apartments.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground/70 text-center py-8 italic">drop here</div>
                ) : (
                    apartments.map(a => (
                        <KanbanCard
                            key={a.id}
                            apt={a}
                            roommates={roommates}
                            isDragging={draggingId === a.id}
                            onDragStart={() => onDragStart(a.id)}
                            onDragEnd={onDragEnd}
                            onAssign={(who) => onAssign(a.id, who)}
                            onOpen={() => onOpen(a.id)}
                            onRemove={() => onRemove(a.id)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function KanbanCard({ apt, roommates, isDragging, onDragStart, onDragEnd, onAssign, onOpen, onRemove }: {
    apt: Apt;
    roommates: string[];
    isDragging: boolean;
    onDragStart: () => void;
    onDragEnd: () => void;
    onAssign: (who: string | null) => void;
    onOpen: () => void;
    onRemove: () => void;
}) {
    return (
        <Card
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('text/apt-id', apt.id);
                e.dataTransfer.effectAllowed = 'move';
                onDragStart();
            }}
            onDragEnd={onDragEnd}
            className={`overflow-hidden p-0 cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? 'opacity-40' : ''}`}
        >
            {apt.imageUrl && (
                <a
                    href={apt.url} target="_blank" rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    draggable={false}
                    className="relative aspect-[16/9] bg-muted block group/img"
                    title="Open original listing"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={apt.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" draggable={false} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/0" />
                    <div className="absolute bottom-1 left-2 text-white text-sm font-semibold font-mono drop-shadow">
                        {fmtPrice(apt.price)}{apt.price ? '/mo' : ''}
                    </div>
                    {apt.sourceId && (
                        <Badge className="absolute top-1 right-1 text-[9px] font-mono uppercase bg-background/70 backdrop-blur border-0">
                            {apt.sourceId}
                        </Badge>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-medium gap-1.5">
                        <ExternalLink className="h-4 w-4" /> Open original
                    </div>
                </a>
            )}
            <div className="p-2 space-y-1.5">
                {!apt.imageUrl && (
                    <div className="text-sm font-semibold font-mono">{fmtPrice(apt.price)}{apt.price ? '/mo' : ''}</div>
                )}
                <div className="text-xs font-medium line-clamp-2">{apt.title}</div>
                {(apt.rooms || apt.sqm || apt.neighborhood) && (
                    <div className="text-[10px] text-muted-foreground flex gap-1.5 flex-wrap">
                        {apt.rooms && <span>{apt.rooms}r</span>}
                        {apt.sqm && <span>· {apt.sqm}m²</span>}
                        {apt.neighborhood && <span className="truncate">· {apt.neighborhood}</span>}
                    </div>
                )}
                <a
                    href={apt.url} target="_blank" rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    draggable={false}
                    className="flex items-center justify-center gap-1.5 w-full bg-primary/15 hover:bg-primary/25 text-primary text-xs font-medium rounded-md py-1.5 transition-colors"
                >
                    <ExternalLink className="h-3.5 w-3.5" /> Open listing
                </a>
                <div className="flex items-center gap-1">
                    <AssigneePicker value={apt.assignedTo} roommates={roommates} onChange={onAssign} />
                    <button onClick={onOpen} className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/70 rounded px-1.5 py-0.5 transition-colors">
                        <MessageSquare className="h-2.5 w-2.5" />
                        {apt.noteCount > 0 ? apt.noteCount : 'note'}
                    </button>
                    <button onClick={onRemove} className="text-muted-foreground hover:text-destructive p-0.5">
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
                {apt.lastNote && (
                    <div className="text-[10px] text-muted-foreground line-clamp-1 italic border-t border-border/30 pt-1">
                        <b className="text-foreground/80 not-italic">{apt.lastNote.author}:</b> {apt.lastNote.body}
                    </div>
                )}
            </div>
        </Card>
    );
}

function AssigneePicker({ value, roommates, onChange }: { value: string | null; roommates: string[]; onChange: (v: string | null) => void }) {
    if (roommates.length === 0) return null;
    const initial = value?.[0]?.toUpperCase() ?? '?';
    return (
        <Select value={value ?? '__none'} onValueChange={(v) => onChange(v === '__none' ? null : v)}>
            <SelectTrigger className={`h-6 w-auto gap-1 px-1.5 text-[10px] border-0 ${value ? 'bg-primary/20 text-primary-foreground' : 'bg-muted/50'}`}>
                {value ? (
                    <span className="inline-flex items-center gap-1">
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold">{initial}</span>
                        {value}
                    </span>
                ) : <span className="text-muted-foreground">unassigned</span>}
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="__none">Unassigned</SelectItem>
                {roommates.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
        </Select>
    );
}

function AptDetail({ id, me, onClose, onChange }: { id: string; me: string; onClose: () => void; onChange: () => void }) {
    const [apt, setApt] = useState<Apt | null>(null);
    const [notes, setNotes] = useState<Note[]>([]);
    const [draft, setDraft] = useState('');
    const [posting, setPosting] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const load = async () => {
        const r = await fetch(`/api/tracker/apartments/${id}`).then(x => x.json());
        setApt(r.apartment);
        setNotes(r.notes ?? []);
    };
    useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

    const submitNote = async () => {
        const body = draft.trim();
        if (!body) return;
        if (!me) { toast.error('Pick who you are first (top right)'); return; }
        setPosting(true);
        try {
            const r = await fetch(`/api/tracker/apartments/${id}/notes`, { method: 'POST', body: JSON.stringify({ author: me, body }) });
            if (r.ok) { setDraft(''); await load(); onChange(); }
            else toast.error('Post failed');
        } finally { setPosting(false); }
    };

    const deleteNote = async (noteId: string) => {
        const r = await fetch(`/api/tracker/apartments/${id}/notes/${noteId}`, { method: 'DELETE' });
        if (r.ok) { await load(); onChange(); }
    };

    if (!apt) return <div className="p-6"><Skeleton className="h-40" /></div>;

    return (
        <>
            <DialogHeader>
                <DialogTitle className="pr-8 leading-snug">{apt.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4" ref={ref}>
                <a href={apt.url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-md py-2.5 transition-colors">
                    <ExternalLink className="h-4 w-4" /> Open original listing
                </a>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                    <Badge className={`text-white border-0 ${STATUS_BAR[apt.status]}`}>{STATUS_LABEL[apt.status]}</Badge>
                    {apt.assignedTo && <Badge variant="outline">→ {apt.assignedTo}</Badge>}
                    <span className="text-muted-foreground">{fmtPrice(apt.price)}{apt.price ? '/mo' : ''}</span>
                    {apt.rooms && <span className="text-muted-foreground">· {apt.rooms} rooms</span>}
                    {apt.sqm && <span className="text-muted-foreground">· {apt.sqm} sqm</span>}
                </div>
                {(apt.neighborhood || apt.address || apt.city) && (
                    <p className="text-sm text-muted-foreground">
                        {[apt.neighborhood, apt.address, apt.city].filter(Boolean).join(' • ')}
                    </p>
                )}
                <Separator />
                <div>
                    <div className="text-sm font-medium mb-2">Notes</div>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {notes.length === 0 && <p className="text-xs text-muted-foreground">No notes yet.</p>}
                        {notes.map(n => (
                            <div key={n.id} className="bg-muted/40 rounded-md p-2 text-sm group relative">
                                <div className="flex items-center gap-2 text-[11px] mb-0.5">
                                    <span className="font-medium">{n.author}</span>
                                    <span className="text-muted-foreground">{fmtAge(n.createdAt)} ago</span>
                                    <button onClick={() => deleteNote(n.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                                <div className="whitespace-pre-wrap">{n.body}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 space-y-2">
                        <Textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder={me ? `Add note as ${me} (Cmd/Ctrl+Enter)…` : 'Pick who you are first (top right)'}
                            rows={2}
                            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitNote(); }}
                        />
                        <div className="flex justify-end">
                            <Button size="sm" onClick={submitNote} disabled={!draft.trim() || posting || !me}>Post</Button>
                        </div>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Close</Button>
            </DialogFooter>
        </>
    );
}

function AddManualDialog({ me, onAdded }: { me: string; onAdded: () => void }) {
    const [open, setOpen] = useState(false);
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [rooms, setRooms] = useState('');
    const [sqm, setSqm] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const reset = () => { setUrl(''); setTitle(''); setPrice(''); setRooms(''); setSqm(''); setNeighborhood(''); };

    const submit = async () => {
        if (!url.trim() || !title.trim()) { toast.error('URL + title required'); return; }
        setSubmitting(true);
        try {
            const r = await fetch('/api/tracker/apartments', {
                method: 'POST',
                body: JSON.stringify({
                    url: url.trim(), title: title.trim(),
                    price: price ? Number(price) : null,
                    rooms: rooms ? Number(rooms) : null,
                    sqm: sqm ? Number(sqm) : null,
                    neighborhood: neighborhood.trim() || null,
                    createdBy: me || null,
                }),
            });
            if (r.ok) { toast.success('Added'); reset(); setOpen(false); onAdded(); }
            else { const j = await r.json().catch(() => ({})); toast.error(j.error ?? 'Failed'); }
        } finally { setSubmitting(false); }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button><Plus className="h-4 w-4" />Add link</Button>} />
            <DialogContent>
                <DialogHeader><DialogTitle>Add apartment by link</DialogTitle></DialogHeader>
                <div className="space-y-3">
                    <div><Label className="text-xs">URL *</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.yad2.co.il/... or fb.com/marketplace/..." /></div>
                    <div><Label className="text-xs">Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ramat Hadar, 3 rooms, balcony" /></div>
                    <div className="grid grid-cols-3 gap-2">
                        <div><Label className="text-xs">Price (₪/mo)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
                        <div><Label className="text-xs">Rooms</Label><Input type="number" step="0.5" value={rooms} onChange={(e) => setRooms(e.target.value)} /></div>
                        <div><Label className="text-xs">Sqm</Label><Input type="number" value={sqm} onChange={(e) => setSqm(e.target.value)} /></div>
                    </div>
                    <div><Label className="text-xs">Neighborhood</Label><Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} /></div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={submit} disabled={submitting}>Add</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function NeighborhoodList({ neighborhoods, onChange }: { neighborhoods: Neighborhood[]; onChange: () => void }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [city, setCity] = useState('');
    const [note, setNote] = useState('');

    const add = async () => {
        if (!name.trim()) return;
        const r = await fetch('/api/tracker/neighborhoods', {
            method: 'POST',
            body: JSON.stringify({ name: name.trim(), city: city.trim() || null, note: note.trim() || null }),
        });
        if (r.ok) { setName(''); setCity(''); setNote(''); setOpen(false); onChange(); }
    };
    const remove = async (id: string) => {
        const r = await fetch(`/api/tracker/neighborhoods/${id}`, { method: 'DELETE' });
        if (r.ok) onChange();
    };

    return (
        <Card className="p-3 bg-card/30 backdrop-blur">
            <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Target neighborhoods</div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger render={<Button size="sm" variant="ghost" className="h-6 px-2 text-xs"><Plus className="h-3 w-3" />Add</Button>} />
                    <DialogContent>
                        <DialogHeader><DialogTitle>Add target neighborhood</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                            <div><Label className="text-xs">Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Florentin" /></div>
                            <div><Label className="text-xs">City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Tel Aviv" /></div>
                            <div><Label className="text-xs">Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="close to work, 3-3.5 rooms" /></div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button onClick={add}>Add</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            {neighborhoods.length === 0 ? (
                <p className="text-xs text-muted-foreground/70 italic">None yet — add the areas you&apos;re hunting in.</p>
            ) : (
                <div className="flex flex-wrap gap-1.5">
                    {neighborhoods.map(n => (
                        <Badge key={n.id} variant="outline" className="gap-1 pl-2 pr-1 py-0.5 text-xs">
                            <MapPin className="h-2.5 w-2.5" />
                            <span>{n.name}</span>
                            {n.city && <span className="text-muted-foreground">· {n.city}</span>}
                            {n.note && <span className="text-muted-foreground italic">— {n.note}</span>}
                            <button onClick={() => remove(n.id)} className="ml-0.5 hover:text-destructive p-0.5"><X className="h-3 w-3" /></button>
                        </Badge>
                    ))}
                </div>
            )}
        </Card>
    );
}
