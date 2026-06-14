-- appscanner — tracker schema.
-- Collaborative apartment-hunting workspace for 2-3 roommates sharing one deploy.
-- Adds: tracked_apartments (cards), tracker_notes (thread), target_neighborhoods.
-- All tables RLS-disabled — single-tenant via service_role like the rest of the app.

create table public.tracked_apartments (
    id              uuid primary key default gen_random_uuid(),
    source_id       text,                       -- yad2/onmap if imported from scan, null if manual
    token           text,                       -- listing token if imported
    url             text not null,              -- canonical link (any source: fb, whatsapp, etc.)
    title           text not null,
    price           int,
    rooms           numeric,
    sqm             int,
    address         text,
    neighborhood    text,
    city            text,
    image_url       text,
    snapshot        jsonb,                      -- frozen copy of scan snapshot if imported
    status          text not null default 'interested'
                    check (status in ('interested','contacted','scheduled','visited','rejected','signed')),
    assigned_to     text,                       -- roommate handling outreach (free text, matches ROOMMATES env)
    created_by      text,                       -- roommate who added it
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
create index tracked_apartments_status_idx  on public.tracked_apartments(status);
create index tracked_apartments_created_idx on public.tracked_apartments(created_at desc);
create unique index tracked_apartments_source_token_uq
    on public.tracked_apartments(source_id, token)
    where source_id is not null and token is not null;

create table public.tracker_notes (
    id              uuid primary key default gen_random_uuid(),
    apartment_id    uuid not null references public.tracked_apartments(id) on delete cascade,
    author          text not null,              -- roommate name
    body            text not null,
    created_at      timestamptz not null default now()
);
create index tracker_notes_apt_idx on public.tracker_notes(apartment_id, created_at);

create table public.target_neighborhoods (
    id              uuid primary key default gen_random_uuid(),
    name            text not null,
    city            text,
    note            text,
    created_at      timestamptz not null default now()
);

alter table public.tracked_apartments   disable row level security;
alter table public.tracker_notes        disable row level security;
alter table public.target_neighborhoods disable row level security;
