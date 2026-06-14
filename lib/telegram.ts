import type { Listing } from './sources/types';
import { ratePpsqm, type PpsqmStats } from './market-stats';
import { nearestStation } from './lrt';

const TG_API = 'https://api.telegram.org';

// Sends a photo with an HTML caption. Caption max 1024 chars; falls back to plain
// sendMessage if the photo URL fails (Telegram returns 400 for unfetchable images).
export const sendTelegramPhoto = async (
    botToken: string,
    chatId: string,
    photoUrl: string,
    caption: string,
): Promise<void> => {
    const res = await fetch(`${TG_API}/bot${botToken}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            photo: photoUrl,
            caption,
            parse_mode: 'HTML',
        }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        // Common: Telegram fails to fetch the photo (Yad2 hot-link block) → fallback to text.
        if (res.status === 400) {
            await sendTelegramMessage(botToken, chatId, caption);
            return;
        }
        throw new Error(`Telegram sendPhoto ${res.status} (chat ${chatId}): ${body.slice(0, 300)}`);
    }
};

export const sendTelegramMessage = async (botToken: string, chatId: string, text: string): Promise<void> => {
    const res = await fetch(`${TG_API}/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: false,
        }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Telegram ${res.status} (chat ${chatId}): ${body.slice(0, 300)}`);
    }
};

// Send the same message to every configured chat (primary + extras).
// One chat failing does not abort the others; all errors are aggregated.
export const sendTelegramFanout = async (
    botToken: string,
    chatIds: string[],
    text: string,
): Promise<void> => {
    const errors: string[] = [];
    await Promise.all(chatIds.map(async chatId => {
        try { await sendTelegramMessage(botToken, chatId, text); }
        catch (e) { errors.push(e instanceof Error ? e.message : String(e)); }
    }));
    if (errors.length === chatIds.length && chatIds.length > 0) {
        throw new Error(errors.join(' | '));
    }
};

// Send a single listing as its own message — photo + HTML caption when an image
// is available, plain text otherwise. Fans out to every configured chat.
export const sendListingFanout = async (
    botToken: string,
    chatIds: string[],
    listing: Listing,
    headerEmoji: string,
    headerText: string,
    statsByCity?: Map<string, PpsqmStats | null>,
): Promise<void> => {
    const caption = formatListingBlock(listing, headerEmoji, headerText, statsByCity).trimStart();
    const errors: string[] = [];
    await Promise.all(chatIds.map(async chatId => {
        try {
            if (listing.image) await sendTelegramPhoto(botToken, chatId, listing.image, caption);
            else               await sendTelegramMessage(botToken, chatId, caption);
        } catch (e) {
            errors.push(e instanceof Error ? e.message : String(e));
        }
    }));
    if (errors.length === chatIds.length && chatIds.length > 0) {
        throw new Error(errors.join(' | '));
    }
};

const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const formatPrice = (n?: number) => (n ? n.toLocaleString('he-IL') + ' ₪' : '—');

// Hebrew phone format: 050-999-7448
const fmtIlPhone = (intl: string): string => {
    // intl like "972509997448" → "050-999-7448"
    const digits = intl.replace(/\D/g, '');
    const local = digits.startsWith('972') ? '0' + digits.slice(3) : digits;
    if (local.length !== 10) return local;
    return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
};

const waLink = (phone: string, prefill?: string): string => {
    // wa.me requires international without leading + and no separators
    const intl = phone.replace(/\D/g, '');
    const params = prefill ? `?text=${encodeURIComponent(prefill)}` : '';
    return `https://wa.me/${intl}${params}`;
};

const agencyTag = (it: Listing): string => {
    if (it.isAgency === true)  return '🏢 תיווך (realtor)';
    if (it.isAgency === false) return '👤 ללא תיווך (private)';
    return '❓ unknown agency status';
};

