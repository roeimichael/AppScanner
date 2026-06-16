// Catalog of where listings come from — drives the /sources page so the app's breadth
// (and roadmap) is visible. "Live" sources feed the scan pipeline; "considered" ones are
// evaluated-but-not-wired, with the honest reason why (from real endpoint probes).

export type SourceStatus = 'live' | 'needs-proxy' | 'html-possible' | 'needs-login' | 'manual-only';

export interface CatalogSource {
    id: string;
    name: string;
    url: string;
    status: SourceStatus;
    fetch: string;     // how the data is obtained
    cost: string;      // quota / $ implication
    data: string[];    // fields it yields
    color: string;     // brand tint (hex)
    blurb?: string;    // client-facing one-liner
    note?: string;     // internal/technical detail
}

// Scraped into the pipeline today — flow straight into Pool, Map, Telegram, scoring.
// `blurb` is the client-facing one-liner; `note` keeps the technical detail for internal use.
export const LIVE_SOURCES: CatalogSource[] = [
    {
        id: 'onmap', name: 'OnMap', url: 'https://www.onmap.co.il', status: 'live',
        fetch: 'Open JSON API', cost: 'Free',
        data: ['price', 'rooms', 'sqm', 'map', 'photos', 'phone'], color: '#2dd4bf',
        blurb: 'Live listings with photos and precise map locations.',
        note: 'Cleanest feed — public API returns structured data including map coordinates.',
    },
    {
        id: 'yad2', name: 'Yad2', url: 'https://www.yad2.co.il', status: 'live',
        fetch: 'ScraperAPI proxy', cost: 'Uses ScraperAPI quota',
        data: ['price', 'rooms', 'sqm', 'map', 'photos'], color: '#fb923c',
        blurb: "Israel's largest property board — the widest net.",
        note: 'Biggest IL board. Anti-bot, so fetched through ScraperAPI — each scan spends quota.',
    },
    {
        id: 'komo', name: 'Komo', url: 'https://www.komo.co.il', status: 'live',
        fetch: 'Server HTML + geocoding', cost: 'Free (no ScraperAPI)',
        data: ['price', 'rooms', 'sqm', 'map', 'photos'], color: '#f472b6',
        blurb: 'Extra private & agency listings, placed on the map by address.',
        note: 'Legacy board, parsed from HTML. Addresses are forward-geocoded during the scan (approximate).',
    },
];

// Evaluated but not wired — kept honest so the roadmap is clear (reasons from real probes).
export const CONSIDERED_SOURCES: CatalogSource[] = [
    {
        id: 'madlan', name: 'Madlan', url: 'https://www.madlan.co.il', status: 'needs-proxy',
        fetch: 'Edge-blocked (HTTP 403) → needs ScraperAPI', cost: 'Would add ScraperAPI quota',
        data: ['price', 'rooms', 'sqm', 'coords', 'photos'], color: '#818cf8',
        note: 'Rich structured data incl. coordinates, but blocks datacenter IPs. Viable via ScraperAPI at quota cost.',
    },
    {
        id: 'homeless', name: 'Homeless', url: 'https://www.homeless.co.il', status: 'needs-login',
        fetch: 'City-filtered results need login', cost: '—',
        data: ['price', 'rooms', 'sqm'], color: '#a78bfa',
        note: 'Adapter is stubbed but disabled — public URLs return cross-country promoted ads, not city results.',
    },
    {
        id: 'facebook', name: 'Facebook groups', url: 'https://www.facebook.com', status: 'manual-only',
        fetch: 'Login wall + anti-bot', cost: 'High ($ + account-ban risk)',
        data: ['free-text posts'], color: '#60a5fa',
        note: 'Where private owners post first, but automation is costly and fragile — use the curated Links instead.',
    },
];

export const STATUS_LABEL: Record<SourceStatus, string> = {
    'live': 'Live',
    'needs-proxy': 'Needs proxy',
    'html-possible': 'HTML only',
    'needs-login': 'Login-walled',
    'manual-only': 'Manual only',
};
