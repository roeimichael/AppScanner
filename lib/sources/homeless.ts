import type { FilterSpec, Listing, Source } from './types';
import { findCity } from '@/lib/yad2/cities';
import { applyPostFilters } from '@/lib/yad2/params';
import { acquireBrowser, newStealthContext, releaseBrowser } from '@/lib/browser';

interface RawHomeless {
    id: string;
    title: string;
    href: string;
    image?: string;
    priceText?: string;
    isPromoted: boolean;
}

const parseTitle = (title: string): { propertyType?: string; rooms?: number; neighborhood?: string; city?: string } => {
    // Title pattern: "<type>, <rooms> חדרים, <area>, <city>"  (commas may be doubled with spaces)
    const parts = title.split(/[,،]/).map(s => s.trim()).filter(Boolean);
    const out: { propertyType?: string; rooms?: number; neighborhood?: string; city?: string } = {};
    if (parts[0]) out.propertyType = parts[0];
    for (const p of parts) {
        const m = p.match(/(\d+(?:\.\d+)?)\s*חדרים/);
        if (m) {
            out.rooms = parseFloat(m[1]);
            break;
        }
    }
    if (parts.length >= 4) {
        out.neighborhood = parts[parts.length - 2];
        out.city = parts[parts.length - 1];
    } else if (parts.length === 3) {
        out.city = parts[parts.length - 1];
    }
    return out;
};

const parsePrice = (text?: string): number | undefined => {
    if (!text) return undefined;
    const m = text.match(/[\d,]+/);
    if (!m) return undefined;
    const n = Number(m[0].replace(/,/g, ''));
    return Number.isFinite(n) ? n : undefined;
};

export const homelessSource: Source = {
    id: 'homeless',
    name: 'Homeless',
    async fetchListings(filters: FilterSpec): Promise<Listing[]> {
        if (!filters.cityId) {
            // Homeless URLs are city-scoped — without a city we'd get the whole country and that's noisy.
            return [];
        }
        const city = findCity(filters.cityId);
        if (!city?.slug) return [];
        const dealType = filters.dealType === 'sale' ? 'forsale' : 'rent';
        const url = `https://www.homeless.co.il/${dealType}/${city.slug}`;

        const browser = await acquireBrowser();
        const ctx = await newStealthContext(browser);
        try {
            const page = await ctx.newPage();
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
            // Cloudflare JS challenge passes within ~5 seconds.
            await page.waitForSelector('[id^="ad_"]', { timeout: 25_000 }).catch(() => null);

            const raw = await page.$$eval('[id^="ad_"]', (els) => {
                return els.map((el) => {
                    const idAttr = el.id; // ad_NNN
                    const id = idAttr.replace(/^ad_/, '');
                    const a = el.querySelector('a');
                    const img = el.querySelector('img');
                    const priceEl = el.querySelector('.price');
                    return {
                        id,
                        title: a?.getAttribute('title') ?? '',
                        href: a?.getAttribute('href') ?? '',
                        image: img?.getAttribute('src') ?? undefined,
                        priceText: priceEl?.textContent?.trim() ?? undefined,
                        isPromoted: !!el.querySelector('.promotedAdLabel'),
                    } as RawHomeless;
                }).filter(r => r.id && r.href);
            });

            const listings: Listing[] = raw.map((r) => {
                const meta = parseTitle(r.title);
                const link = r.href.startsWith('http') ? r.href : `https://www.homeless.co.il${r.href}`;
                return {
                    sourceId: 'homeless',
                    token: r.id,
                    link,
                    // Don't fall back to scraped city — leave undefined so post-filter can reject
                    // ads with no parseable city (e.g. promoted cross-city spam).
                    city: meta.city,
                    neighborhood: meta.neighborhood,
                    rooms: meta.rooms,
                    propertyType: meta.propertyType,
                    image: r.image,
                    price: parsePrice(r.priceText),
                };
            });

            return applyPostFilters(listings, filters);
        } finally {
            await ctx.close().catch(() => {});
            releaseBrowser();
        }
    },
};
