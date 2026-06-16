import { parse } from 'node-html-parser';
import type { FilterSpec, Listing, Source } from './types';
import { findCity } from '@/lib/yad2/cities';
import { applyPostFilters } from '@/lib/yad2/params';
import { detectAmenities } from '@/lib/amenities';

// Komo (komo.co.il) — legacy server-rendered board. No JSON API and no coordinates, so we
// parse the rent/sale HTML and let the scan pipeline forward-geocode the address afterwards
// (see lib/scan.ts enrichGeocode). Reachable without ScraperAPI, so it costs no quota.

const BASE = 'https://www.komo.co.il';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
};

// Leading category words that aren't residential apartments — skip these cards.
const NON_RESIDENTIAL = ['חניה', 'מחסן', 'חנות', 'משרד', 'מגרש', 'קליניק', 'עסק', 'מסחרי', 'תעשי'];

const num = (s: string | undefined): number | undefined => {
    if (!s) return undefined;
    const n = Number(s.replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : undefined;
};

// Komo floor text: "קרקע" (ground) → 0, "3 מתוך 5" → 3, "מרתף" (basement) → undefined.
const parseFloor = (txt: string): number | undefined => {
    if (/קרקע/.test(txt)) return 0;
    const m = txt.match(/(\d+)/);
    return m ? Number(m[1]) : undefined;
};

const normalize = (cardHtml: string, cityName: string): Listing | null => {
    const card = parse(cardHtml);
    const a = card.querySelector('a[href*="modaaNum="]');
    const href = a?.getAttribute('href') ?? '';
    const token = href.match(/modaaNum=(\d+)/)?.[1];
    if (!token) return null;

    // Description holds "<type> X.X חדרים (Y מ\"ר)<br>קומה: ..." plus a nested favorites button.
    const descEl = card.querySelector('.description');
    descEl?.querySelector('.mFooterAction')?.remove();
    const desc = (descEl?.text ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

    const propertyType = desc.match(/^([^\d(]+?)\s*[\d.]+\s*חדרים/)?.[1]?.trim();
    if (propertyType && NON_RESIDENTIAL.some(w => propertyType.includes(w))) return null;

    const rooms = num(desc.match(/([\d.]+)\s*חדרים/)?.[1]);
    const sqm = num(desc.match(/\(\s*(\d+)\s*מ/)?.[1]);
    const floorTxt = desc.match(/קומה:\s*(.+)$/)?.[1] ?? '';
    const floor = floorTxt ? parseFloor(floorTxt) : undefined;
    if (rooms != null && rooms < 1) return null; // parking/storage with 0 rooms

    const price = num(card.querySelector('.price')?.text);

    // Title: "<city>, <neighborhood>, <street>". Use canonical city (passed in) for matching.
    const titleParts = (card.querySelector('.title')?.text ?? '')
        .split(',').map(s => s.trim()).filter(Boolean);
    const neighborhood = titleParts[1];
    const streetRaw = titleParts[2];
    const street = streetRaw && !/לא צוין/.test(streetRaw) ? streetRaw : undefined;

    // Image: showPic?picNum=0 is a placeholder (no real photo).
    const imgSrc = card.querySelector('.image__wrapper img')?.getAttribute('src') ?? '';
    const picNum = imgSrc.match(/picNum=(\d+)/)?.[1];
    const image = picNum && picNum !== '0' ? `${BASE}${imgSrc}` : undefined;

    return {
        sourceId: 'komo',
        token,
        link: `${BASE}/code/nadlan/details/?modaaNum=${token}`,
        city: cityName,
        neighborhood,
        street,
        rooms,
        sqm,
        floor,
        price,
        propertyType,
        image,
        // Komo doesn't expose agent vs private on the card → unknown.
        ...detectAmenities({ propertyType, description: desc }),
    };
};

export const komoSource: Source = {
    id: 'komo',
    name: 'Komo',
    async fetchListings(filters: FilterSpec): Promise<Listing[]> {
        const city = filters.cityId ? findCity(filters.cityId) : undefined;
        if (!city) return []; // Komo search requires a city name
        const dealType = filters.dealType === 'sale' ? 'sale' : 'rent';
        const page = dealType === 'sale' ? 'apartments-for-sale.asp' : 'apartments-for-rent.asp';
        const url = `${BASE}/code/nadlan/${page}?cityName=${encodeURIComponent(city.name)}`;

        const res = await fetch(url, { headers: HEADERS, cache: 'no-store' });
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`Komo ${res.status}: ${body.slice(0, 200)}`);
        }
        const html = await res.text();
        const root = parse(html);
        const cards = root.querySelectorAll('.View_Ad_Details');
        const listings = cards
            .map(c => normalize(c.outerHTML, city.name))
            .filter((x): x is Listing => x !== null);
        return applyPostFilters(listings, filters);
    },
};
