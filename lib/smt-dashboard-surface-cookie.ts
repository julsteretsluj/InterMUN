import { cookies } from "next/headers";

export const SMT_DASHBOARD_SURFACE_COOKIE = "intermun_smt_dashboard_surface";

const MAX_AGE_SEC = 60 * 60 * 24 * 180; // 180 days

export type SmtDashboardSurface = "secretariat" | "chair" | "delegate";

export function parseSmtDashboardSurface(raw: string | undefined | null): SmtDashboardSurface {
  if (raw === "chair" || raw === "delegate") return raw;
  return "secretariat";
}

export async function getSmtDashboardSurface(): Promise<SmtDashboardSurface> {
  const jar = await cookies();
  return parseSmtDashboardSurface(jar.get(SMT_DASHBOARD_SURFACE_COOKIE)?.value);
}

export async function setSmtDashboardSurface(surface: SmtDashboardSurface) {
  const jar = await cookies();
  jar.set(SMT_DASHBOARD_SURFACE_COOKIE, surface, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function clearSmtDashboardSurface() {
  const jar = await cookies();
  jar.delete(SMT_DASHBOARD_SURFACE_COOKIE);
}
