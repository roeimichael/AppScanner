import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/storage';

const TG = 'https://api.telegram.org';

interface TGChat { id: number; type: string; title?: string; first_name?: string; last_name?: string; username?: string }

// GET — the shared bot's @username + a fresh one-time code for the deep link
// (t.me/<username>?start=<code>). The code is a nonce the client passes back to POST;
// it isn't stored server-side — POST just matches it against the bot's recent updates.
export async function GET() {
    const s = await getSettings();
    if (!s.telegramBotToken) return NextResponse.json({ configured: false });
    const me = await fetch(`${TG}/bot${s.telegramBotToken}/getMe`, { cache: 'no-store' }).then(r => r.json()).catch(() => null);
    if (!me?.ok) return NextResponse.json({ configured: false, error: 'Bot unreachable' });
    const code = `as_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    return NextResponse.json({ configured: true, botUsername: me.result.username, code });
}

// POST { code } — find the user's "/start <code>" in the bot's recent updates, capture their
// chat and register it as an alert recipient. Returns { pending:true } if Start not pressed yet.
export async function POST(req: Request) {
    const { code } = await req.json().catch(() => ({} as { code?: string }));
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

    const s = await getSettings();
    if (!s.telegramBotToken) return NextResponse.json({ error: 'Bot not configured' }, { status: 400 });

    const data = await fetch(`${TG}/bot${s.telegramBotToken}/getUpdates`, { cache: 'no-store' }).then(r => r.json()).catch(() => null);
    if (!data?.ok) return NextResponse.json({ error: data?.description ?? 'Telegram error' }, { status: 502 });

    let chat: TGChat | null = null;
    for (const u of (data.result ?? []) as Array<{ message?: { text?: string; chat?: TGChat }; edited_message?: { text?: string; chat?: TGChat } }>) {
        const msg = u.message ?? u.edited_message;
        if (msg?.text?.trim() === `/start ${code}` && msg.chat) { chat = msg.chat; }
    }
    if (!chat) return NextResponse.json({ pending: true });

    const chatId = String(chat.id);
    const known = new Set([s.telegramChatId, ...(s.telegramExtraChatIds ?? [])].filter(Boolean));
    if (!known.has(chatId)) {
        // First connection becomes the primary chat; the rest are added as extra recipients.
        if (!s.telegramChatId) await saveSettings({ telegramChatId: chatId });
        else await saveSettings({ telegramExtraChatIds: [...(s.telegramExtraChatIds ?? []), chatId] });
    }
    const name = chat.title ?? ([chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || chatId);
    return NextResponse.json({ connected: true, chatId, name });
}
