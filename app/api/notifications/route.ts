import { NextResponse } from 'next/server';
import { listNotifications } from '@/lib/storage';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get('limit') || 100);
    const items = await listNotifications(Math.min(Math.max(limit, 1), 500));
    return NextResponse.json({ notifications: items });
}
