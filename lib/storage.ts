import type { FilterSpec, Listing, Preferences } from './sources/types';
import { supabase } from './supabase';
export type { Listing } from './sources/types';

export interface SearchRecord {
    id: string;
    name: string;
    enabled: boolean;
    intervalMinutes: number;
    sources: string[];
    filters: FilterSpec;
    preferences?: Preferences;
    activeHoursStart?: number;
    activeHoursEnd?: number;
    lastRunAt: string | null;
    lastRunStatus: 'ok' | 'error' | null;
    lastRunError: string | null;
    createdAt: string;
}

export interface Settings {
    telegramBotToken: string | null;
    telegramChatId: string | null;
    // Additional chat IDs (groups, channels) to fan out alerts to.
    // Group IDs are negative integers; channel IDs are also negative.
    telegramExtraChatIds?: string[];
}

export interface NotificationRecord {
    id: string;
    searchId: string;
    listingToken: string;
    sourceId: string;
    snapshot: Listing;
    sentAt: string;
    channel: 'telegram' | 'log';
    status: 'sent' | 'failed' | 'logged';
    error?: string;
    eventKind?: 'new' | 'price_drop' | 'price_rise' | 'removed';
    oldPrice?: number;
    newPrice?: number;
}

export interface PricePoint { at: string; price: number; }
export type ListingStatus = 'active' | 'price_changed' | 'removed';
export interface SeenEntry {
    firstSeenAt: string;
    lastSeenAt: string;
    snapshot: Listing;
    priceHistory?: PricePoint[];
    status?: ListingStatus;
    userState?: 'favorite' | 'dismissed';
}

export interface ScanRunRecord {
    at: string;
    searchId: string;
    sourceId: string;
    status: 'ok' | 'error';
    fetched: number;
    newCount: number;
    error?: string;
    durationMs: number;
}

// Row mappers — DB uses snake_case, app uses camelCase.

interface SearchRow {
    id: string;
    name: string;
    enabled: boolean;
    interval_minutes: number;
    sources: string[];
    filters: FilterSpec;
    preferences: Preferences | null;
    active_hours_start: number | null;
    active_hours_end: number | null;
    last_run_at: string | null;
    last_run_status: 'ok' | 'error' | null;
    last_run_error: string | null;
    created_at: string;
}

const rowToSearch = (r: SearchRow): SearchRecord => ({
    id: r.id,
    name: r.name,
    enabled: r.enabled,
    intervalMinutes: r.interval_minutes,
    sources: r.sources ?? [],
    filters: r.filters ?? {},
    preferences: r.preferences ?? undefined,
    activeHoursStart: r.active_hours_start ?? undefined,
    activeHoursEnd: r.active_hours_end ?? undefined,
    lastRunAt: r.last_run_at,
    lastRunStatus: r.last_run_status,
    lastRunError: r.last_run_error,
    createdAt: r.created_at,
});

const searchToRow = (s: Partial<SearchRecord>): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    if (s.id !== undefined) out.id = s.id;
    if (s.name !== undefined) out.name = s.name;
    if (s.enabled !== undefined) out.enabled = s.enabled;
    if (s.intervalMinutes !== undefined) out.interval_minutes = s.intervalMinutes;
    if (s.sources !== undefined) out.sources = s.sources;
    if (s.filters !== undefined) out.filters = s.filters;
    if (s.preferences !== undefined) out.preferences = s.preferences ?? null;
    if (s.activeHoursStart !== undefined) out.active_hours_start = s.activeHoursStart ?? null;
    if (s.activeHoursEnd !== undefined) out.active_hours_end = s.activeHoursEnd ?? null;
    if (s.lastRunAt !== undefined) out.last_run_at = s.lastRunAt;
    if (s.lastRunStatus !== undefined) out.last_run_status = s.lastRunStatus;
    if (s.lastRunError !== undefined) out.last_run_error = s.lastRunError;
    if (s.createdAt !== undefined) out.created_at = s.createdAt;
    return out;
};

