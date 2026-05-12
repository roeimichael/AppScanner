import type { FilterSpec, Listing, Source } from './types';
import { applyPostFilters, buildYad2ApiUrl } from '@/lib/yad2/params';
import { detectAmenities } from '@/lib/amenities';
import { reverseHoodMany } from '@/lib/geo';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
    'Referer': 'https://www.yad2.co.il/realestate',
    'Origin': 'https://www.yad2.co.il',
};

interface RawListing {
    token?: string;
    address?: {
        city?: { text?: string };
        neighborhood?: { text?: string };
        street?: { text?: string };
        house?: { number?: number; floor?: number };
        coords?: { lat?: number; lon?: number };
    };
    additionalDetails?: {
        property?: { text?: string };
        roomsCount?: number;
        squareMeter?: number;
    };
    price?: number;
    metaData?: { coverImage?: string; images?: string[] };
    adType?: string;
    tags?: { name: string; id: number }[];
}

// Yad2 image URLs encode the upload timestamp in the filename — close proxy for listing creation date.
// Pattern: .../y2_NN_NNNNNN_YYYYMMDDHHMMSS.jpeg
const extractYad2DateFromImage = (imageUrl?: string): string | undefined => {
    if (!imageUrl) return undefined;
    const m = imageUrl.match(/_(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\.[a-zA-Z]+$/);
    if (!m) return undefined;
    const [, y, mo, d, h, mi, s] = m;
    // Construct ISO; treat as IL time → keep as naive (without TZ) for simplicity, then add Z.
    return `${y}-${mo}-${d}T${h}:${mi}:${s}+02:00`;
};

const normalize = (it: RawListing, isAgency: boolean): Listing | null => {
    if (!it.token) return null;
    const a = it.address ?? {};
    const d = it.additionalDetails ?? {};
    const tags = it.tags?.map(t => t.name).filter(Boolean) ?? [];
    const amenities = detectAmenities({ tags, propertyType: d.property?.text });
    const cover = it.metaData?.coverImage;
    // Use earliest image timestamp if multiple available (cover may be re-uploaded later).
    const imageDates = (it.metaData?.images ?? []).map(extractYad2DateFromImage).filter(Boolean) as string[];
    if (cover) {
        const c = extractYad2DateFromImage(cover);
        if (c) imageDates.push(c);
    }
    const createdAt = imageDates.length > 0 ? imageDates.sort()[0] : undefined;
    return {
        sourceId: 'yad2',
        token: it.token,
        link: `https://www.yad2.co.il/realestate/item/${it.token}`,
        city: a.city?.text,
        neighborhood: a.neighborhood?.text,
        street: a.street?.text,
        houseNumber: a.house?.number,
        floor: a.house?.floor,
        rooms: d.roomsCount,
        sqm: d.squareMeter,
        price: it.price,
        propertyType: d.property?.text,
        image: it.metaData?.coverImage,
        images: it.metaData?.images,
        isAgency,
        lat: a.coords?.lat,
        lon: a.coords?.lon,
        tags,
        createdAt,
        ...amenities,
    };
};

// Fetches the public listing detail page through ScraperAPI and extracts the
// advertiser phone from the embedded "WhatsApp lead" link
// (`wa.me/+972XXXXXXXX&text=...` — the prefilled contact link Yad2 itself renders).
// Returns null if the page is unreachable or the phone link is absent (rare).
export const fetchYad2Detail = async (token: string): Promise<{ phone?: string } | null> => {
    const apiKey = process.env.SCRAPERAPI_KEY;
    if (!apiKey) return null;
    const target = `https://www.yad2.co.il/realestate/item/${token}`;
    const url = `https://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(target)}&country_code=il&keep_headers=true`;
    try {
        const res = await fetch(url, { headers: HEADERS, cache: 'no-store' });
        if (!res.ok) return null;
        const html = await res.text();
        // Match the leading wa.me lead link: phone=+972XXXXXXXX immediately followed by &amp;text=
        // (the lead-prefill text is what distinguishes the advertiser link from share/help phones).
        const m = html.match(/phone=\+?(972\d{8,9})&amp;text=/);
        return m ? { phone: m[1] } : {};
    } catch {
        return null;
    }
};

export const yad2Source: Source = {
    id: 'yad2',
    name: 'Yad2',
    async fetchListings(filters: FilterSpec): Promise<Listing[]> {
        const target = buildYad2ApiUrl(filters);
        // Yad2 blocks datacenter IPs (Radware bot manager). When SCRAPERAPI_KEY is set,
        // route the request through ScraperAPI which uses residential IPs.
        const apiKey = process.env.SCRAPERAPI_KEY;
        const url = apiKey
            ? `https://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(target)}&country_code=il&keep_headers=true`
            : target;
        const res = await fetch(url, { headers: HEADERS, cache: 'no-store' });
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`Yad2 ${res.status}: ${body.slice(0, 200)}`);
        }
        const text = await res.text();
        if (text.trimStart().startsWith('<')) {
            throw new Error(`Yad2 returned HTML (bot challenge): ${text.slice(0, 120).replace(/\s+/g, ' ')}`);
        }
        const json: { data?: { private?: RawListing[]; agency?: RawListing[] } } = JSON.parse(text);
        const priv = (json.data?.private ?? []).map(it => normalize(it, false));
        const agency = (json.data?.agency ?? []).map(it => normalize(it, true));
        const all = [...priv, ...agency].filter((x): x is Listing => x !== null);

        // When a hood filter is active, listings with empty neighborhood but valid
        // coords would be wrongly excluded by the substring match. Reverse-geocode
        // their coords to recover the hood name (Nominatim, ~1 req/sec).
        if (filters.neighborhoods?.length) {
            const needHood = all.filter(l => !l.neighborhood && l.lat != null && l.lon != null);
            if (needHood.length) {
                await reverseHoodMany(needHood, (i, hood) => {
                    if (hood) needHood[i].neighborhood = hood;
                });
            }
        }

        return applyPostFilters(all, filters);
    },
};
