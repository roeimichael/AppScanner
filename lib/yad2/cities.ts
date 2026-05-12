// Israeli city catalog scraped from Yad2's address autocomplete + region empirically
// confirmed against the rent feed. ~60 cities — covers all major IL real-estate markets.
// `slug` is the kebab-case English slug used by Onmap; missing slug = Onmap source skips
// that city (Yad2 still works since it uses numeric id).

export interface CityEntry {
    id: number;        // Yad2 city ID
    name: string;      // Hebrew display name
    regionId: number;  // Yad2 region ID for the rent/forsale feed
    slug?: string;     // kebab-case slug for Onmap & similar sources
    lat?: number;      // city center, used for map fit/zoom
    lon?: number;
}

export const CITIES: CityEntry[] = [
    { id: 1020, name: 'אור עקיבא', regionId: 5, lat: 32.502116, lon: 34.921094 },
    { id: 1031, name: 'שדרות', regionId: 2, slug: 'sderot', lat: 31.531334, lon: 34.597692 },
    { id: 1034, name: 'קרית מלאכי', regionId: 2, lat: 31.729913, lon: 34.746205 },
    { id: 1061, name: 'נצרת עילית / נוף הגליל', regionId: 7, lat: 32.711164, lon: 35.332018 },
    { id: 1063, name: 'מעלות תרשיחא', regionId: 7, lat: 33.014412, lon: 35.277185 },
    { id: 1139, name: 'כרמיאל', regionId: 7, slug: 'karmiel', lat: 32.913544, lon: 35.305172 },
    { id: 1200, name: 'מודיעין מכבים רעות', regionId: 1, slug: 'modiin', lat: 31.903942, lon: 34.997349 },
    { id: 1309, name: 'אלעד', regionId: 1, lat: 32.051232, lon: 34.956226 },
    { id: 1336, name: 'אירוס', regionId: 1, lat: 31.929571, lon: 34.77623 },
    { id: 1376, name: 'באר גנים', regionId: 2, lat: 31.701147, lon: 34.609572 },
    { id: 2100, name: 'טירת כרמל', regionId: 5, lat: 32.766961, lon: 34.968193 },
    { id: 2200, name: 'דימונה', regionId: 2, slug: 'dimona', lat: 31.07059, lon: 35.027768 },
    { id: 2400, name: 'אור יהודה', regionId: 1, slug: 'or-yehuda', lat: 32.030067, lon: 34.851982 },
    { id: 2500, name: 'נשר', regionId: 5, lat: 32.771077, lon: 35.046069 },
    { id: 2560, name: 'ערד', regionId: 2, lat: 31.252215, lon: 35.216157 },
    { id: 2600, name: 'אילת', regionId: 2, slug: 'eilat', lat: 29.548378, lon: 34.942121 },
    { id: 2610, name: 'בית שמש', regionId: 6, slug: 'beit-shemesh', lat: 31.727156, lon: 34.982434 },
    { id: 2620, name: 'קרית אונו', regionId: 1, slug: 'kiryat-ono', lat: 32.051943, lon: 34.86053 },
    { id: 2630, name: 'קרית גת', regionId: 2, lat: 31.609437, lon: 34.775783 },
    { id: 2640, name: 'ראש העין', regionId: 1, slug: 'rosh-haayin', lat: 32.094224, lon: 34.963262 },
    { id: 2650, name: 'רמת השרון', regionId: 1, slug: 'ramat-hasharon', lat: 32.139021, lon: 34.840405 },
    { id: 2660, name: 'יבנה', regionId: 2, slug: 'yavne', lat: 31.873723, lon: 34.737426 },
    { id: 2800, name: 'קרית שמונה', regionId: 7, slug: 'kiryat-shmona', lat: 33.209304, lon: 35.581037 },
    { id: 3000, name: 'ירושלים', regionId: 6, slug: 'jerusalem', lat: 31.796243, lon: 35.207709 },
    { id: 3570, name: 'אריאל', regionId: 4, lat: 32.10442, lon: 35.189956 },
    { id: 3616, name: 'מעלה אדומים', regionId: 4, lat: 31.784711, lon: 35.318087 },
    { id: 3780, name: 'ביתר עילית', regionId: 4, lat: 31.698428, lon: 35.111067 },
    { id: 3797, name: 'מודיעין עילית', regionId: 4, lat: 31.93205, lon: 35.045535 },
    { id: 3823, name: 'גני מודיעין', regionId: 4, lat: 31.929239, lon: 35.016959 },
    { id: 4000, name: 'חיפה', regionId: 5, slug: 'haifa', lat: 32.800261, lon: 35.016589 },
    { id: 5000, name: 'תל אביב יפו', regionId: 3, slug: 'tel-aviv', lat: 32.087667, lon: 34.797374 },
    { id: 6100, name: 'בני ברק', regionId: 1, slug: 'bnei-brak', lat: 32.088786, lon: 34.835325 },
    { id: 6200, name: 'בת ים', regionId: 3, slug: 'bat-yam', lat: 32.013199, lon: 34.747733 },
    { id: 6300, name: 'גבעתיים', regionId: 3, slug: 'givatayim', lat: 32.070129, lon: 34.809427 },
    { id: 6400, name: 'הרצליה', regionId: 1, slug: 'herzliya', lat: 32.173883, lon: 34.827975 },
    { id: 6500, name: 'חדרה', regionId: 5, slug: 'hadera', lat: 32.437798, lon: 34.918227 },
    { id: 6600, name: 'חולון', regionId: 3, slug: 'holon', lat: 32.013439, lon: 34.784569 },
    { id: 6700, name: 'טבריה', regionId: 7, slug: 'tiberias', lat: 32.781147, lon: 35.529817 },
    { id: 6800, name: 'קרית אתא', regionId: 5, slug: 'kiryat-ata', lat: 32.804508, lon: 35.102205 },
    { id: 6900, name: 'כפר סבא', regionId: 1, slug: 'kfar-saba', lat: 32.179839, lon: 34.914525 },
    { id: 7000, name: 'לוד', regionId: 1, slug: 'lod', lat: 31.953588, lon: 34.894418 },
    { id: 7100, name: 'אשקלון', regionId: 2, slug: 'ashkelon', lat: 31.667026, lon: 34.572443 },
    { id: 7200, name: 'נס ציונה', regionId: 1, slug: 'nes-ziona', lat: 31.921362, lon: 34.79718 },
    { id: 7300, name: 'נצרת', regionId: 7, slug: 'nazareth', lat: 32.70215, lon: 35.292688 },
    { id: 7400, name: 'נתניה', regionId: 1, slug: 'netanya', lat: 32.304312, lon: 34.861099 },
    { id: 7600, name: 'עכו', regionId: 5, slug: 'akko', lat: 32.917378, lon: 35.088499 },
    { id: 7700, name: 'עפולה', regionId: 7, slug: 'afula', lat: 32.608309, lon: 35.30237 },
    { id: 7900, name: 'פתח תקווה', regionId: 1, slug: 'petah-tikva', lat: 32.095493, lon: 34.883125 },
    { id: 8000, name: 'צפת', regionId: 7, slug: 'tzfat', lat: 32.966568, lon: 35.507505 },
    { id: 8200, name: 'קרית מוצקין', regionId: 5, lat: 32.841573, lon: 35.081882 },
    { id: 8300, name: 'ראשון לציון', regionId: 1, slug: 'rishon-lezion', lat: 31.975913, lon: 34.788187 },
    { id: 8400, name: 'רחובות', regionId: 1, slug: 'rehovot', lat: 31.892696, lon: 34.802419 },
    { id: 8500, name: 'רמלה', regionId: 1, slug: 'ramla', lat: 31.926928, lon: 34.87062 },
    { id: 8600, name: 'רמת גן', regionId: 3, slug: 'ramat-gan', lat: 32.070094, lon: 34.828384 },
    { id: 8700, name: 'רעננה', regionId: 1, slug: 'raanana', lat: 32.187075, lon: 34.867709 },
    { id: 9000, name: 'באר שבע', regionId: 2, slug: 'beer-sheva', lat: 31.246687, lon: 34.792463 },
    { id: 9100, name: 'נהריה', regionId: 5, slug: 'nahariya', lat: 33.014687, lon: 35.100444 },
    { id: 9200, name: 'בית שאן', regionId: 7, lat: 32.50122, lon: 35.498703 },
    { id: 9400, name: 'יהוד מונוסון', regionId: 1, slug: 'yehud-monosson', lat: 32.032165, lon: 34.886977 },
    { id: 9500, name: 'קרית ביאליק', regionId: 5, lat: 32.856337, lon: 35.100188 },
    { id: 9600, name: 'קרית ים', regionId: 5, lat: 32.847685, lon: 35.072572 },
    { id: 9700, name: 'הוד השרון', regionId: 1, slug: 'hod-hasharon', lat: 32.149815, lon: 34.91127 },
];

// Map for nameEn-style lookup; auto-generated from slug.
const slugToEnglish = (s?: string) => s ? s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ') : undefined;

export const findCity = (id: number) => CITIES.find(c => c.id === id);
export const cityNameEn = (c: CityEntry) => slugToEnglish(c.slug) ?? c.name;
