'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Activity, Bot, Check, ChevronRight, Clock, ExternalLink, Loader2, MessageSquare, Plus, Send, Shield, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface DiscoveredChat {
    id: number;
    type: string;
    title?: string;
    first_name?: string;
    last_name?: string;
    username?: string;
}

interface Stats {
    searchesTotal: number;
    searchesEnabled: number;
    totalTracked: number;
    newLast24h: number;
    lastRunAt: string | null;
}

export default function SettingsPage() {
    const [token, setToken] = useState('');
    const [chatId, setChatId] = useState('');
    const [extras, setExtras] = useState<string[]>([]);
    const [newExtra, setNewExtra] = useState('');
    const [configured, setConfigured] = useState(false);
    const [masked, setMasked] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [discovering, setDiscovering] = useState(false);
    const [chats, setChats] = useState<DiscoveredChat[]>([]);
    const [bot, setBot] = useState<{ first_name?: string; username?: string } | null>(null);
    const [testing, setTesting] = useState(false);
    const [stats, setStats] = useState<Stats | null>(null);

    const refresh = async () => {
        const j = await fetch('/api/settings').then(r => r.json());
        setMasked(j.telegramBotToken);
        setChatId(j.telegramChatId ?? '');
        setExtras(j.telegramExtraChatIds ?? []);
        setConfigured(!!j.configured);
    };

    useEffect(() => {
        refresh();
        fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {});
    }, []);

    const save = async () => {
        setSaving(true);
        try {
            // Only send the token when the user actually typed a new one — otherwise the
            // saved token stays untouched (the field shows a mask, not the real value).
            const payload: Record<string, unknown> = { telegramChatId: chatId || null };
            if (token) payload.telegramBotToken = token;
            const r = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!r.ok) { toast.error('Save failed'); return; }
            toast.success('Saved');
            await refresh();
            setToken('');
        } finally {
            setSaving(false);
        }
    };

    const saveExtras = async (next: string[]) => {
        const r = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramExtraChatIds: next }),
        });
        if (r.ok) { setExtras(next); toast.success('Saved'); }
        else toast.error('Save failed');
    };

    const addExtra = () => {
        const v = newExtra.trim();
        if (!v) return;
        if (extras.includes(v) || v === chatId) { toast.info('Already added'); setNewExtra(''); return; }
        saveExtras([...extras, v]);
        setNewExtra('');
    };

    const removeExtra = (id: string) => saveExtras(extras.filter(e => e !== id));

    const discoverChats = async () => {
        if (!token) { toast.error('Paste the bot token first'); return; }
        setDiscovering(true);
        setChats([]);
        try {
            const r = await fetch('/api/telegram/discover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            const j = await r.json();
            if (!r.ok) { toast.error(j.error ?? 'Discover failed'); return; }
            setBot(j.bot ?? null);
            setChats(j.chats ?? []);
            if ((j.chats ?? []).length === 0) {
                toast.info('No chats yet', { description: 'Open Telegram, message your bot, then click "Find chats" again.' });
            } else {
                toast.success(`Found ${j.chats.length} chat${j.chats.length > 1 ? 's' : ''}`);
            }
        } finally {
            setDiscovering(false);
        }
    };

    const test = async () => {
        setTesting(true);
        try {
            const r = await fetch('/api/settings', { method: 'POST' });
            const j = await r.json();
            if (r.ok) toast.success(`Test sent to ${j.sent ?? 1} chat${(j.sent ?? 1) > 1 ? 's' : ''}${j.failed ? ` (${j.failed} failed)` : ''} — check Telegram`);
            else toast.error(j.error ?? 'Test failed');
        } finally {
            setTesting(false);
        }
    };

    const hasToken = !!(token || masked);
    const stepTokenDone = hasToken;
    const stepChatDone = !!chatId;
    const stepReady = configured;

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">Notification targets, scan status, and how scanning is wired.</p>
            </div>

            {configured && (
                <Card className="bg-emerald-500/5 border-emerald-500/30 backdrop-blur">
                    <CardContent className="flex items-center gap-3 py-4">
                        <div className="h-9 w-9 rounded-full bg-emerald-500/15 flex items-center justify-center">
                            <Check className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="flex-1">
                            <div className="font-medium">Telegram is connected</div>
                            <div className="text-xs text-muted-foreground">
                                Bot token: <span className="font-mono">{masked}</span> • Chat ID: <span className="font-mono">{chatId}</span>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={test} disabled={testing}>
                            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            Send test
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-card/50 backdrop-blur">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        Telegram setup
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Step number={1} title="Create your bot" done={stepTokenDone}>
                        <p className="text-sm text-muted-foreground">
                            Open Telegram and message <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline inline-flex items-center gap-1">@BotFather <ExternalLink className="h-3 w-3" /></a>, send <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">/newbot</code> and follow the prompts. BotFather will hand you a token.
                        </p>
                        <div className="space-y-1.5">
                            <Label>Bot token</Label>
                            <Input
                                type="password"
                                placeholder={masked ?? '123456:ABC-DEF…'}
                                value={token}
                                onChange={e => setToken(e.target.value)}
                                className="font-mono"
                            />
                            {masked && !token && <p className="text-xs text-muted-foreground">Saved: <span className="font-mono">{masked}</span></p>}
                        </div>
                    </Step>

                    <Separator />

                    <Step number={2} title="Find your chat ID" done={stepChatDone}>
                        <p className="text-sm text-muted-foreground">
                            Open Telegram, find your bot{bot?.username ? <> (<span className="font-mono">@{bot.username}</span>)</> : ''} and send any message to it. Then click below — we&apos;ll fetch the chats your bot can talk to.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={discoverChats} disabled={discovering || !hasToken}>
                                {discovering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                                Find chats
                            </Button>
                            <Input
                                placeholder="…or paste chat ID manually"
                                value={chatId}
                                onChange={e => setChatId(e.target.value)}
                                className="font-mono max-w-[16rem]"
                            />
                        </div>

                        {chats.length > 0 && (
                            <div className="space-y-2 pt-2">
                                <p className="text-xs text-muted-foreground">Pick a chat:</p>
                                <div className="grid gap-2">
                                    {chats.map(c => {
                                        const display = c.title ?? [c.first_name, c.last_name].filter(Boolean).join(' ') ?? c.username ?? c.type;
                                        const selected = chatId === String(c.id);
                                        return (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => setChatId(String(c.id))}
                                                className={`text-left flex items-center justify-between gap-3 px-3 py-2 rounded-lg border transition-colors ${selected ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-accent'}`}
                                            >
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium truncate">{display}</div>
                                                    <div className="text-xs text-muted-foreground font-mono">{c.id} • {c.type}</div>
                                                </div>
                                                {selected ? <Check className="h-4 w-4 text-primary shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </Step>

                    <Separator />

                    <Step number={3} title="Save & test" done={stepReady}>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={save} disabled={saving || (!token && !chatId)}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                Save
                            </Button>
                            <Button variant="outline" onClick={test} disabled={testing || !configured}>
                                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Send test message
                            </Button>
                        </div>
                    </Step>
                </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Also notify these chats
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Extra chat IDs get every alert too — handy for a shared group or a channel. Add the bot to the group, send a message there, use <b>Find chats</b> above to get its ID (groups are negative numbers), then paste it here.
                    </p>
                    {extras.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {extras.map(id => (
                                <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-muted/40 font-mono text-xs">
                                    {id}
                                    <button onClick={() => removeExtra(id)} className="text-muted-foreground hover:text-destructive" title="Remove">
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <Input
                            placeholder="-1001234567890"
                            value={newExtra}
                            onChange={e => setNewExtra(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') addExtra(); }}
                            className="font-mono max-w-[16rem]"
                        />
                        <Button variant="outline" size="sm" onClick={addExtra} disabled={!newExtra.trim()}>
                            <Plus className="h-3.5 w-3.5" /> Add chat
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Scan status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {stats ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                            <Stat label="Searches" value={`${stats.searchesEnabled}/${stats.searchesTotal}`} hint="enabled" />
                            <Stat label="Listings tracked" value={stats.totalTracked.toLocaleString()} />
                            <Stat label="New (24h)" value={stats.newLast24h.toLocaleString()} />
                            <Stat label="Last scan" value={stats.lastRunAt ? timeAgo(stats.lastRunAt) : '—'} />
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Loading…</p>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        How scanning works
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>A GitHub Actions cron hits <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">/api/scan</code> every <b>30 minutes</b>; a Vercel daily cron is a backup trigger.</p>
                    <p>Each search only actually runs when its own <b>interval</b> has elapsed, and only inside its <b>active hours</b> — both set per search on the <Link href="/searches/new" className="text-primary underline-offset-2 hover:underline">search</Link> form, not globally.</p>
                    <p>Which sources a search uses (yad2 / onmap) is also chosen per search.</p>
                    <p>For local testing: <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">curl http://localhost:3000/api/scan?force=1</code></p>
                </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Security
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>Your bot token grants control of the bot. Treat it like a password — don&apos;t commit it.</p>
                    <p>For deployed instances: set the <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">CRON_SECRET</code> env var so only Vercel Cron can trigger scans.</p>
                </CardContent>
            </Card>
        </div>
    );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div className="rounded-lg border bg-muted/20 py-3 px-2">
            <div className="text-xl font-semibold tabular-nums">{value}</div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}{hint ? ` ${hint}` : ''}</div>
        </div>
    );
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.round(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.round(h / 24)}d ago`;
}

function Step({ number, title, done, children }: { number: number; title: string; done?: boolean; children: React.ReactNode }) {
    return (
        <div className="flex gap-4">
            <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-mono font-medium border ${done ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-muted/50 border-border text-muted-foreground'}`}>
                {done ? <Check className="h-3.5 w-3.5" /> : number}
            </div>
            <div className="flex-1 space-y-3 pt-0.5">
                <h3 className="font-medium flex items-center gap-2">
                    {title}
                    {done && <Badge variant="secondary" className="text-[10px] font-mono">done</Badge>}
                </h3>
                {children}
            </div>
        </div>
    );
}
