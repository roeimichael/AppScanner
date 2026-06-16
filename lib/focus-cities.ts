// The cities this app is tuned for. Curated (not all of Israel) because each one needs
// a map center + light-rail context loaded. `hasLrt` = the operational Red Line actually
// stops in the city (see lib/lrt.ts). Givatayim/Herzliya have no operational LRT yet.

export interface FocusCity {
    cityId: number;
    name: string;     // English label
    hebrew: string;
    lat: number;      // city center for map recentring
    lon: number;
    hasLrt: boolean;
}

export const FOCUS_CITIES: FocusCity[] = [
    { cityId: 5000, name: 'Tel Aviv-Yafo', hebrew: 'תל אביב יפו', lat: 32.087667, lon: 34.797374, hasLrt: true },
    { cityId: 8600, name: 'Ramat Gan',     hebrew: 'רמת גן',      lat: 32.070094, lon: 34.828384, hasLrt: true },
    { cityId: 6300, name: 'Givatayim',     hebrew: 'גבעתיים',     lat: 32.070129, lon: 34.809427, hasLrt: false },
    { cityId: 6400, name: 'Herzliya',      hebrew: 'הרצליה',      lat: 32.173883, lon: 34.827975, hasLrt: false },
    { cityId: 7900, name: 'Petah Tikva',   hebrew: 'פתח תקווה',   lat: 32.095493, lon: 34.883125, hasLrt: true },
];

export const focusCityById = (id?: number): FocusCity | undefined =>
    id == null ? undefined : FOCUS_CITIES.find(c => c.cityId === id);
