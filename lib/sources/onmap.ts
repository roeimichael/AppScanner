import type { FilterSpec, Listing, PropertyType, Source } from './types';
import { findCity } from '@/lib/yad2/cities';
import { applyPostFilters } from '@/lib/yad2/params';
import { detectAmenities } from '@/lib/amenities';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
    'Origin': 'https://www.onmap.co.il',
    'Referer': 'https://www.onmap.co.il/',
};

// Maps internal property types to Onmap's `type` filter values.
const TYPE_MAP: Partial<Record<PropertyType, string>> = {
    apartment: 'apartment',
    garden_apt: 'garden_apartment',
    penthouse: 'penthouse',
    rooftop: 'rooftop_apartment',
    duplex: 'duplex',
    studio: 'studio',
    private_house: 'private_house',
    cottage: 'cottage',
};

interface OnmapAddress {
    he?: { city_name?: string; neighborhood?: string; street_name?: string; house_number?: number | null };
    en?: { city_name?: string; neighborhood?: string; street_name?: string; house_number?: number | null };
    location?: { lat?: number; lon?: number };
}

interface OnmapListing {
    _id?: string;
    id?: string | number;
    slug?: string;
    search_option?: 'rent' | 'rent-short' | 'buy';
    property_type?: string;
    price?: number;
    images?: { url?: string; thumbnail?: string }[];
    address?: OnmapAddress;
    additional_info?: {
        rooms?: number;
        floor?: { on_the?: number; out_of?: number };
        area?: { base?: number; garden?: number | null };
        bathrooms?: number;
    };
    is_promoted?: boolean;
    advertiser_type?: string;
    created_at?: string;
    search_date?: string;
}

const buildOnmapUrl = (filters: FilterSpec, dealType: 'rent' | 'sale'): string => {
    const params = new URLSearchParams();
    params.set('option', dealType === 'rent' ? 'rent,rent-short' : 'buy');
    params.set('section', 'residence');
    params.set('country', 'Israel');
    params.set('$limit', '50');
    params.set('$skip', '0');
    params.set('$sort', '-search_date');

    if (filters.cityId) {
        const c = findCity(filters.cityId);
        if (c?.slug) params.set('city', c.slug);
    }

    // Onmap uses discrete room values, not min/max. Expand range.
    if (filters.minRooms != null || filters.maxRooms != null) {
        const lo = Math.max(1, Math.floor(filters.minRooms ?? 1));
        const hi = Math.min(15, Math.ceil(filters.maxRooms ?? 10));
        for (let r = lo; r <= hi; r++) params.append('rooms[]', String(r));
    }

    if (filters.minPrice != null) params.set('min', String(filters.minPrice));
    if (filters.maxPrice != null) params.set('max', String(filters.maxPrice));

    if (filters.propertyTypes?.length) {
        for (const pt of filters.propertyTypes) {
            const mapped = TYPE_MAP[pt];
            if (mapped) params.append('type[]', mapped);
        }
    }

    return `https://phoenix.onmap.co.il/v1/properties/mixed_search?${params.toString()}`;
};

const normalize = (it: OnmapListing): Listing | null => {
    const token = String(it._id ?? it.id ?? '');
    if (!token) return null;
    const a = it.address ?? {};
    const he = a.he ?? {};
    const houseNum = he.house_number ?? a.en?.house_number;
    return {
        sourceId: 'onmap',
        token,
        // Public listing page is /home-details/<slug>; the bare id 404s in their SPA.
        link: `https://www.onmap.co.il/home-details/${it.slug ?? token}`,
        city: he.city_name ?? a.en?.city_name,
        neighborhood: he.neighborhood ?? a.en?.neighborhood,
        street: he.street_name ?? a.en?.street_name,
        houseNumber: houseNum ?? undefined,
        floor: it.additional_info?.floor?.on_the,
        rooms: it.additional_info?.rooms,
        sqm: it.additional_info?.area?.base,
        price: it.price,
        propertyType: it.property_type,
        image: it.images?.[0]?.url ?? it.images?.[0]?.thumbnail,
        images: it.images?.map(img => img.url ?? img.thumbnail).filter((s): s is string => !!s),
        isAgency: it.advertiser_type === 'agency',
        lat: a.location?.lat,
        lon: a.location?.lon,
        createdAt: it.created_at ?? it.search_date,
        ...detectAmenities({ propertyType: it.property_type }),
    };
};

// Per-listing detail. Used to enrich newly-discovered listings with owner phone
// (the search feed doesn't include contacts — they only appear in the detail endpoint).
export const fetchOnmapDetail = async (token: string): Promise<{ phone?: string } | null> => {
    try {
        const res = await fetch(`https://phoenix.onmap.co.il/v1/properties/${token}`, {
            headers: HEADERS, cache: 'no-store',
        });
        if (!res.ok) return null;
        const j: { contacts?: { primary?: { phone?: string } } } = await res.json();
        const phone = j.contacts?.primary?.phone;
        return phone ? { phone: String(phone) } : {};
    } catch {
        return null;
    }
};

export const onmapSource: Source = {
    id: 'onmap',
    name: 'Onmap',
    async fetchListings(filters: FilterSpec): Promise<Listing[]> {
        const dealType = filters.dealType === 'sale' ? 'sale' : 'rent';
        const url = buildOnmapUrl(filters, dealType);
        const res = await fetch(url, { headers: HEADERS, cache: 'no-store' });
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`Onmap ${res.status}: ${body.slice(0, 200)}`);
        }
        const json: { data?: OnmapListing[] } = await res.json();
        const listings = (json.data ?? []).map(normalize).filter((x): x is Listing => x !== null);
        return applyPostFilters(listings, filters);
    },
};
