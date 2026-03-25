/**
 * Public URL of this deployment (no trailing slash). Used for auth invite redirects.
 * Set NEXT_PUBLIC_APP_URL in env (e.g. https://mun.example.com) when not on Vercel.
 */
export function getServerAppOrigin(): string | null {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return null;
}
