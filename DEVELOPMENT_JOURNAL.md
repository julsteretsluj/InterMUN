# InterMUN Development Journal

This document records core architectural decisions, data flows, and infrastructure rationale for InterMUN. It establishes a **chain of custody** for human authorship and design intent as the project moves to open source.

**Maintainer:** Intermun  
**Last updated:** 2026-07-06

---

## 1. Product intent

InterMUN is a **live conference operations platform** for Model UN—not a generic CRUD app. Design priorities:

1. **Floor fidelity** — Chairs must control speakers, motions, and votes in real time; delegates must see authoritative state without refresh.
2. **Gate progression** — Event → room → committee mirrors physical conference access (codes, passwords, allocations).
3. **Role isolation** — Delegate, chair, advisor, SMT, and admin surfaces are separate routes with server-enforced role checks.
4. **i18n by default** — English is the source locale; 30+ locales ship with parity enforced in CI.

---

## 2. High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Vercel (edge + Node)                      │
│  Next.js App Router │ Server Actions │ API routes (cron)        │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   Supabase Auth      Supabase Postgres     Supabase Storage
   (JWT cookies)      (RLS policies)        (avatars, logos)
         │                   │
         └──────── Supabase Realtime ─────────┘
                    (committee synced state)
```

| Concern | Decision | Rationale |
|---------|----------|-----------|
| Framework | Next.js 16 App Router | Server Components for auth gates; Server Actions for mutations without a separate API layer |
| Database | Supabase Postgres | RLS for multi-tenant conference data; SQL migrations in-repo |
| Auth | Supabase Auth + cookie bridge | `@supabase/ssr` refreshes sessions in middleware |
| Hosting | Vercel | Native Next.js deployment, env secrets, cron for scheduled jobs |
| Styling | Tailwind 4 + design tokens | Figma-aligned glass/dark theme; marketing uses separate light islands |

---

## 3. Request lifecycle and session

1. **`proxy.ts`** (Next.js middleware entry) calls `updateSession` in `lib/supabase/middleware.ts`.
2. Middleware creates a Supabase server client bound to request/response cookies and calls `auth.getUser()` to refresh the session.
3. Middleware injects headers: `x-pathname`, `x-search`, `x-locale` for downstream Server Components.
4. **`lib/supabase/server.ts`** `createClient()` is used in layouts and Server Actions; missing env redirects to `/setup`.
5. **`lib/supabase/admin.ts`** uses `SUPABASE_SERVICE_ROLE_KEY` only on the server for invites, cron, and admin scripts—never exposed to the browser.

**Authorship note:** The three-client pattern (browser, server, admin) was chosen explicitly to keep the anon key in RLS-scoped contexts and reserve the service role for audited server-only paths.

---

## 4. Routing and role surfaces

| Route group | Audience | Guard |
|-------------|----------|-------|
| `app/(marketing)/` | Public | None |
| `app/(auth)/` | Login/signup | Redirect if already authed |
| `app/(dashboard)/` | Delegate, chair | `layout.tsx` checks `profiles.role`, active conference, gates |
| `app/smt/` | Secretariat | SMT role + dashboard surface cookie |
| `app/advisor/` | Faculty advisors | Advisor role |
| `app/admin/` | Platform admin | Admin role |

**Entry role wheel** (`lib/entry-role.ts`, `AuthEntryWizard`) stores a short-lived client preference; **provisioned `profiles.role` wins** after login (`lib/entry-role-redirect.ts`).

**Active conference** is resolved server-side (`lib/active-conference.ts`, cookies) so delegates always see the conference context selected by gates or SMT binding.

---

## 5. Three-gate access model

```
Login → Event gate (allocation / event code)
      → Room gate (committee room code)
      → Committee gate (password + allocation pick, optional)
      → Dashboard / session floor
