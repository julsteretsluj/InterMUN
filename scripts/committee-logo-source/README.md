# Committee logo sources (local only)

PNG files in this folder are **gitignored**. Do not commit third-party agency marks, conference brands you do not own, or other trademarked artwork.

## Setup

1. Add one PNG per committee, using filenames you define (e.g. `committee-a.png`, `security-council.png`).
2. Edit the `COMMITTEE_SOURCE` map in [`scripts/replace-committee-logos.mjs`](../replace-committee-logos.mjs) so each DB `committee` label points to your local filename.
3. Run a dry run, then apply:

   ```bash
   node scripts/replace-committee-logos.mjs
   node scripts/replace-committee-logos.mjs --apply
   ```

   Limit to specific committees:

   ```bash
   node scripts/replace-committee-logos.mjs --apply "Example Committee A"
   ```

## Example mapping (placeholder)

| Local file (you add) | Example `committee` label in database |
|----------------------|----------------------------------------|
| `committee-a.png` | Example Committee A |
| `committee-b.png` | Example Committee B |
| `committee-c.png` | Example Committee C |

Images should be square or near-square PNGs. The upload script knocks out dark matte backgrounds before pushing to the `committee-logos` Supabase bucket.

## In-app upload

Chairs and secretariat can also upload logos per committee in **SMT → Conference settings** without using this script.

## Licensing

You are responsible for ensuring each logo may be hosted for your conference. The open-source repository does not ship committee artwork.
