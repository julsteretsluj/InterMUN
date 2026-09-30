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
            <p className="clicky-kaomoji clicky-on-band-faint">^ ω ^</p>
            <h1 className="case-preserve mt-6 text-4xl font-bold tracking-[-0.04em]">
              {appName}
            </h1>
            <p className="clicky-on-band-soft mt-4 max-w-sm text-[1.05rem] leading-relaxed">{tagline}</p>
            <ul className="clicky-on-band-soft mt-10 space-y-3 text-sm lowercase">
              <li>live session floor</li>
              <li>delegate prep workspace</li>
              <li>secretariat oversight</li>
            </ul>
          </div>
          <p className="clicky-on-band-faint relative z-[1] max-w-sm text-sm leading-relaxed">
            we believe conference weekends fail on interface, not diplomacy. this is the calm desk for
            chairs and the clear backpack for delegates.
          </p>
        </aside>

        <section className="mun-clicky-auth-form">
          <div className="mun-clicky-auth-chrome mb-6 flex max-w-md items-center justify-between gap-3 self-center w-full mx-auto">
            <Link
              href="/"
              className="mun-clicky-auth-chrome-link text-sm font-medium lowercase transition"
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
