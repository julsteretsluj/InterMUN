# InterMUN

**InterMUN** is an open-source Model United Nations conference platform for live committee sessions, delegate workflows, chair controls, and secretariat (SMT) operations. It is designed for multi-day conferences with allocation matrices, gated room access, real-time floor state, voting, resolutions, awards, and multilingual support.

## About

InterMUN replaces ad-hoc spreadsheets and messaging threads with a single web application: delegates prepare and participate in committee; chairs run speakers lists, motions, and roll call; secretariat configures conferences, allocations, and oversight tools. The project is maintained by **Intermun** and is offered under a dual license (see [License](#license)).

## Features

### Delegates
- Profile, pronouns, allocation, awards summary, stance heatmap
- Digital notes, delegation messaging, and moderation queues
- Documents, speeches, running notes, guides (RoP, templates)
- Resolutions workflow (clauses, co-submitters, signatories, blocs)
- Live session strip: dais announcements, speakers queue, roll-call status
- Committee room with voting (motions, amendments, resolutions)

### Chairs
- Session floor: timers, speakers queue, roll call, dais announcements
- Motion queue with Rules of Procedure priority
- Agenda votes, amendments, and resolution management
- Awards rubric and committee participation tracking
- Room codes and committee session controls

### Secretariat (SMT)
- Conference setup, allocation matrix import, gate codes
- Advisor and delegate oversight, delegation notes
- Event schedules, locked programme views, export tools
- Staff access controls and committee branding

### Platform
- **30+ locales** via `next-intl` with CI parity checks
- **Supabase** auth, Postgres, RLS, storage, and realtime
- **Role-based routing**: delegate, chair, advisor, SMT, admin
- **Three-gate access**: event gate → room gate → committee gate (where enabled)
- Accessibility: colorblind mode, dyslexia-friendly fonts, keyboard navigation

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Server Actions) |
| UI | React 19, Tailwind CSS 4, Lucide icons |
| Backend / data | [Supabase](https://supabase.com/) (Postgres, Auth, Storage, Realtime) |
| i18n | [next-intl](https://next-intl-docs.vercel.app/) |
| Email | Nodemailer (SMTP) for exports and inquiry relay |
| Deployment | [Vercel](https://vercel.com/) (recommended) |
| Validation | Zod, React Hook Form |

## Installation

### Prerequisites

- Node.js 20+
- npm
- A Supabase project
- (Optional) SMTP credentials for email features

### Steps

1. **Clone and install**

   ```bash
   git clone https://github.com/your-org/intermun.git
   cd intermun
   npm install
   ```

2. **Environment**

   ```bash
   cp .env.example .env.local
   ```

   Fill in at minimum:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`)
   - `NEXT_PUBLIC_APP_URL`
   - `PARTNERSHIP_CONTACT_EMAIL` / `NEXT_PUBLIC_PARTNERSHIP_CONTACT_EMAIL` (marketing contact)

   See [`.env.example`](.env.example) for the full list. **Never commit `.env.local` or real secrets.**

3. **Database**

   - Create a [Supabase](https://supabase.com) project
   - Apply migrations in `supabase/migrations/` in order
   - Run `supabase/seed.sql` for baseline content
   - **Allocation matrix:** keep `data/allocation-matrix.xlsx` local (gitignored). Run `npm run seed:allocations`, then apply `supabase/seed_allocation_matrix.sql` in the SQL editor

4. **Storage buckets** (profile pictures, committee logos)

   Apply the relevant migrations under `supabase/migrations/` (e.g. `00100_profile_pictures_storage_bucket.sql`, `00037_committee_logos_upload.sql`) or create buckets with matching RLS policies.

5. **Run locally**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

6. **Production build**

   ```bash
   npm run build
   npm start
   ```

   The build script uses `--webpack` for compatibility on some environments.

## Usage

### Roles

| Role | Typical entry |
|------|----------------|
| `delegate` | `/delegate` after allocation and gates |
| `chair` | `/chair` |
| `advisor` | `/advisor` |
| `smt` | `/smt` (secretariat surface) |
| `admin` | `/admin` |

### Conference day flow

1. **Pre-provision delegates** — Supabase Auth invite or admin invite scripts (`npm run invite:smt`)
2. **Link allocations** — Set `user_id` on allocation rows for each delegate
3. **Share gate codes** — Event code → room code → committee password (if enabled)
4. **Chair** — Initialize roll call, run session floor, open votes
5. **Delegates** — Join committee, request to speak, vote, submit resolutions

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm run i18n:check` | Locale key parity (CI) |
| `npm run i18n:audit` | Full i18n audit |
| `npm run seed:allocations` | Regenerate allocation SQL from local XLSX |

### Project structure

```
app/
  (marketing)/     Public site, features, contact
  (auth)/          Login, signup
  (dashboard)/     Delegate & chair dashboards
  smt/             Secretariat tools
  actions/         Server Actions (mutations)
components/        UI by domain (chair, delegate, marketing, …)
lib/               Business logic, Supabase clients, i18n helpers
messages/          Translation JSON (en.json is source of truth)
supabase/          Migrations and seeds
types/             Shared TypeScript types (e.g. database)
```

Architecture decisions and data-flow notes are recorded in [DEVELOPMENT_JOURNAL.md](DEVELOPMENT_JOURNAL.md).

## Contributing

We welcome contributions under the [Developer Certificate of Origin (DCO)](CONTRIBUTING.md). Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. All commits must include `Signed-off-by` (`git commit -s`).

## License

InterMUN uses a **dual-licensing model**:

| Use | License |
|-----|---------|
| **Non-commercial** | [Apache License 2.0](LICENSE) |
| **Commercial** | [Contact required](COMMERCIAL_LICENSE.md) — prior written approval from Intermun |

Commercial use includes paid hosting, white-label resale, and for-profit production deployment without a separate agreement. See [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md) for details.

Custom deployments may be governed by [CUSTOM_DEVELOPMENT_AGREEMENT.md](CUSTOM_DEVELOPMENT_AGREEMENT.md) (template).

## Contact & partnership

- **Partnership, commercial licensing, and custom conferences:** set `PARTNERSHIP_CONTACT_EMAIL` in your deployment or use the inquiry form on the marketing site (`/#contact`).
- **Open-source questions:** open a GitHub issue or discussion.
- **Security:** report vulnerabilities privately to the partnership contact — do not file public issues.

For branded setups, training, and secretariat onboarding, see [CUSTOM_DEVELOPMENT_AGREEMENT.md](CUSTOM_DEVELOPMENT_AGREEMENT.md).

---

Copyright © 2026 Intermun. Licensed under Apache 2.0 for non-commercial use; see [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md).
