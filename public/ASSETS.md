# InterMUN & SEAMUN I 2027 — visual assets

**Copyright © 2026 Intermun.** Visual identity for the InterMUN platform and SEAMUN I 2027 conference artwork were created for Intermun / SEAMUN I 2027 and are not generic stock assets.

**Author:** Secretary-General, SEAMUN I 2027 (platform and conference visual creator).

This file records what ships in the open-source repository versus what operators keep locally.

---

## Bundled in the repository (Apache 2.0 non-commercial; see [COMMERCIAL_LICENSE.md](../COMMERCIAL_LICENSE.md))

| Asset | Path | Use |
|-------|------|-----|
| InterMUN emblem (dark) | `public/intermun-emblem.png` | Platform branding, favicon source |
| InterMUN emblem (light) | `public/intermun-emblem-light.png` | Light-mode branding |
| App icons | `app/icon.png`, `app/apple-icon.png` | Browser tab / PWA |
| Opening orb | `public/marketing/opening-orb.gif`, `.png` | Marketing / auth intro animation |
| Marketing hero laptop | `public/marketing/hero-laptop.png` | Landing hero accent beside headline |
| SEAMUN I 2027 conference mark | `public/seamun-i-2027-logo.png` | Dashboard when SEAMUN event is active |

These may be used with the InterMUN software under the project license. **SEAMUN I 2027 marks are for that conference context** — forks should not reuse them as their own conference brand without permission.

---

## Local only (gitignored — not redistributed)

| Asset | Location | Notes |
|-------|----------|-------|
| Committee chamber logos | `scripts/committee-logo-source/*.png` | SEAMUN I 2027 committee artwork; upload via script or SMT |
| Committee manifest | `scripts/committee-logo-source/manifest.json` | Maps DB `committee` labels → local PNG filenames |
| Allocation workbook | `data/allocation-matrix.xlsx` | May contain roster PII |

Template for other conferences: `scripts/committee-logo-source/manifest.example.json`.

---

## Third-party fonts

See [`public/fonts/LICENSES.md`](fonts/LICENSES.md). Bundled display fonts (Rijusans, Ithaca, Super Onigiri, Home Video) are not Intermun originals; follow each font’s license.

UI fonts Inter and Merriweather load via `next/font/google` (SIL OFL). Accessibility fonts load via `@fontsource/*` (OFL).

---

## Committee logo upload (operators)

1. Place licensed PNGs in `scripts/committee-logo-source/` (local).
2. Copy `manifest.example.json` → `manifest.json` and map labels to filenames (SEAMUN operators: restore the SEAMUN map locally).
3. Run `node scripts/replace-committee-logos.mjs --apply`, or upload per committee in **SMT → Conference settings**.

---

## Trademarks

“InterMUN”, “Intermun”, and SEAMUN I 2027 branding are not granted to third parties except as stated in [COMMERCIAL_LICENSE.md](../COMMERCIAL_LICENSE.md) or a separate written agreement.
