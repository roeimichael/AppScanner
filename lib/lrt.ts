// Tel Aviv Light Rail — full operational Red Line (opened Aug 2023): Petah Tikva → Bat Yam.
// Station coordinates from OpenStreetMap, ordered along the route (PT CBS terminus → Bat Yam).
// Used to score + display each listing's walking distance to the nearest station — works across
// Petah Tikva, Ramat Gan and Tel Aviv (the cities the Red Line actually passes through).
//
// Excludes the Green/Purple line stations still under construction (~2028) — distance to a
// station that doesn't carry passengers yet would be misleading.

export interface LrtStation {
    name: string;
    lat: number;
    lon: number;
}

export const RED_LINE_STATIONS: LrtStation[] = [
    { name: "Petah Tikva CBS", lat: 32.09465, lon: 34.88639 },
    { name: "Pinsker", lat: 32.09374, lon: 34.88212 },
    { name: "Krol", lat: 32.09191, lon: 34.87751 },
    { name: "Dankner", lat: 32.09095, lon: 34.87238 },
    { name: "Beilinson", lat: 32.09146, lon: 34.86675 },
    { name: "Shaham", lat: 32.09194, lon: 34.86140 },
    { name: "Shenkar", lat: 32.09266, lon: 34.85330 },
    { name: "Aharonovich", lat: 32.09271, lon: 34.83813 },
    { name: "Ben Gurion", lat: 32.09092, lon: 34.82339 },
    { name: "Bialik", lat: 32.08677, lon: 34.81205 },
    { name: "Abba Hillel", lat: 32.08285, lon: 34.80237 },
    { name: "Arlozoroff", lat: 32.08156, lon: 34.79651 },
    { name: "Shaul HaMelech", lat: 32.07692, lon: 34.79215 },
    { name: "Yehudit", lat: 32.07036, lon: 34.78861 },
    { name: "Carlebach", lat: 32.06559, lon: 34.78322 },
    { name: "Elifelet", lat: 32.05834, lon: 34.76277 },
    { name: "Shalma", lat: 32.05450, lon: 34.75952 },
    { name: "Bloomfield Stadium", lat: 32.05026, lon: 34.75895 },
    { name: "Ehrlich", lat: 32.04607, lon: 34.75836 },
    { name: "Isakov", lat: 32.04214, lon: 34.75708 },
    { name: "HaBesht", lat: 32.03872, lon: 34.75584 },
    { name: "Mahrozet", lat: 32.03358, lon: 34.75165 },
    { name: "HaAtzma'ut", lat: 32.02817, lon: 34.74897 },
    { name: "Rothschild", lat: 32.02673, lon: 34.74447 },
    { name: "Jabotinsky", lat: 32.02171, lon: 34.74322 },
    { name: "Balfour", lat: 32.01746, lon: 34.74473 },
    { name: "Binyamin", lat: 32.01641, lon: 34.74834 },
    { name: "Yoseftal", lat: 32.01539, lon: 34.75215 },
    { name: "Kaf Tet BeNovember", lat: 32.01083, lon: 34.75149 },
    { name: "HeAmal", lat: 32.00587, lon: 34.74899 },
    { name: "HaKomemiyut", lat: 32.00226, lon: 34.74675 },
];

const EARTH_R = 6371000; // metres
const rad = (d: number) => (d * Math.PI) / 180;

export const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const a =
        Math.sin(rad(lat2 - lat1) / 2) ** 2 +
        Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
    return 2 * EARTH_R * Math.asin(Math.sqrt(a));
};

// Average walking pace ≈ 80 m/min (5 km/h, straight-line — real routes run ~15-25% longer).
const WALK_M_PER_MIN = 80;

export interface NearestLrt {
    station: LrtStation;
    distanceM: number;
    walkMin: number;
}

// Nearest operational Red Line station to a coordinate, or null if no coords given.
export const nearestStation = (lat?: number, lon?: number): NearestLrt | null => {
    if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    let best: LrtStation | null = null;
    let bestD = Infinity;
    for (const s of RED_LINE_STATIONS) {
        const d = haversineMeters(lat, lon, s.lat, s.lon);
        if (d < bestD) { bestD = d; best = s; }
    }
    if (!best) return null;
    return { station: best, distanceM: Math.round(bestD), walkMin: Math.max(1, Math.round(bestD / WALK_M_PER_MIN)) };
};
