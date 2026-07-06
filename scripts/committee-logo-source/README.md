# Committee logo sources (local only)

PNG files and `manifest.json` in this folder are **gitignored**. The open-source repository does not redistribute SEAMUN I 2027 committee artwork; operators with rights to their assets keep them here.

## Setup

1. Add one PNG per committee (e.g. `disec.png`, `who.png`).
2. Copy the example manifest and edit for your conference:

   ```bash
   cp scripts/committee-logo-source/manifest.example.json \
      scripts/committee-logo-source/manifest.json
   ```

   **SEAMUN I 2027 operators:** use a local `manifest.json` mapping DB `committee` labels to your PNG filenames (see historical mapping in git history or your deployment notes).

3. Dry run, then apply:

   ```bash
   node scripts/replace-committee-logos.mjs
   node scripts/replace-committee-logos.mjs --apply
   node scripts/replace-committee-logos.mjs --apply DISEC
   ```

## Example manifest (`manifest.example.json`)

```json
{
  "Example Committee A": "committee-a.png",
  "Example Committee B": "committee-b.png"
}
```

Keys must match the `committee` column in `conferences` exactly.

## In-app upload

Chairs and secretariat can also upload logos per committee in **SMT → Conference settings** without using this script.

## Licensing

See [`public/ASSETS.md`](../../public/ASSETS.md). Committee PNGs are conference-specific and remain local unless you explicitly choose to distribute them under your own terms.
