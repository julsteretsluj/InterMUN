import { PublicPageControls } from "@/components/PublicPageControls";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { MarketingOpening } from "@/components/marketing/MarketingOpening";
import { getAppName, getAppTagline } from "@/lib/branding";
import { openingOrbUrl } from "@/lib/opening-orb";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("authWizard");
  const appName = getAppName();
  const tagline = getAppTagline();

  return (
    <MarketingOpening>
      <div className="mun-seamun-split min-h-screen">
        <link rel="preload" href={openingOrbUrl(0)} as="image" />
        <aside className="mun-seamun-brand-panel" aria-hidden={false}>
          <div className="mun-seamun-brand-glow" aria-hidden />
          <div className="mun-seamun-brand-letter" aria-hidden>
            I
          </div>
          <div className="relative z-[1] flex flex-1 flex-col justify-between">
            <div>
              <p className="mun-seamun-eyebrow text-white/70">Est. 2026 — Conference platform</p>
              <h1 className="mun-seamun-brand-title mt-5 text-white">{appName}</h1>
              <p className="mt-4 max-w-sm text-[1.05rem] leading-relaxed text-white/75">{tagline}</p>
              <ul className="mt-10 space-y-3 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-white/55">
                <li className="flex items-center gap-3">
                  <span className="h-px w-4 bg-white/40" aria-hidden />
                  Live session tools
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-px w-4 bg-white/40" aria-hidden />
                  Delegate prep workspace
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-px w-4 bg-white/40" aria-hidden />
                  Secretariat oversight
                </li>
              </ul>
            </div>
            <p className="border-t border-white/15 pt-6 font-heading text-sm italic text-white/55">
              “Diplomacy is the art of letting someone else have your way.”
            </p>
          </div>
        </aside>

        <section className="mun-seamun-form-panel">
          <div className="mb-8 flex items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--muted,#6a7d91)] transition hover:text-[var(--ink,#183148)]"
            >
              <ChevronLeft className="size-4 shrink-0" aria-hidden />
              {t("backToHome")}
            </Link>
            <PublicPageControls compact />
          </div>
          <div className="mun-seamun-form-card">{children}</div>
        </section>
      </div>
    </MarketingOpening>
  );
}