```

| Gate | Implementation | Cookies / state |
|------|----------------|-----------------|
| Event | `app/actions/eventGate.ts`, `lib/allocation-code-gate-cookie.ts` | Event/allocation verification |
| Room | `app/actions/roomGate.ts`, `lib/committee-gate-cookie.ts` | Committee session selection |
| Committee | `app/actions/committeeGate.ts`, `lib/committee-password.ts` | Password hash on `conferences`; staff bypass via env-only `STAFF_COMMITTEE_BYPASS_PASSWORD` |

**Decision:** Gates are **cookie-backed** with server verification rather than URL tokens, so delegates can bookmark dashboard routes after passing gates without leaking codes in query strings.

---

## 6. Live session and realtime data flow

### Committee synced state

- Chairs mutate floor state (motion, speakers, timers) via Server Actions (`app/actions/committee-session.ts`, etc.).
- State keys are centralized in `lib/committee-synced-state-keys.ts`.
- Delegates subscribe via `lib/hooks/useCommitteeSyncedState.ts` (Supabase Realtime channels).

### Voting

- Vote items, ballots, and roll-call attendance live in Postgres with RLS scoped by `conference_id` / `committee`.
- `components/voting/VotingPanel.tsx` and chair agenda tabs read/write through Server Actions (`app/actions/amendments.ts`, resolutions actions).
- Majority labels respect procedure profiles (`lib/procedure-profiles.ts`, `lib/rop-required-majority.ts`).

### Motion queue

- Motions are ranked by disruptiveness / RoP priority (`lib/motion-disruptiveness.ts`).
- Chair UI (`ChairLiveFloor`, motion queue panels) reflects the same ordering as production session floor.

**Authorship note:** Realtime was chosen over polling to keep timer and speaker transitions sub-second during live debate; Postgres remains source of truth.

---

## 7. Supabase schema strategy

- Migrations are **sequential SQL files** under `supabase/migrations/` (numbered).
- `types/database.ts` mirrors generated Supabase types for compile-time safety.
- **RLS** enforces conference boundaries; chair/SMT policies use role helpers in SQL and mirrored TS checks in layouts.
- **Storage** buckets: `profile-pictures`, `committee-logos` with path-prefix policies per user/committee.

### Seed data

- `supabase/seed.sql` — guides, placeholder conference content.
- `supabase/seed_allocation_matrix.sql` — generated from local XLSX via `scripts/parse-allocation-matrix.py` (not committed with PII).

---

## 8. Vercel deployment

| Feature | Implementation |
|---------|----------------|
| Env vars | `NEXT_PUBLIC_*` for browser; secrets in Vercel project settings only |
| App URL | `lib/app-origin.ts` resolves `NEXT_PUBLIC_APP_URL` / `VERCEL_URL` for invite links |
| Cron | `app/api/cron/award-submissions/route.ts` secured with `CRON_SECRET` |
| Build | `next build --webpack` for stable builds on network filesystems |

**Decision:** Vercel is the reference deployment; the app remains portable to any Node host that provides the same env vars and cron endpoint.

---

## 9. Internationalization

- **Source locale:** `messages/en.json`
- **Runtime:** `next-intl` with locale cookie (`lib/i18n/locales.ts`)
- **CI:** `.github/workflows/i18n-quality.yml` runs `npm run i18n:check`
- **Committee/topics:** Dedicated label maps (`lib/i18n/committee-display-tags.ts`, agenda topic slugs)

**Authorship note:** Locale parity in CI was added after marketing and dashboard strings diverged; it is a release gate for open source.

---

## 10. Email and external integrations

| Integration | Module | Config |
|-------------|--------|--------|
| SMTP | `lib/smtp.ts` | `SMTP_*`, `MATERIALS_EXPORT_FROM` |
| Google Docs embed | `lib/google-docs-embed.ts` | Public doc URLs from user input |
| Google Slides (crisis) | `lib/google-slides-embed.ts` | Embed URLs |
| Inquiry form | `app/actions/conferenceInquiry.ts` | `PARTNERSHIP_CONTACT_EMAIL` |

No third-party analytics SDK is required for core operation.

---

## 11. Security and secrets (open-source hardening)

| Item | Status |
|------|--------|
| Supabase keys | Env-only via `.env.example` template |
| Staff committee bypass | **Disabled when `STAFF_COMMITTEE_BYPASS_PASSWORD` unset** (no hardcoded default) |
| Partnership email | Env-driven (`PARTNERSHIP_CONTACT_EMAIL`) |
| Cron endpoint | `CRON_SECRET` header validation |
| Allocation XLSX | Gitignored under `data/` |

Conference filter strings (e.g. `SECRETARIAT2027` in `lib/smt-conference-filters.ts`) are **public gate labels**, not credentials.

---

## 12. Marketing vs product UI

- Marketing routes use **preview components** (`components/marketing/*`) that mirror production chair/delegate/SMT UI without live Supabase writes.
- Product chrome follows the Figma system (dark glass, accent green `#1DB954`); marketing previews use light islands where needed for contrast (`marketing-preview-styles.ts`).

**Decision:** Previews are duplicated components—not screenshots—so open-source visitors see faithful UI without a seeded production database.

---

## 13. Notable domain modules

| Module | Responsibility |
|--------|----------------|
| `lib/speaker-queue.ts` | Speakers list ordering and timing |
| `lib/awards.ts`, `lib/award-*` | SEAMUN awards rubric and submissions |
| `lib/resolution-*.ts` | Clause presets, document structure |
| `lib/delegation-note-*` | Threaded notes and moderation |
| `lib/seamun-*` | Conference-specific schedules and presets (example deployment) |

---

## 14. Changelog of major decisions

| Date | Decision | Authors / context |
|------|----------|-------------------|
| 2025 | Adopt Next.js App Router + Supabase | Core stack selection for SSR auth and managed Postgres |
| 2025 | Server Actions over REST API | Reduce boilerplate; colocate mutations with UI |
| 2025–26 | Three-gate model | Match physical MUN access control |
| 2026 | i18n parity CI | Prevent locale drift across 30+ languages |
| 2026 | Marketing preview panels | Faithful OSS demos without production data |
| 2026 | Open-source dual license | Apache 2.0 non-commercial + commercial contact |
| 2026 | Env-only secrets audit | Remove hardcoded staff password and contact email |

---

## 15. How to extend this journal

When making architectural changes:

1. Add a dated entry to **§14 Changelog** with rationale.
2. Update the relevant section (routing, gates, realtime, etc.).
3. Reference the PR or issue number if applicable.

This file is intentional documentation of human design choices—not generated from code.
