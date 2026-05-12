import { getSource } from './sources';
import type { Listing } from './sources/types';
import {
    type SearchRecord,
    type SeenEntry,
    appendNotifications,
    appendScanRuns,
    getSettings,
    listSearches,
    loadSeen,
    saveSeen,
    updateSearchRunMeta,
} from './storage';
import { sendListingFanout } from './telegram';
import { fetchOnmapDetail } from './sources/onmap';
import { getPpsqmStats, type PpsqmStats } from './market-stats';

export interface ChangeEvent {
    kind: 'new' | 'price_drop' | 'price_rise' | 'removed';
    listing: Listing;
    oldPrice?: number;
    newPrice?: number;
}

export interface ScanOutcome {
    searchId: string;
    searchName: string;
    status: 'ok' | 'error' | 'skipped';
    fetched: number;
    newCount: number;
    priceDropCount?: number;
    removedCount?: number;
    error?: string;
    notifyStatus?: 'sent' | 'skipped' | 'failed';
    notifyError?: string;
}

// Listings missing from REMOVED_AFTER_MISSES consecutive scans get marked 'removed'.
const REMOVED_AFTER_MS = 24 * 60 * 60 * 1000;

const isDue = (search: SearchRecord, now: Date): boolean => {
    if (!search.lastRunAt) return true;
    const last = new Date(search.lastRunAt).getTime();
    const minMs = search.intervalMinutes * 60 * 1000;
    return now.getTime() - last >= minMs - 30_000;
};