interface SeenRow {
    search_id: string;
    source_id: string;
    token: string;
    first_seen_at: string;
    last_seen_at: string;
    snapshot: Listing;
    price_history: PricePoint[] | null;
    status: ListingStatus;
    user_state: 'favorite' | 'dismissed' | null;
}

const rowToSeen = (r: SeenRow): SeenEntry => ({
    firstSeenAt: r.first_seen_at,
    lastSeenAt: r.last_seen_at,
    snapshot: r.snapshot,
    priceHistory: r.price_history ?? [],
    status: r.status,
    userState: r.user_state ?? undefined,
});

// --- Searches ---

export const listSearches = async (): Promise<SearchRecord[]> => {
    const { data, error } = await supabase().from('searches').select('*').order('created_at', { ascending: true });
    if (error) throw new Error(`listSearches: ${error.message}`);
    return (data as SearchRow[]).map(rowToSearch);
};

export const getSearch = async (id: string): Promise<SearchRecord | null> => {
    const { data, error } = await supabase().from('searches').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`getSearch: ${error.message}`);
    return data ? rowToSearch(data as SearchRow) : null;
};

export const upsertSearch = async (
    rec: Omit<SearchRecord, 'id' | 'createdAt'> & { id?: string },
): Promise<SearchRecord> => {
    const sb = supabase();
    if (rec.id) {
        const row = searchToRow(rec);
        delete (row as Record<string, unknown>).id;
        const { data, error } = await sb.from('searches').update(row).eq('id', rec.id).select('*').single();
        if (error) throw new Error(`upsertSearch update: ${error.message}`);
        return rowToSearch(data as SearchRow);
    }
    const { data, error } = await sb.from('searches').insert(searchToRow(rec)).select('*').single();
    if (error) throw new Error(`upsertSearch insert: ${error.message}`);
    return rowToSearch(data as SearchRow);
};

export const updateSearchRunMeta = async (
    id: string,
    meta: { lastRunAt: string; lastRunStatus: 'ok' | 'error'; lastRunError: string | null },
) => {
    const { error } = await supabase().from('searches').update({
        last_run_at: meta.lastRunAt,
        last_run_status: meta.lastRunStatus,
        last_run_error: meta.lastRunError,
    }).eq('id', id);
    if (error) throw new Error(`updateSearchRunMeta: ${error.message}`);
};

export const deleteSearch = async (id: string): Promise<void> => {
    const { error } = await supabase().from('searches').delete().eq('id', id);
    if (error) throw new Error(`deleteSearch: ${error.message}`);
};

// --- Seen listings ---
//
// Old API took a string seenKey of form `${sourceId}:${searchId}`. We preserve that
// for callers, parsing internally. Returned dictionary still keys by `${sourceId}:${token}`.

const parseSeenKey = (seenKey: string): { sourceId: string; searchId: string } => {
    const idx = seenKey.indexOf(':');
    if (idx === -1) throw new Error(`Bad seenKey: ${seenKey}`);
    return { sourceId: seenKey.slice(0, idx), searchId: seenKey.slice(idx + 1) };
};

export const loadSeen = async (seenKey: string): Promise<Record<string, SeenEntry>> => {
    const { sourceId, searchId } = parseSeenKey(seenKey);
    const { data, error } = await supabase()
        .from('seen_listings')
        .select('*')
        .eq('search_id', searchId)
        .eq('source_id', sourceId);
    if (error) throw new Error(`loadSeen: ${error.message}`);
    const out: Record<string, SeenEntry> = {};
    for (const r of (data as SeenRow[])) {
        out[`${r.source_id}:${r.token}`] = rowToSeen(r);
    }
    return out;
};

