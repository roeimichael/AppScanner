-- appscanner — initial schema.
-- Run via `supabase db push` or paste into the SQL editor of a fresh project.
-- All tables are server-only (RLS disabled) — service_role key is the only credential the app uses.

-- Single-row settings (id always 1).
create table public.settings (
    id                      int primary key default 1,
    telegram_bot_token      text,
    telegram_chat_id        text,
    telegram_extra_chat_ids text[] not null default '{}',
    updated_at              timestamptz not null default now(),
    constraint settings_singleton check (id = 1)
);

create table public.searches (
    id                  uuid primary key default gen_random_uuid(),
    name                text not null,
    enabled             boolean not null default true,
    interval_minutes    int not null default 60,
    sources             text[] not null default '{}',
    filters             jsonb not null default '{}'::jsonb,
    preferences         jsonb,
    active_hours_start  int,
    active_hours_end    int,
    last_run_at         timestamptz,
    last_run_status     text,
    last_run_error      text,
    created_at          timestamptz not null default now()
);

create table public.seen_listings (
    search_id      uuid not null references public.searches(id) on delete cascade,
    source_id      text not null,
    token          text not null,
    first_seen_at  timestamptz not null,
    last_seen_at   timestamptz not null,
    snapshot       jsonb not null,
    price_history  jsonb not null default '[]'::jsonb,
    status         text not null default 'active',
    user_state     text,
    primary key (search_id, source_id, token)
);
create index seen_listings_lastseen_idx on public.seen_listings(last_seen_at desc);
create index seen_listings_status_idx   on public.seen_listings(status);

create table public.notifications (
    id              text primary key,
    search_id       uuid not null references public.searches(id) on delete cascade,
    listing_token   text not null,
    source_id       text not null,
    snapshot        jsonb not null,
    sent_at         timestamptz not null,
    channel         text not null,
    status          text not null,
    error           text,
    event_kind      text,
    old_price       int,
    new_price       int
);
create index notifications_sent_idx   on public.notifications(sent_at desc);
create index notifications_search_idx on public.notifications(search_id);

create table public.scan_runs (
    id           bigserial primary key,
    at           timestamptz not null,
    search_id    uuid not null references public.searches(id) on delete cascade,
    source_id    text not null,
    status       text not null,
    fetched      int not null default 0,
    new_count    int not null default 0,
    error        text,
    duration_ms  int
);
create index scan_runs_at_idx     on public.scan_runs(at desc);
create index scan_runs_search_idx on public.scan_runs(search_id);

-- Single-tenant: server-only access via service_role. Disable RLS.
alter table public.settings      disable row level security;
alter table public.searches      disable row level security;
alter table public.seen_listings disable row level security;
alter table public.notifications disable row level security;
alter table public.scan_runs     disable row level security;
