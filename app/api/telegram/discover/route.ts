import { NextResponse } from 'next/server';

interface TGChat {
    id: number;
    type: string;
    title?: string;
    first_name?: string;
    last_name?: string;
    username?: string;
}

interface TGUpdate {
    message?: { chat?: TGChat };
    edited_message?: { chat?: TGChat };
    channel_post?: { chat?: TGChat };
}

// Discovers chat IDs that have messaged the bot.
// User flow: create bot via BotFather → message it ("hi") → call this endpoint with token → pick a chat.
export async function POST(req: Request) {
    const body = await req.json().catch(() => null);
    const token = body?.token;
    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

    try {
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, { cache: 'no-store' });
        const data = await tgRes.json();
        if (!tgRes.ok || !data.ok) {
            return NextResponse.json({ error: data.description ?? `Telegram ${tgRes.status}` }, { status: 400 });
        }

        const updates: TGUpdate[] = data.result ?? [];
        const seen = new Map<number, TGChat>();
        for (const u of updates) {
            const c = u.message?.chat ?? u.edited_message?.chat ?? u.channel_post?.chat;
            if (c) seen.set(c.id, c);
        }

        const me = await fetch(`https://api.telegram.org/bot${token}/getMe`).then(r => r.json()).catch(() => null);

        return NextResponse.json({
            bot: me?.ok ? me.result : null,
            chats: Array.from(seen.values()),
        });
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
    }
}