export const saveSeen = async (seenKey: string, seen: Record<string, SeenEntry>) => {
    const { sourceId, searchId } = parseSeenKey(seenKey);
    const rows = Object.entries(seen).map(([key, entry]) => {
        const token = key.slice(key.indexOf(':') + 1);
        return {
            search_id: searchId,
            source_id: sourceId,
            token,
            first_seen_at: entry.firstSeenAt,
            last_seen_at: entry.lastSeenAt,
            snapshot: entry.snapshot,
            price_history: entry.priceHistory ?? [],
            status: entry.status ?? 'active',
            user_state: entry.userState ?? null,
        };
    });
    if (rows.length === 0) return;
    // Upsert in chunks to stay under request limits.
    const sb = supabase();
    for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const { error } = await sb.from('seen_listings').upsert(chunk, {
            onConflict: 'search_id,source_id,token',
        });
        if (error) throw new Error(`saveSeen: ${error.message}`);
    }
};

// Set of `${sourceId}:${token}` for every apartment in the tracker. Used by the
// scanner to never auto-mark a tracked listing as removed.
export const listTrackedKeys = async (): Promise<Set<string>> => {
    const { data, error } = await supabase()
        .from('tracked_apartments')
        .select('source_id, token');
    if (error) throw new Error(`listTrackedKeys: ${error.message}`);
    const set = new Set<string>();
    for (const r of (data ?? []) as { source_id: string | null; token: string | null }[]) {
        if (r.source_id && r.token) set.add(`${r.source_id}:${r.token}`);
    }
    return set;
};

export const listAllSeenListings = async (): Promise<{ searchId: string; entry: SeenEntry }[]> => {
    const { data, error } = await supabase().from('seen_listings').select('*');
    if (error) throw new Error(`listAllSeenListings: ${error.message}`);
    return (data as SeenRow[]).map(r => ({ searchId: r.search_id, entry: rowToSeen(r) }));
};

export const findListingAnywhere = async (
    sourceId: string,
    token: string,
): Promise<{ searchId: string; seenKey: string; entry: SeenEntry } | null> => {
    const { data, error } = await supabase()
        .from('seen_listings')
        .select('*')
        .eq('source_id', sourceId)
        .eq('token', token)
        .limit(1);
    if (error) throw new Error(`findListingAnywhere: ${error.message}`);
    const row = (data as SeenRow[])[0];
    if (!row) return null;
    return { searchId: row.search_id, seenKey: `${row.source_id}:${row.search_id}`, entry: rowToSeen(row) };
};

export const setListingUserState = async (
    sourceId: string,
    token: string,
    state: 'favorite' | 'dismissed' | null,
): Promise<number> => {
    const { data, error } = await supabase()
        .from('seen_listings')
        .update({ user_state: state })
        .eq('source_id', sourceId)
        .eq('token', token)
        .select('search_id');
    if (error) throw new Error(`setListingUserState: ${error.message}`);
    return (data ?? []).length;
};

export const countSeen = async (searchId: string): Promise<number> => {
    const { count, error } = await supabase()
        .from('seen_listings')
        .select('*', { head: true, count: 'exact' })
        .eq('search_id', searchId);
    if (error) throw new Error(`countSeen: ${error.message}`);
    return count ?? 0;
};

// --- Settings (single row id=1) ---

export const getSettings = async (): Promise<Settings> => {
    const { data, error } = await supabase().from('settings').select('*').eq('id', 1).maybeSingle();
    if (error) throw new Error(`getSettings: ${error.message}`);
    if (!data) return { telegramBotToken: null, telegramChatId: null, telegramExtraChatIds: [] };
    return {
        telegramBotToken: data.telegram_bot_token ?? null,
        telegramChatId: data.telegram_chat_id ?? null,
        telegramExtraChatIds: data.telegram_extra_chat_ids ?? [],
    };
};

