export type PropertyType =
    | 'apartment'
    | 'garden_apt'
    | 'penthouse'
    | 'rooftop'
    | 'duplex'
    | 'studio'
    | 'private_house'
    | 'cottage';

export type DealType = 'rent' | 'sale';

export interface FilterSpec {
    dealType?: DealType;
    cityId?: number;
    regionId?: number;
    minRooms?: number;
    maxRooms?: number;
    minPrice?: number;
    maxPrice?: number;
    minSqm?: number;
    maxSqm?: number;
    minFloor?: number;
    maxFloor?: number;
    propertyTypes?: PropertyType[];
    excludeAgency?: boolean;
    neighborhoods?: string[];

    // Amenities: each true = require, false = ignore (no exclude).
    parking?: boolean;
    elevator?: boolean;
    balcony?: boolean;
    airCondition?: boolean;     // mapped to airConditioner on Yad2
    warehouse?: boolean;        // storage room
    accessibility?: boolean;    // handicap accessible
    furniture?: boolean;        // furnished
    renovated?: boolean;
    shelter?: boolean;          // ממ"ד / safe room
    bars?: boolean;             // window bars (security grilles)
    pets?: boolean;             // pet-friendly
    imageOnly?: boolean;        // only listings with photos
    priceOnly?: boolean;        // only listings with visible price
    priceDropped?: boolean;     // recently price-reduced

    // Free-text keyword filters applied to listing's title/description/tags.
    includeKeywords?: string[];
    excludeKeywords?: string[];
}

// Soft preferences — used to score listings, not to filter them out.
// Each weight 0-10 (default 5). Higher = more important for ranking.
export interface Preferences {
    idealPrice?: number;
    idealSqm?: number;
    idealRooms?: number;
    idealFloor?: number;
    weightPrice?: number;
    weightSqm?: number;
    weightRooms?: number;
    weightFloor?: number;
    weightAgencyFee?: number;       // bigger weight = stronger preference for ללא תיווך
    // Feature weights — 0=ignore, higher=prefer-listings-with-it
    weightParking?: number;
    weightElevator?: number;
    weightBalcony?: number;
    weightAirCondition?: number;
    weightFurniture?: number;
    weightShelter?: number;
    weightWarehouse?: number;
    weightRenovated?: number;
    weightPets?: number;
    weightImage?: number;           // listings with photos rank higher
    weightFreshness?: number;       // newer listings rank higher
    weightLrt?: number;             // closer to a light-rail station ranks higher
}

export interface Listing {
    sourceId: string;
    token: string;
    link: string;
    city?: string;
    neighborhood?: string;
    street?: string;
    houseNumber?: number | string;
    floor?: number;
    rooms?: number;
    sqm?: number;
    price?: number;
    propertyType?: string;
    image?: string;
    images?: string[];
    isAgency?: boolean;
    // Owner/agent phone in international format e.g. "972509997448" — when source exposes it.
    phone?: string;
    lat?: number;
    lon?: number;
    tags?: string[];
    description?: string;
    // ISO timestamp of when the listing was posted on the source (best-effort).
    // Yad2 has no date field — derived from image upload timestamp embedded in URL.
    // Onmap has created_at directly.
    createdAt?: string;
    // Amenity flags — derived from tags/raw fields during normalization. true = has it,
    // false = explicitly absent (rare), undefined = unknown. Used for scoring + post-filter.
    hasParking?: boolean;
    hasElevator?: boolean;
    hasBalcony?: boolean;
    hasAirCondition?: boolean;
    hasFurniture?: boolean;
    hasShelter?: boolean;       // ממ"ד / מקלט
    hasWarehouse?: boolean;     // מחסן
    hasBars?: boolean;          // סורגים
    isRenovated?: boolean;
    petsAllowed?: boolean;
    raw?: unknown;
}

export interface Source {
    id: string;
    name: string;
    fetchListings(filters: FilterSpec): Promise<Listing[]>;
}
