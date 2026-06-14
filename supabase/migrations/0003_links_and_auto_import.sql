-- appscanner — links + auto-import.
-- Seeds `relevant_links` with public Israeli rental sources beyond yad2/onmap.
-- Adds `auto_imported` flag on tracked_apartments to distinguish scanner-fed
-- cards from manually pasted ones (auto-imported defaults to 'interested',
-- can be dragged to 'rejected' to dismiss).

alter table public.tracked_apartments
    add column if not exists auto_imported boolean not null default false;

create table public.relevant_links (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    url         text not null,
    kind        text not null default 'other'
                check (kind in ('fb_group','marketplace','site','other')),
    note        text,
    created_at  timestamptz not null default now()
);
alter table public.relevant_links disable row level security;

insert into public.relevant_links (name, url, kind, note) values
    ('FB Marketplace — Israel rentals', 'https://www.facebook.com/marketplace/category/propertyrentals/', 'marketplace', 'Filter by location after opening'),
    ('FB groups search — דירות להשכרה', 'https://www.facebook.com/groups/search/groups/?q=%D7%93%D7%99%D7%A8%D7%95%D7%AA%20%D7%9C%D7%94%D7%A9%D7%9B%D7%A8%D7%94', 'fb_group', 'Browse and join the relevant city group'),
    ('FB groups — דירות להשכרה תל אביב', 'https://www.facebook.com/groups/search/groups/?q=%D7%93%D7%99%D7%A8%D7%95%D7%AA%20%D7%9C%D7%94%D7%A9%D7%9B%D7%A8%D7%94%20%D7%AA%D7%9C%20%D7%90%D7%91%D7%99%D7%91', 'fb_group', null),
    ('FB groups — דירות להשכרה פתח תקווה', 'https://www.facebook.com/groups/search/groups/?q=%D7%93%D7%99%D7%A8%D7%95%D7%AA%20%D7%9C%D7%94%D7%A9%D7%9B%D7%A8%D7%94%20%D7%A4%D7%AA%D7%97%20%D7%AA%D7%A7%D7%95%D7%95%D7%94', 'fb_group', null),
    ('FB groups — שותפים בתל אביב', 'https://www.facebook.com/groups/search/groups/?q=%D7%A9%D7%95%D7%AA%D7%A4%D7%99%D7%9D%20%D7%AA%D7%9C%20%D7%90%D7%91%D7%99%D7%91', 'fb_group', 'For roommate listings'),
    ('Madlan', 'https://www.madlan.co.il', 'site', 'Property data + listings'),
    ('WinWin', 'https://www.winwin.co.il', 'site', null),
    ('Komo', 'https://www.komo.co.il', 'site', null),
    ('Homeless', 'https://www.homeless.co.il', 'site', 'Private-owner heavy');
