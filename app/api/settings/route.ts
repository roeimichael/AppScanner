import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSettings, saveSettings } from '@/lib/storage';
import { sendTelegramMessage } from '@/lib/telegram';

const SettingsSchema = z.object({
    telegramBotToken: z.string().nullable(),
    telegramChatId: z.string().nullable(),
});

const maskToken = (t: string | null) => (t ? `${t.slice(0, 6)}…${t.slice(-4)}` : null);

export async function GET() {
    const s = await getSettings();
    return NextResponse.json({
        telegramBotToken: maskToken(s.telegramBotToken),
        telegramChatId: s.telegramChatId,
        configured: !!(s.telegramBotToken && s.telegramChatId),
    });
}

export async function PUT(req: Request) {
    const body = await req.json();
    const parsed = SettingsSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }
    await saveSettings(parsed.data);
    return NextResponse.json({ ok: true });
}

// POST = test message
export async function POST() {
    const s = await getSettings();
    if (!s.telegramBotToken || !s.telegramChatId) {
        return NextResponse.json({ error: 'Telegram not configured' }, { status: 400 });
    }
    try {
        await sendTelegramMessage(s.telegramBotToken, s.telegramChatId, '✅ appscanner test message — your bot is wired up.');
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
    }
}
