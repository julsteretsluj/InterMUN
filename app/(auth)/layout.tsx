import { PublicPageControls } from "@/components/PublicPageControls";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MarketingOpening } from "@/components/marketing/MarketingOpening";
import { getAppName, getAppTagline } from "@/lib/branding";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("authWizard");
  const tagline = getAppTagline();
  const appName = getAppName();

  return (
    <MarketingOpening>
      <div className="mun-clicky-auth">
        <aside className="mun-clicky-auth-brand" aria-hidden={false}>
          <div className="relative z-[1]">
            <p className="clicky-kaomoji text-white/40">^ ω ^</p>
            <h1 className="case-preserve mt-6 text-4xl font-bold tracking-[-0.04em] text-[#f7f6f2]">
              {appName}
            </h1>
            <p className="mt-4 max-w-sm text-[1.05rem] leading-relaxed text-white/70">{tagline}</p>
            <ul className="mt-10 space-y-3 text-sm lowercase text-white/55">
              <li>live session floor</li>
              <li>delegate prep workspace</li>
              <li>secretariat oversight</li>
            </ul>
          </div>
          <p className="relative z-[1] max-w-sm text-sm leading-relaxed text-white/40">
            we believe conference weekends fail on interface, not diplomacy. this is the calm desk for
            chairs and the clear backpack for delegates.
          </p>
        </aside>

        <section className="mun-clicky-auth-form">
          <div className="mb-6 flex max-w-md items-center justify-between gap-3 self-center w-full mx-auto">
            <Link
              href="/"
              className="text-sm font-medium lowercase text-[var(--clicky-ink-soft)] transition hover:text-[var(--clicky-ink)]"
            >
              ← {t("backToHome").toLowerCase()}
            </Link>
            <PublicPageControls compact />
          </div>
          <div className="mun-clicky-auth-card">{children}</div>
        </section>
      </div>
    </MarketingOpening>
  );
}
