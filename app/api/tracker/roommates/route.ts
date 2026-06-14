import { NextResponse } from 'next/server';

export async function GET() {
    const raw = process.env.ROOMMATES ?? '';
    const names = raw.split(',').map(s => s.trim()).filter(Boolean);
    return NextResponse.json({ roommates: names });
}
