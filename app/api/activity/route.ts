import { NextResponse } from 'next/server';
import { listScanRuns } from '@/lib/storage';

// Aggregates scan runs into daily new-listings buckets per source.
// Also produces source-health summary (success rate, avg duration, errors).
export async function GET() {
    const runs = await listScanRuns(2000);
    const now = new Date();
    const days = 14;

    // Build day buckets keyed by YYYY-MM-DD
    const buckets: Record<string, { date: string; newCount: number; bySource: Record<string, number> }> = {};
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        buckets[key] = { date: key, newCount: 0, bySource: {} };
    }

    for (const r of runs) {
        const key = r.at.slice(0, 10);
        if (!buckets[key]) continue;
        buckets[key].newCount += r.newCount;
        buckets[key].bySource[r.sourceId] = (buckets[key].bySource[r.sourceId] ?? 0) + r.newCount;
    }

    // Source health: last 200 runs per source
    const recent = runs.slice(-500);
    const bySource: Record<string, { ok: number; error: number; avgMs: number; lastError?: string; lastAt?: string }> = {};
    for (const r of recent) {
        const s = bySource[r.sourceId] ?? (bySource[r.sourceId] = { ok: 0, error: 0, avgMs: 0 });
        if (r.status === 'ok') s.ok++;
        else { s.error++; s.lastError = r.error; }
        s.avgMs = (s.avgMs * (s.ok + s.error - 1) + r.durationMs) / (s.ok + s.error);
        s.lastAt = r.at;
    }

    return NextResponse.json({
        daily: Object.values(buckets),
        sources: Object.entries(bySource).map(([id, s]) => ({
            sourceId: id,
            successRate: s.ok / (s.ok + s.error || 1),
            ok: s.ok,
            error: s.error,
            avgDurationMs: Math.round(s.avgMs),
            lastError: s.lastError,
            lastAt: s.lastAt,
        })),
    });
}
