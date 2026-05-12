'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Bot, Check, ChevronRight, Clock, ExternalLink, Loader2, MessageSquare, Send, Shield } from 'lucide-react';
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

export default function SettingsPage() {
    const [token, setToken] = useState('');
    const [chatId, setChatId] = useState('');
    const [configured, setConfigured] = useState(false);
    const [masked, setMasked] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [discovering, setDiscovering] = useState(false);
    const [chats, setChats] = useState<DiscoveredChat[]>([]);
    const [bot, setBot] = useState<{ first_name?: string; username?: string } | null>(null);
    const [testing, setTesting] = useState(false);

    const refresh = async () => {
        const j = await fetch('/api/settings').then(r => r.json());
        setMasked(j.telegramBotToken);
        setChatId(j.telegramChatId ?? '');
        setConfigured(!!j.configured);
    };

    useEffect(() => { refresh(); }, []);

    const save = async () => {
        setSaving(true);
        try {
            const r = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegramBotToken: token || null,
                    telegramChatId: chatId || null,
                }),
            });
            if (!r.ok) { toast.error('Save failed'); return; }
            toast.success('Saved');
            await refresh();
            setToken('');
        } finally {
            setSaving(false);
        }
    };

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
            if (r.ok) toast.success('Test sent — check Telegram');
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
                <p className="text-sm text-muted-foreground mt-1">Configure where new-listing notifications go.</p>
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
                        <Clock className="h-5 w-5 text-primary" />
                        How scanning works
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>Vercel Cron triggers <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">/api/scan</code> every 15 minutes (configured in <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">vercel.json</code>).</p>
                    <p>Each search runs only when its own interval has elapsed since <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">lastRunAt</code>.</p>
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
