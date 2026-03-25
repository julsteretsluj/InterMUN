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
- **Timers** – Current/next speaker, time left (per active committee, realtime)
- **Room code** – After login, delegates enter a short code to select the committee session; chairs set codes under **Room code**
- **Session floor** (chairs) – Timers, speakers queue, roll call, dais announcements; delegates see dais, queue, and their roll status in the header strip
- **Paper Saved Widget** – Saved papers quick access

## Setup

1. **Clone and install**
   ```bash
   npm install
   ```

2. **Supabase**
   - Create a [Supabase](https://supabase.com) project
   - Run migrations in `supabase/migrations/` in order (`00001` … `00005`)
   - Run `supabase/seed.sql` for guides (and optional placeholder conference)
   - **Allocation matrix:** replace `data/allocation-matrix.xlsx` if needed, run `npm run seed:allocations` to regenerate SQL, then run `supabase/seed_allocation_matrix.sql` in the SQL editor. That loads one conference per worksheet (ECOSOC, WHO, …), unassigned allocations, and per-row IDs as `allocation_gate_codes` (e.g. `ECO-001`). Re-running that file replaces only those matrix conferences’ allocations and codes.
3. **Pre-provisioning delegates (recommended for conference day)**
   - In Supabase **Authentication → Users**, use **Invite user** (or the Admin API `inviteUserByEmail`) so each delegate gets an email link instead of open self-signup.
   - After users exist, link them to allocations: in **Table Editor → allocations**, set `user_id` to the delegate’s profile UUID for their country row and `conference_id`. Chairs can also run **Session floor → Initialize roll call** once allocations exist.
   - Chairs set **Room code** per committee, then share that code at the dais. Delegates: sign in → **Join committee** (room code) → if enabled, **Committee sign-in** (password + allocation).

4. **Copy `.env.local.example` to `.env.local` and add:**
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
     ```

5. **Run**
   ```bash
   npm run dev
   ```

6. **Build** (use webpack if Turbopack has issues on network volumes)
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
  seed_allocation_matrix.sql   # generated; see npm run seed:allocations
data/
  allocation-matrix.xlsx       # committee allocation workbook
```

## Roles

- **delegate** – Default role
- **chair** – Can manage vote items, allocations, timers; sees all profiles
- **smt** – Same visibility as chair
