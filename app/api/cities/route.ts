import { NextResponse } from 'next/server';
import { CITIES } from '@/lib/yad2/cities';

export async function GET() {
    return NextResponse.json({ cities: CITIES });
}
