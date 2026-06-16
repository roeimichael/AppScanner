'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
    Activity, Check, ChevronDown, Clock, ExternalLink, Link2, Loader2,
    MessageSquare, Plus, Send, Shield, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
    const [masked, setMasked] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [stats, setStats] = useState<Stats | null>(null);

    // Shared-bot connect flow
    const [botUsername, setBotUsername] = useState<string | null>(null);
    const [connectOpen, setConnectOpen] = useState(false);
    const [connectCode, setConnectCode] = useState<string | null>(null);
    const [connectBusy, setConnectBusy] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);

    const refresh = async () => {
        const j = await fetch('/api/settings').then(r => r.json());
        setMasked(j.telegramBotToken);
        setChatId(j.telegramChatId ?? '');
        setExtras(j.telegramExtraChatIds ?? []);
    };

    useEffect(() => {
        refresh();
        fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {});
        fetch('/api/telegram/connect').then(r => r.json()).then(j => { if (j.configured) setBotUsername(j.botUsername); }).catch(() => {});
    }, []);

    const botConfigured = !!masked;
    const recipients = [chatId, ...extras].filter(Boolean);

    const saveToken = async () => {
        if (!token) return;
        setSaving(true);
        try {
            const r = await fetch('/api/settings', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegramBotToken: token }),
            });
            if (!r.ok) { toast.error('Save failed'); return; }
            toast.success('Bot saved');
            setToken('');
            await refresh();
            const j = await fetch('/api/telegram/connect').then(x => x.json()).catch(() => null);
            if (j?.configured) setBotUsername(j.botUsername);
        } finally { setSaving(false); }
    };

    const removeRecipient = async (id: string) => {
        if (id === chatId) {
            const r = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telegramChatId: extras[0] ?? null, telegramExtraChatIds: extras.slice(1) }) });
            if (r.ok) { toast.success('Removed'); refresh(); } else toast.error('Failed');
        } else {
            const next = extras.filter(e => e !== id);
            const r = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telegramExtraChatIds: next }) });
            if (r.ok) { toast.success('Removed'); setExtras(next); } else toast.error('Failed');
        }
    };

    const addExtra = async () => {
        const v = newExtra.trim();
        if (!v) return;
        if (recipients.includes(v)) { toast.info('Already added'); setNewExtra(''); return; }
        const next = [...extras, v];
        const r = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telegramExtraChatIds: next }) });
        if (r.ok) { setExtras(next); setNewExtra(''); toast.success('Added'); } else toast.error('Failed');
    };

    const test = async () => {
        setTesting(true);
        try {
            const r = await fetch('/api/settings', { method: 'POST' });
            const j = await r.json();
            if (r.ok) toast.success(`Test sent to ${j.sent ?? 1} chat${(j.sent ?? 1) > 1 ? 's' : ''}${j.failed ? ` (${j.failed} failed)` : ''} — check Telegram`);
            else toast.error(j.error ?? 'Test failed');
        } finally { setTesting(false); }
    };

    const openConnect = async () => {
        setConnectOpen(true);
        setConnectCode(null);
        const j = await fetch('/api/telegram/connect').then(r => r.json()).catch(() => null);
        if (j?.configured) { setBotUsername(j.botUsername); setConnectCode(j.code); }
        else toast.error('Bot not set up yet');
    };

    const confirmConnect = async () => {
        if (!connectCode) return;
        setConnectBusy(true);
        try {
            const j = await fetch('/api/telegram/connect', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: connectCode }),
            }).then(r => r.json());
            if (j.connected) { toast.success(`Connected ${j.name}`); setConnectOpen(false); await refresh(); }
            else if (j.pending) toast.info('Not detected yet', { description: 'Press Start in the bot chat, then tap Confirm again.' });
            else toast.error(j.error ?? 'Failed');
        } finally { setConnectBusy(false); }
    };

    const deepLink = botUsername && connectCode ? `https://t.me/${botUsername}?start=${connectCode}` : null;

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">Notification targets, scan status, and how scanning is wired.</p>
            </div>

            <Card className="bg-card/50 backdrop-blur">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        Telegram alerts
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {!botConfigured ? (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">The alerts bot isn&apos;t set up yet. Add a bot token below (one-time, admin) to enable connecting.</p>
                            <BotTokenField token={token} setToken={setToken} masked={masked} onSave={saveToken} saving={saving} />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5">
                                <div className="h-8 w-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                                    <Check className="h-4 w-4 text-emerald-500" />
                                </div>
                                <div className="text-sm">
                                    <div className="font-medium">Alerts go out through {botUsername ? <span className="font-mono">@{botUsername}</span> : 'your bot'}</div>
                                    <div className="text-xs text-muted-foreground">Connect a chat below to start receiving new-listing alerts.</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Connected chats</Label>
                                    {recipients.length > 0 && (
                                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={test} disabled={testing}>
                                            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                            Send test
                                        </Button>
                                    )}
                                </div>
                                {recipients.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No chats connected yet.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {recipients.map((id, i) => (
                                            <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-muted/40 font-mono text-xs">
                                                {id}{i === 0 && <span className="text-[9px] uppercase text-primary not-italic">primary</span>}
                                                <button onClick={() => removeRecipient(id)} className="text-muted-foreground hover:text-destructive" title="Remove">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Button onClick={openConnect}>
                                <Link2 className="h-4 w-4" /> Connect Telegram
                            </Button>

                            {/* Advanced / admin */}
                            <div className="pt-1">
                                <button onClick={() => setAdvancedOpen(v => !v)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} /> Advanced
                                </button>
                                {advancedOpen && (
                                    <div className="mt-3 space-y-4 border-t border-border/40 pt-3">
                                        <div className="space-y-2">
                                            <Label className="text-xs">Add a chat ID manually (group / channel)</Label>
                                            <div className="flex flex-wrap gap-2">
                                                <Input placeholder="-1001234567890" value={newExtra} onChange={e => setNewExtra(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addExtra(); }} className="font-mono max-w-[16rem]" />
                                                <Button variant="outline" size="sm" onClick={addExtra} disabled={!newExtra.trim()}><Plus className="h-3.5 w-3.5" /> Add</Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Change the bot token (admin)</Label>
                                            <BotTokenField token={token} setToken={setToken} masked={masked} onSave={saveToken} saving={saving} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
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
                    <p>Which sources a search uses (yad2 / onmap / komo) is also chosen per search.</p>
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
                    <p>The bot token grants control of the bot. Treat it like a password — it stays server-side and is never shown to people who connect.</p>
                    <p>For deployed instances: set the <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">CRON_SECRET</code> env var so only the cron can trigger scans.</p>
                </CardContent>
            </Card>

            {/* Connect dialog */}
            <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Connect your Telegram</DialogTitle></DialogHeader>
                    <ol className="space-y-3 text-sm">
                        <li className="flex gap-3">
                            <span className="shrink-0 h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-mono flex items-center justify-center">1</span>
                            <div>
                                Open the bot in Telegram and tap <b>Start</b>.
                                {deepLink ? (
                                    <div className="mt-2">
                                        <a href={deepLink} target="_blank" rel="noreferrer">
                                            <Button size="sm" variant="outline"><ExternalLink className="h-3.5 w-3.5" /> Open {botUsername ? `@${botUsername}` : 'bot'}</Button>
                                        </a>
                                    </div>
                                ) : (
                                    <div className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> preparing link…</div>
                                )}
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <span className="shrink-0 h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-mono flex items-center justify-center">2</span>
                            <div>Come back here and confirm — we&apos;ll detect your chat and start sending alerts there.</div>
                        </li>
                    </ol>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConnectOpen(false)}>Cancel</Button>
                        <Button onClick={confirmConnect} disabled={connectBusy || !connectCode}>
                            {connectBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            I pressed Start — confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function BotTokenField({ token, setToken, masked, onSave, saving }: {
    token: string; setToken: (v: string) => void; masked: string | null; onSave: () => void; saving: boolean;
}) {
    return (
        <div className="flex flex-wrap gap-2 items-end">
            <div className="space-y-1.5 flex-1 min-w-[16rem]">
                <Input type="password" placeholder={masked ?? '123456:ABC-DEF…'} value={token} onChange={e => setToken(e.target.value)} className="font-mono" />
                {masked && !token && <p className="text-xs text-muted-foreground">Saved: <span className="font-mono">{masked}</span></p>}
            </div>
            <Button onClick={onSave} disabled={saving || !token}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save bot
            </Button>
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
