# InterMUN - Model United Nations Platform

A full-featured MUN platform built with Next.js and Supabase.

## Features

- **Profile** – Name, pronouns, allocation, profile picture (visibility rules for chairs/SMT), conferences attended, awards, stance heatmap
- **Chats/Notes** – Digital notes, live voting (motions, amendments, resolutions) with MUST/CAN vote, majority display, pass/fail
- **Guides** – RoP, examples, templates, chair report
- **Documents** – Position papers, prep documents
- **Stances** – Notes per allocation, stance heatmap (“to what extent does ___”)
- **Ideas** – Resolution ideas
- **Sources** – Trusted source links
- **Resolutions** – Google Docs link, main/co-submitters, signatories (virtual sign notifies main subs), blocs (A/B, for/against)
- **Speeches** – Write and store speeches
- **Running Notes** – General notes
- **Report** – AI use, inappropriate conduct (RoP)
- **Timers** – Current/next speaker, time left
- **Paper Saved Widget** – Saved papers quick access

## Setup

1. **Clone and install**
   ```bash
   npm install
   ```

2. **Supabase**
   - Create a [Supabase](https://supabase.com) project
   - Run migrations: `supabase/migrations/00001_initial_schema.sql`
   - Optionally run seed: `supabase/seed.sql`
   - Copy `.env.local.example` to `.env.local` and add:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
     ```

3. **Run**
   ```bash
   npm run dev
   ```

4. **Build** (use webpack if Turbopack has issues on network volumes)
   ```bash
   npm run build
   ```
   The build script uses `--webpack` for compatibility.

## Project structure

```
app/
  (auth)/login, signup
  (dashboard)/layout.tsx   # Tabs + Paper Saved widget + Timers
  (dashboard)/profile, chats-notes, guides, documents, stances,
  ideas, sources, resolutions, speeches, running-notes, report
components/
  profile, voting, timers, resolutions, guides, documents, ...
lib/
  supabase/client, server, middleware
supabase/
  migrations/
  seed.sql
```

## Roles

- **delegate** – Default role
- **chair** – Can manage vote items, allocations, timers; sees all profiles
- **smt** – Same visibility as chair
