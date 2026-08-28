import Link from "next/link";
import { PublicPageControls } from "@/components/PublicPageControls";
import { getTranslations } from "next-intl/server";
import { MarketingClockSpline } from "@/components/marketing/MarketingClockSpline";
import { MarketingOrbTrigger } from "@/components/marketing/MarketingOrbTrigger";
import { openingOrbUrl } from "@/lib/opening-orb";
import { AppleLayoutWrapper } from "@/components/ui/AppleAppShell";
import { getAppName } from "@/lib/branding";
import { MarketingSiteFooter } from "@/components/marketing/MarketingSiteFooter";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("marketing");
  const appName = getAppName();

  return (
    <div className="marketing-shell mun-apple-site relative min-h-screen text-brand-navy">
      <link rel="preload" href={openingOrbUrl(0)} as="image" />
      <header className="marketing-header sticky top-0 z-30 border-b-0">
        <div className="mun-marketing-rainbow-bar" aria-hidden />
        {/* Side columns use `1fr` (min-content floor) so the controls can never overlap the
            centered nav; the nav only appears from lg, where all three columns actually fit. */}
        <div className="marketing-header-inner mx-auto grid max-w-[var(--content-max-width,82.5rem)] grid-cols-[1fr_auto] items-center gap-2 px-4 py-3 md:gap-4 md:px-8 lg:grid-cols-[1fr_auto_1fr]">
          {/* No justify-self-start: stretching lets the brand truncate inside a narrow column. */}
          <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
            <MarketingOrbTrigger emblemClassName="max-h-8 w-auto md:max-h-9" />
            <Link
              href="/"
              className="marketing-header-brand font-sans min-w-0 truncate !mb-0 text-sm font-semibold tracking-[-0.03em] md:text-base"
            >
              {appName}
            </Link>
          </div>
          <nav className="marketing-nav hidden items-center justify-self-center lg:flex lg:gap-2">
            <Link href="/about">About</Link>
            <Link href="/#how-it-works">{t("nav.howItWorks")}</Link>
            <Link href="/features/chairs">{t("nav.chairs")}</Link>
            <Link href="/features/delegates">{t("nav.delegates")}</Link>
            <Link href="/features/secretariat">{t("nav.secretariat")}</Link>
            <Link href="/#contact">{t("nav.contact")}</Link>
          </nav>
          <div className="flex shrink-0 items-center justify-end gap-2 justify-self-end lg:col-start-3">
            <PublicPageControls compact className="marketing-header-controls" />
            {/* !important variants: unlayered .mun-apple-btn display beats layered `hidden` in Tailwind v4. */}
            <Link href="/login" className="mun-apple-btn mun-apple-btn-glass-gray !hidden text-xs sm:!inline-flex">
              {t("nav.signIn")}
            </Link>
            <Link href="/signup" className="mun-apple-btn mun-apple-btn-filled-blue text-xs">
              {t("nav.getStarted")}
            </Link>
          </div>
        </div>
      </header>
      <main className="relative z-10">
        <AppleLayoutWrapper appName={appName} mode="minimal">
          {children}
        </AppleLayoutWrapper>
      </main>
      <MarketingClockSpline />
      <MarketingSiteFooter />
    </div>
  );
}
