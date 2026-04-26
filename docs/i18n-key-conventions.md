# i18n Key Conventions

Use this as the naming contract for all new translation keys.

## Namespace Rules

- `common.*`
  - Shared UI actions and neutral labels (`save`, `cancel`, `loading`, etc.)
- `views.<feature>.*`
  - Feature-level UI copy rendered by components/pages.
  - Example: `views.profile.saveProfile`
- `pageTitles.*`
  - Route/page titles and dashboard tab naming.
- `serverActions.<action>.*`
  - User-facing messages returned from server actions (`error`, `success`, validation).
  - Example: `serverActions.committeeGate.incorrectCommitteePassword`
- `emails.<template>.*`
  - Email subject/body/signature strings.

## Placeholder Rules (ICU)

- Keep placeholder names stable across all locales.
- Prefer semantic names over short names:
  - Good: `{conference}`, `{allocation}`, `{count}`
  - Avoid: `{x}`, `{v}`, `{n}`
- Do not translate placeholder identifiers.
- Use plural forms only when needed:
  - `{count, plural, one {...} other {...}}`

## Key Naming Style

- Use `camelCase` leaf keys.
- Keep keys intent-based, not implementation-based.
  - Good: `selectAllocation`
  - Avoid: `allocationDropdownPlaceholderText`
- Reuse existing keys before creating new ones.

## Translation Coverage Checklist

When updating UI, localize all user-facing copy:

- Visible labels, buttons, tabs, helper text
- Form placeholders and input titles
- `aria-label`, `aria-description`, `alt`, and tooltip text
- Empty states, confirm prompts, and toast/feedback messages
- Server-returned error/success messages
- Email subject and body content

## Workflow

1. Add/update keys in `messages/en.json`.
2. Mirror keys in every locale file under `messages/`.
3. Run:
   - `npm run i18n:check`
   - `npm run i18n:audit`
4. Fix parity, placeholders, and any new hardcoded findings before merge.
