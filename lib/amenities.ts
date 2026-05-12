// Hebrew/English keyword lookups to detect amenities from listing tags + descriptions.
// Used during source normalization to set Listing.has* flags consistently across sources.

interface AmenityRule {
    flag: string;
    patterns: RegExp[];
}

// Order matters when patterns overlap — first match wins.
const RULES: AmenityRule[] = [
    { flag: 'hasElevator', patterns: [/מעלית/, /\belevator\b/i] },
    { flag: 'hasParking', patterns: [/חניה/, /חנייה/, /\bparking\b/i] },
    { flag: 'hasBalcony', patterns: [/מרפסת/, /\bbalcon/i] },
    { flag: 'hasAirCondition', patterns: [/מיזוג/, /מזגן/, /מ"א/, /air ?cond/i] },
    { flag: 'hasFurniture', patterns: [/ריהוט/, /מרוהט/, /furnish/i] },
    { flag: 'hasShelter', patterns: [/ממ"ד/, /ממ״ד/, /מקלט/, /מרחב מוגן/, /shelter/i] },
    { flag: 'hasWarehouse', patterns: [/מחסן/, /\bstorage\b/i] },
    { flag: 'hasBars', patterns: [/סורגים/, /\bbars\b/i] },
    { flag: 'isRenovated', patterns: [/משופצת/, /משופץ/, /\brenovat/i] },
    { flag: 'petsAllowed', patterns: [/חיות מחמד/, /\bpets?\b/i] },
];

export const detectAmenities = (input: { tags?: string[]; description?: string; propertyType?: string }): Record<string, boolean> => {
    const haystack = [
        ...(input.tags ?? []),
        input.description ?? '',
        input.propertyType ?? '',
    ].join(' ');
    const out: Record<string, boolean> = {};
    for (const rule of RULES) {
        if (rule.patterns.some(p => p.test(haystack))) out[rule.flag] = true;
    }
    return out;
};
