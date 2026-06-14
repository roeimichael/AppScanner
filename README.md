<h1 align="center">appscanner</h1>

<p align="center">
  <b>Find your next apartment in Israel before everyone else does.</b><br/>
  Scans Yad2 + Onmap every 15 minutes. Telegrams you the moment a new listing matches your spec — with a one-tap WhatsApp link to the owner and a market-fit score.
</p>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" /></a>
  <a href="https://supabase.com"><img src="https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white" /></a>
  <a href="https://vercel.com"><img src="https://img.shields.io/badge/Vercel-deployed-black?logo=vercel" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" /></a>
</p>

<p align="center">
  <img src="docs/frontpage.png" alt="appscanner dashboard" />
</p>

## Why

The Israeli rental market moves fast. A good listing in a tight neighborhood is gone within hours. Refreshing Yad2 manually doesn't scale and the official saved-search emails are slow and noisy.

**appscanner** runs the search for you on a 15-minute cadence and only pings when something *actually* new appears that matches your spec. It also tells you whether the apartment is a deal compared to the local market.

## Features

- 📡 **Two sources, one feed** — Yad2 (via a proxy to bypass anti-bot) and Onmap, deduped to a single stream
- 🎯 **Sharp filters** — neighborhoods, rooms, price, square meters, floor, amenities, agency/private
- 📍 **Smart geo-fallback** — when a listing's neighborhood field is empty, coordinates are reverse-geocoded so you don't miss it
- 📊 **Market-fit score** — ranks every listing 0–100 against your ideal price / size / floor / amenities, with explainable factor breakdown
- 💸 **₪/m² vs city mean** — every alert tells you if the listing is cheap (top 25%) or pricey (bottom 25%) for the city
- 🔥 **Hot-deal flag** — private listings priced ≥10% below city mean get highlighted
- 📲 **Telegram alerts** — one message per listing with photo, address, owner phone (where available), prefilled WhatsApp link, and source-deep-link
- 👥 **Multi-chat fan-out** — DM yourself + share a group chat for collaborative hunting
- 🌙 **Active hours** — pause overnight, scan during the day
- 🗺️ **Web dashboard** — searches, optimal ranking, map with clustering, activity charts
- 👥 **Shared tracker** — collaborative tab for 2-3 roommates: shortlist apartments from any source, track status (interested → contacted → visited → signed), assign who's reaching out, leave notes

## Quickstart

You need: **Node 20+**, a free **Supabase** project, a **Telegram bot** ([@BotFather](https://t.me/BotFather) → `/newbot`), and optionally a free **ScraperAPI** key for Yad2.

```bash
git clone https://github.com/roeimichael/appscanner.git
cd appscanner
npm install
cp .env.local.example .env.local   # then fill it in
```

Apply the schema to your Supabase project (paste both files into the SQL editor, in order):

```bash
supabase/migrations/0001_init_appscanner_schema.sql
supabase/migrations/0002_tracker.sql
```

Run it:

```bash
npm run dev
# open http://localhost:3000
```

Open `/settings`, save your Telegram bot token + chat id, then `/searches/new` to create your first search.

## Self-host on Vercel + Supabase

Free tier on both is plenty.

```bash
vercel link
vercel env add SUPABASE_URL              production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add SCRAPERAPI_KEY            production   # optional
vercel env add CRON_SECRET               production
vercel env add ROOMMATES                 production   # comma-separated names for tracker tab
vercel deploy --prod
```

Vercel Hobby cron caps at one fire/day, so the live trigger runs from Supabase:

```sql
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

select cron.schedule('appscanner-scan-15min', '*/15 * * * *', $cron$
  select net.http_post(
    url := 'https://YOUR-DEPLOYMENT.vercel.app/api/scan',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET'),
    body := '{}'::jsonb
  );
$cron$);
```

After your first deploy, hit `/api/scan?force=1&bootstrap=1` once — it backfills the dedup state silently so you don't get a flood of "new!" pings for every listing already on the market.

## Sample Telegram alert

```
🔥 6,800 ₪ (hot deal) — פתח תקווה
   הדר המושבות • Krause 12
   4 rooms • 95 sqm • floor 3
   📊 ₪72/sqm — 14% below avg, top 25% (cheap)
   👤 ללא תיווך (private)
   🛗 מעלית • 🌿 מרפסת • 🚗 חניה • 🛡️ ממ"ד
   📞 050-XXX-XXXX → WhatsApp
   🔗 View on Onmap
```

## Tech

Next.js 16 · TypeScript · Tailwind 4 · shadcn/ui · Supabase Postgres (with `pg_cron`) · Vercel · Leaflet · ScraperAPI · OSM Nominatim · Telegram Bot API

## Caveats

- Yad2 hides owner phones behind an authenticated reveal — only the source-deep-link gets sent for Yad2 listings. Onmap exposes phones freely.
- ScraperAPI free tier covers ~5000 reqs/month; default cadence + active-hours stays well under that.
- Designed around the Israeli market — Hebrew neighborhood names, ₪ currency, IL phone format.

## License

MIT — see [LICENSE](LICENSE). Use it, fork it, swap in your own city.