// Returns true if `now` falls inside the search's active-hours window (Israel local time).
// If no window configured, always true. Window can wrap midnight (e.g. start=22, end=6 = 10pm–6am).
const isWithinActiveHours = (search: SearchRecord, now: Date): boolean => {
    const start = search.activeHoursStart;
    const end = search.activeHoursEnd;
    if (start == null || end == null) return true;
    // Convert to IL hour using Intl
    const ilHour = Number(new Intl.DateTimeFormat('en-IL', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jerusalem' }).format(now));
    if (start === end) return true;
    if (start < end) return ilHour >= start && ilHour < end;
    // Wraps midnight
    return ilHour >= start || ilHour < end;
};

// Build (emoji, header) pair for a single change event so the per-listing message
// gets the right framing regardless of kind (new / price_drop / removed).
const headerFor = (ev: ChangeEvent): { emoji: string; text: string } => {
    const price = (n?: number) => n ? n.toLocaleString('he-IL') + ' ₪' : '—';
    if (ev.kind === 'price_drop') return { emoji: '📉', text: `${price(ev.newPrice)} (was ${price(ev.oldPrice)})` };
    if (ev.kind === 'price_rise') return { emoji: '📈', text: `${price(ev.newPrice)} (was ${price(ev.oldPrice)})` };
    if (ev.kind === 'removed')    return { emoji: '❌', text: `removed (was ${price(ev.oldPrice)})` };
    return { emoji: '🆕', text: price(ev.listing.price) };
};

// Concurrent enrichment: fetch detail (phone) for each new listing missing one,
// dispatching to the right per-source detail fetcher. Small concurrency cap keeps
// us polite and stays well under ScraperAPI's per-second cap.
const enrichPhones = async (events: ChangeEvent[]): Promise<void> => {
    // Only Onmap exposes the advertiser phone server-side. Yad2 hides it behind a
    // click-reveal that requires session + CSRF, and the static HTML only contains
    // their corporate share-WhatsApp number — useless for contact. Skip Yad2.
    const targets = events.filter(e => !e.listing.phone && e.listing.sourceId === 'onmap');
    const limit = 4;
    for (let i = 0; i < targets.length; i += limit) {
        await Promise.all(targets.slice(i, i + limit).map(async ev => {
            const detail = await fetchOnmapDetail(ev.listing.token);
            if (detail?.phone) ev.listing.phone = detail.phone;
        }));
    }
};

// Build per-city ₪/sqm stats map, one lookup per distinct city in the events.
const buildStatsByCity = async (events: ChangeEvent[]): Promise<Map<string, PpsqmStats | null>> => {
    const cities = new Set<string>();
    for (const e of events) if (e.listing.city) cities.add(e.listing.city);
    const map = new Map<string, PpsqmStats | null>();
    for (const c of cities) map.set(c, await getPpsqmStats(c));
    return map;
};

export interface RunOptions {
    // When true, skip sending Telegram alerts but still record state to seen_listings.
    // Use to bootstrap an empty database without flooding the user.
    skipNotify?: boolean;
}

export const runOneSearch = async (search: SearchRecord, opts: RunOptions = {}): Promise<ScanOutcome> => {
    const now = new Date();
    const events: ChangeEvent[] = [];
    let totalFetched = 0;

    const runRecords: import('./storage').ScanRunRecord[] = [];
    const sourceErrors: string[] = [];
    try {
        for (const sourceId of search.sources) {
            const source = getSource(sourceId);
            if (!source) throw new Error(`Unknown source: ${sourceId}`);
            const sourceStart = Date.now();
            let perSourceNew = 0;
            let listings: Listing[];
            try {
                listings = await source.fetchListings(search.filters);
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                runRecords.push({
                    at: now.toISOString(), searchId: search.id, sourceId,
                    status: 'error', fetched: 0, newCount: 0,
                    error: msg,
                    durationMs: Date.now() - sourceStart,
                });
                sourceErrors.push(`${sourceId}: ${msg}`);
                continue;
            }
            totalFetched += listings.length;

            const seenKey = `${sourceId}:${search.id}`;
            const seen = await loadSeen(seenKey);
            const updates: Record<string, SeenEntry> = { ...seen };
            const seenInScan = new Set<string>();

            for (const l of listings) {
                const key = `${l.sourceId}:${l.token}`;
                seenInScan.add(key);
                const existing = updates[key];

                if (!existing) {
                    updates[key] = {
                        firstSeenAt: now.toISOString(),
                        lastSeenAt: now.toISOString(),
                        snapshot: l,
                        priceHistory: l.price != null ? [{ at: now.toISOString(), price: l.price }] : [],
                        status: 'active',
                    };
                    events.push({ kind: 'new', listing: l, newPrice: l.price });
                    perSourceNew++;
                    continue;
                }

                // Detect price changes
                const lastPrice = existing.snapshot.price;
                const history = existing.priceHistory ?? [];
                if (l.price != null && lastPrice != null && l.price !== lastPrice) {
                    history.push({ at: now.toISOString(), price: l.price });
                    events.push({
                        kind: l.price < lastPrice ? 'price_drop' : 'price_rise',
                        listing: l,
                        oldPrice: lastPrice,
                        newPrice: l.price,
                    });
                }

                updates[key] = {
                    ...existing,
                    lastSeenAt: now.toISOString(),
                    snapshot: l,
                    priceHistory: history,
                    status: 'active',
                };
            }

            // Detect removed listings: previously seen, missing this scan, last seen > 24h ago
            for (const [key, entry] of Object.entries(updates)) {
                if (seenInScan.has(key)) continue;
                if (entry.status === 'removed') continue;
                const ageMs = now.getTime() - new Date(entry.lastSeenAt).getTime();
                if (ageMs >= REMOVED_AFTER_MS) {
                    updates[key] = { ...entry, status: 'removed' };
                    events.push({ kind: 'removed', listing: entry.snapshot, oldPrice: entry.snapshot.price });
                }
            }

            await saveSeen(seenKey, updates);
            runRecords.push({
                at: now.toISOString(), searchId: search.id, sourceId,
                status: 'ok', fetched: listings.length, newCount: perSourceNew,
                durationMs: Date.now() - sourceStart,
            });
        }
        await appendScanRuns(runRecords);

        const newEvents = events.filter(e => e.kind === 'new');
        const dropEvents = events.filter(e => e.kind === 'price_drop');
        const removedEvents = events.filter(e => e.kind === 'removed');

        let notifyStatus: ScanOutcome['notifyStatus'] = 'skipped';
        let notifyError: string | undefined;

        // Skip price-rise (rare and uninteresting) and removed (user said: don't care).
        const notifiable = events.filter(e => e.kind !== 'price_rise' && e.kind !== 'removed');
        if (notifiable.length > 0) {
            const settings = await getSettings();
            if (!opts.skipNotify && settings.telegramBotToken && settings.telegramChatId) {
                const chatIds = [settings.telegramChatId, ...(settings.telegramExtraChatIds ?? [])];
                try {
                    // Enrich each new listing with the advertiser phone (per-source), build market stats once.
                    await enrichPhones(notifiable);
                    const statsByCity = await buildStatsByCity(notifiable);

                    // One Telegram message per listing → each gets its own photo + link preview.
                    // Telegram only renders one preview per message, so bundling N listings into one
                    // message hides N-1 of them.
                    for (const ev of notifiable) {
                        const h = headerFor(ev);
                        await sendListingFanout(
                            settings.telegramBotToken,
                            chatIds,
                            ev.listing,
                            h.emoji,
                            h.text,
                            statsByCity,
                        );
                    }
                    notifyStatus = 'sent';

                    // Persist enriched snapshot (with phone) so future scans don't re-fetch.
                    for (const ev of notifiable) {
                        if (!ev.listing.phone) continue;
                        const seenKey = `${ev.listing.sourceId}:${search.id}`;
                        const seen = await loadSeen(seenKey);
                        const k = `${ev.listing.sourceId}:${ev.listing.token}`;
                        if (seen[k]) {
                            seen[k] = { ...seen[k], snapshot: { ...seen[k].snapshot, phone: ev.listing.phone } };
                            await saveSeen(seenKey, seen);
                        }
                    }
                } catch (e) {
                    notifyStatus = 'failed';
                    notifyError = e instanceof Error ? e.message : String(e);
                }
            }
            // Log every notifiable event (new + price_drop + removed)
            await appendNotifications(
                notifiable.map(e => ({
                    id: `${search.id}:${e.listing.sourceId}:${e.listing.token}:${e.kind}:${now.toISOString()}`,
                    searchId: search.id,
                    listingToken: e.listing.token,
                    sourceId: e.listing.sourceId,
                    snapshot: e.listing,
                    sentAt: now.toISOString(),
                    channel: notifyStatus === 'sent' ? 'telegram' : 'log',
                    status: notifyStatus === 'sent' ? 'sent' : notifyStatus === 'failed' ? 'failed' : 'logged',
                    error: notifyError,
                    eventKind: e.kind,
                    oldPrice: e.oldPrice,
                    newPrice: e.newPrice,
                })),
            );
        }

        const partialErr = sourceErrors.length > 0 ? sourceErrors.join(' | ') : null;
        await updateSearchRunMeta(search.id, {
            lastRunAt: now.toISOString(),
            lastRunStatus: partialErr ? 'error' : 'ok',
            lastRunError: partialErr,
        });

        return {
            searchId: search.id,
            searchName: search.name,
            status: 'ok',
            fetched: totalFetched,
            newCount: newEvents.length,
            priceDropCount: dropEvents.length,
            removedCount: removedEvents.length,
            notifyStatus,
            notifyError,
            error: partialErr ?? undefined,
        };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Persist any partial run records so source health metrics survive failure.
        if (runRecords.length > 0) await appendScanRuns(runRecords).catch(() => {});
        await updateSearchRunMeta(search.id, {
            lastRunAt: now.toISOString(),
            lastRunStatus: 'error',
            lastRunError: msg,
        });
        return {
            searchId: search.id,
            searchName: search.name,
            status: 'error',
            fetched: totalFetched,
            newCount: 0,
            error: msg,
        };
    }
};

export const runDueSearches = async (force = false, opts: RunOptions = {}): Promise<ScanOutcome[]> => {
    const all = await listSearches();
    const now = new Date();
    const outcomes: ScanOutcome[] = [];
    for (const s of all) {
        if (!s.enabled) {
            outcomes.push({ searchId: s.id, searchName: s.name, status: 'skipped', fetched: 0, newCount: 0 });
            continue;
        }
        if (!force && !isDue(s, now)) {
            outcomes.push({ searchId: s.id, searchName: s.name, status: 'skipped', fetched: 0, newCount: 0 });
            continue;
        }
        if (!force && !isWithinActiveHours(s, now)) {
            outcomes.push({ searchId: s.id, searchName: s.name, status: 'skipped', fetched: 0, newCount: 0 });
            continue;
        }
        outcomes.push(await runOneSearch(s, opts));
    }
    return outcomes;
};
