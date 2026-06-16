import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSettings, saveSettings } from '@/lib/storage';
import { sendTelegramMessage } from '@/lib/telegram';

// All fields optional → partial saves. Only the keys present in the body are written
// (see lib/storage.saveSettings), so updating one setting never wipes the others.
const SettingsSchema = z.object({
    telegramBotToken: z.string().nullable().optional(),
    telegramChatId: z.string().nullable().optional(),
    telegramExtraChatIds: z.array(z.string()).optional(),
});

const maskToken = (t: string | null) => (t ? `${t.slice(0, 6)}…${t.slice(-4)}` : null);

export async function GET() {
    const s = await getSettings();
    return NextResponse.json({
        telegramBotToken: maskToken(s.telegramBotToken),
        telegramChatId: s.telegramChatId,
        telegramExtraChatIds: s.telegramExtraChatIds ?? [],
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

// POST = test message, fanned out to the primary chat + every extra chat (same path the
// scanner uses), so the test verifies group/channel delivery too.
export async function POST() {
    const s = await getSettings();
    if (!s.telegramBotToken || !s.telegramChatId) {
        return NextResponse.json({ error: 'Telegram not configured' }, { status: 400 });
    }
    const chatIds = [s.telegramChatId, ...(s.telegramExtraChatIds ?? [])];
    const results = await Promise.allSettled(
        chatIds.map(id => sendTelegramMessage(s.telegramBotToken!, id, '✅ appscanner test message — your bot is wired up.')),
    );
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed === chatIds.length) {
        const first = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
        return NextResponse.json({ error: first?.reason instanceof Error ? first.reason.message : String(first?.reason) }, { status: 502 });
    }
    return NextResponse.json({ ok: true, sent: chatIds.length - failed, failed });
}