// Partial update: only columns explicitly provided are written, so saving one field
// (e.g. chat ID) never clobbers another (e.g. an already-saved bot token left blank in the form).
export const saveSettings = async (settings: Partial<Settings>) => {
    const row: Record<string, unknown> = { id: 1, updated_at: new Date().toISOString() };
    if (settings.telegramBotToken !== undefined) row.telegram_bot_token = settings.telegramBotToken;
    if (settings.telegramChatId !== undefined) row.telegram_chat_id = settings.telegramChatId;
    if (settings.telegramExtraChatIds !== undefined) row.telegram_extra_chat_ids = settings.telegramExtraChatIds;
    const { error } = await supabase().from('settings').upsert(row, { onConflict: 'id' });
    if (error) throw new Error(`saveSettings: ${error.message}`);
};

// --- Notifications ---

interface NotifRow {
    id: string;
    search_id: string;
    listing_token: string;
    source_id: string;
    snapshot: Listing;
    sent_at: string;
    channel: 'telegram' | 'log';
    status: 'sent' | 'failed' | 'logged';
    error: string | null;
    event_kind: NotificationRecord['eventKind'] | null;
    old_price: number | null;
    new_price: number | null;
}

const rowToNotif = (r: NotifRow): NotificationRecord => ({
    id: r.id,
    searchId: r.search_id,
    listingToken: r.listing_token,
    sourceId: r.source_id,
    snapshot: r.snapshot,
    sentAt: r.sent_at,
    channel: r.channel,
    status: r.status,
    error: r.error ?? undefined,
    eventKind: r.event_kind ?? undefined,
    oldPrice: r.old_price ?? undefined,
    newPrice: r.new_price ?? undefined,
});

export const listNotifications = async (limit = 200): Promise<NotificationRecord[]> => {
    const { data, error } = await supabase()
        .from('notifications')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(limit);
    if (error) throw new Error(`listNotifications: ${error.message}`);
    return (data as NotifRow[]).map(rowToNotif);
};

export const appendNotifications = async (records: NotificationRecord[]) => {
    if (records.length === 0) return;
    const rows = records.map(r => ({
        id: r.id,
        search_id: r.searchId,
        listing_token: r.listingToken,
        source_id: r.sourceId,
        snapshot: r.snapshot,
        sent_at: r.sentAt,
        channel: r.channel,
        status: r.status,
        error: r.error ?? null,
        event_kind: r.eventKind ?? null,
        old_price: r.oldPrice ?? null,
        new_price: r.newPrice ?? null,
    }));
    const { error } = await supabase().from('notifications').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw new Error(`appendNotifications: ${error.message}`);
};

// --- Scan runs ---

interface ScanRunRow {
    at: string;
    search_id: string;
    source_id: string;
    status: 'ok' | 'error';
    fetched: number;
    new_count: number;
    error: string | null;
    duration_ms: number;
}

export const appendScanRuns = async (records: ScanRunRecord[]) => {
    if (records.length === 0) return;
    const rows = records.map(r => ({
        at: r.at,
        search_id: r.searchId,
        source_id: r.sourceId,
        status: r.status,
        fetched: r.fetched,
        new_count: r.newCount,
        error: r.error ?? null,
        duration_ms: r.durationMs,
    }));
    const { error } = await supabase().from('scan_runs').insert(rows);
    if (error) throw new Error(`appendScanRuns: ${error.message}`);
};

export const listScanRuns = async (limit = 1000): Promise<ScanRunRecord[]> => {
    const { data, error } = await supabase()
        .from('scan_runs')
        .select('*')
        .order('at', { ascending: false })
        .limit(limit);
    if (error) throw new Error(`listScanRuns: ${error.message}`);
    return (data as ScanRunRow[]).map(r => ({
        at: r.at,
        searchId: r.search_id,
        sourceId: r.source_id,
        status: r.status,
        fetched: r.fetched,
        newCount: r.new_count,
        error: r.error ?? undefined,
        durationMs: r.duration_ms,
    }));
};