// Compact list of amenity icons for amenities the listing is *known* to have.
const amenityLine = (it: Listing): string => {
    const tags: string[] = [];
    if (it.hasElevator)    tags.push('🛗 מעלית');
    if (it.hasBalcony)     tags.push('🌿 מרפסת');
    if (it.hasParking)     tags.push('🚗 חניה');
    if (it.hasAirCondition)tags.push('❄️ מזגן');
    if (it.hasShelter)     tags.push('🛡️ ממ"ד');
    if (it.hasFurniture)   tags.push('🛋️ מרוהט');
    if (it.isRenovated)    tags.push('✨ משופץ');
    if (it.hasWarehouse)   tags.push('📦 מחסן');
    if (it.petsAllowed)    tags.push('🐾 חיות');
    return tags.join(' • ');
};

export const formatListingBlock = (
    it: Listing,
    headerEmoji: string,
    headerText: string,
    statsByCity?: Map<string, PpsqmStats | null>,
): string => {
    const addr = [it.neighborhood, it.street, it.houseNumber].filter(Boolean).join(' ');
    const meta = [
        it.rooms ? `${it.rooms} rooms` : null,
        it.sqm ? `${it.sqm} sqm` : null,
        it.floor != null ? `floor ${it.floor}` : null,
    ].filter(Boolean).join(' • ');

    const stats = statsByCity?.get(it.city ?? '') ?? null;
    const value = ratePpsqm(it.price, it.sqm, stats);
    const valueLine = value ? `\n   📊 ${escape(value.label)}` : '';

    // "Hot deal" prefix when listing is private AND priced under PT mean by ≥10% (z ≤ -0.4ish).
    const isPrivate = it.isAgency === false;
    const cheap = value ? value.z <= -0.4 : false;
    const hotDeal = isPrivate && cheap;
    const finalHeaderEmoji = hotDeal ? '🔥' : headerEmoji;

    let phoneLine = '';
    if (it.phone) {
        const wa = waLink(it.phone, `Hi, I saw your apartment listing at ${it.link}`);
        phoneLine = `\n   📞 ${escape(fmtIlPhone(it.phone))} → <a href="${wa}">WhatsApp</a>`;
    }

    const ams = amenityLine(it);
    const amenityRow = ams ? `\n   ${ams}` : '';

    // Walking distance to the nearest operational Red Line station.
    const near = nearestStation(it.lat, it.lon);
    const lrtRow = near ? `\n   🚈 ${near.walkMin} min walk to ${escape(near.station.name)} (${near.distanceM}m)` : '';

    return [
        `\n${finalHeaderEmoji} <b>${headerText}</b>${hotDeal ? ' <i>(hot deal)</i>' : ''} — ${escape(it.city ?? '')}`,
        addr ? `   ${escape(addr)}` : '',
        meta ? `   ${escape(meta)}` : '',
        valueLine,
        lrtRow,
        `   ${agencyTag(it)}`,
        amenityRow,
        phoneLine,
        `   🔗 <a href="${it.link}">View on ${it.sourceId === 'yad2' ? 'Yad2' : it.sourceId === 'onmap' ? 'Onmap' : it.sourceId}</a>`,
    ].filter(Boolean).join('\n');
};

export const formatListingMessage = (
    searchName: string,
    items: Listing[],
    statsByCity?: Map<string, PpsqmStats | null>,
): string => {
    const header = `🏠 <b>${escape(searchName)}</b> — ${items.length} new`;
    const blocks = items.slice(0, 10).map(it => formatListingBlock(it, '🆕', formatPrice(it.price), statsByCity));
    const footer = items.length > 10 ? `\n\n…and ${items.length - 10} more` : '';
    return header + blocks.join('\n') + footer;
};

// Telegram message body limit is 4096 chars; split if needed.
export const chunkMessage = (msg: string, max = 3800): string[] => {
    if (msg.length <= max) return [msg];
    const chunks: string[] = [];
    let buf = '';
    for (const line of msg.split('\n')) {
        if ((buf + '\n' + line).length > max) {
            chunks.push(buf);
            buf = line;
        } else {
            buf = buf ? buf + '\n' + line : line;
        }
    }
    if (buf) chunks.push(buf);
    return chunks;
};
