// Curated hunting-spot suggestions, shown on /links as one-click "+ Add" chips for
// anything not already saved. Covers the focus cities (see lib/focus-cities.ts) plus
// the main Israeli private-owner sites. Adding writes through the normal /api/links POST,
// so no migration/seed is needed — the user picks what they want.

export type LinkKind = 'fb_group' | 'marketplace' | 'site' | 'other';

export interface LinkSuggestion {
    name: string;
    url: string;
    kind: LinkKind;
    note?: string;
}

const fbGroups = (q: string) => `https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(q)}`;

export const LINK_SUGGESTIONS: LinkSuggestion[] = [
    // Facebook groups — one search per focus city
    { name: 'FB groups — דירות להשכרה תל אביב', url: fbGroups('דירות להשכרה תל אביב'), kind: 'fb_group' },
    { name: 'FB groups — דירות להשכרה רמת גן', url: fbGroups('דירות להשכרה רמת גן'), kind: 'fb_group' },
    { name: 'FB groups — דירות להשכרה גבעתיים', url: fbGroups('דירות להשכרה גבעתיים'), kind: 'fb_group' },
    { name: 'FB groups — דירות להשכרה הרצליה', url: fbGroups('דירות להשכרה הרצליה'), kind: 'fb_group' },
    { name: 'FB groups — דירות להשכרה פתח תקווה', url: fbGroups('דירות להשכרה פתח תקווה'), kind: 'fb_group' },
    { name: 'FB groups — שותפים תל אביב', url: fbGroups('שותפים תל אביב'), kind: 'fb_group', note: 'Roommate listings' },

    // Marketplaces
    { name: 'FB Marketplace — property rentals', url: 'https://www.facebook.com/marketplace/category/propertyrentals/', kind: 'marketplace', note: 'Set location after opening' },

    // Sites / aggregators (private-owner friendly)
    { name: 'Madlan', url: 'https://www.madlan.co.il', kind: 'site', note: 'Listings + neighborhood data' },
    { name: 'WinWin', url: 'https://www.winwin.co.il', kind: 'site' },
    { name: 'Komo', url: 'https://www.komo.co.il', kind: 'site' },
    { name: 'Homeless', url: 'https://www.homeless.co.il', kind: 'site', note: 'Private-owner heavy' },
    { name: 'Yad2 — rentals', url: 'https://www.yad2.co.il/realestate/rent', kind: 'site' },
];
