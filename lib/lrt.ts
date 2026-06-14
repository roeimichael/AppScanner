// Tel Aviv Light Rail — Red Line stations serving Petah Tikva (operational since Aug 2023).
// Station coordinates from OpenStreetMap; ordered list cross-checked with Wikipedia / NTA.
// Used to score + display each listing's walking distance to the nearest station.
//
// Only the OPERATIONAL Red Line trunk (Jabotinsky, Petah Tikva → Bnei Brak) is included.
// Green Line stations in northern PT (Kiryat Aryeh / Em HaMoshavot / Segula) are still
// under construction (~2028) so they are deliberately excluded — distance to a station
// that doesn't carry passengers yet would be misleading.

export interface LrtStation {
    name: string;
    lat: number;
    lon: number;
}

// North-east (Petah Tikva CBS terminus) → south-west (into Bnei Brak), in track order.
export const RED_LINE_STATIONS: LrtStation[] = [
    { name: 'Petah Tikva CBS', lat: 32.09465, lon: 34.88639 },
    { name: 'Pinsker',         lat: 32.09374, lon: 34.88212 },
    { name: 'Krol',            lat: 32.09191, lon: 34.87751 },
    { name: 'Dankner',         lat: 32.09095, lon: 34.87238 },
    { name: 'Beilinson',       lat: 32.09146, lon: 34.86675 },
    { name: 'Shaham',          lat: 32.09194, lon: 34.86140 },
    { name: 'Shenkar',         lat: 32.09266, lon: 34.85330 },
    { name: 'Aharonovich',     lat: 32.09271, lon: 34.83813 },
    { name: 'Ben Gurion',      lat: 32.09092, lon: 34.82339 },
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
