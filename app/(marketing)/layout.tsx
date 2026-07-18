import Link from "next/link";
import { PublicPageControls } from "@/components/PublicPageControls";
import { getTranslations } from "next-intl/server";
import { MarketingOrbTrigger } from "@/components/marketing/MarketingOrbTrigger";
import { openingOrbUrl } from "@/lib/opening-orb";
import { AppleLayoutWrapper } from "@/components/ui/AppleAppShell";
import { getAppName } from "@/lib/branding";

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
        <div className="marketing-header-inner mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-2 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-3 md:px-5">
          <div className="flex min-w-0 items-center gap-2 justify-self-start">
            <MarketingOrbTrigger emblemClassName="max-h-8 w-auto md:max-h-9" />
            <Link
              href="/"
              className="mun-apple-text mun-apple-text-headline marketing-header-brand whitespace-nowrap !mb-0 text-xs md:text-sm"
            >
              {appName}
            </Link>
          </div>
          <nav className="marketing-nav hidden items-center gap-0.5 justify-self-center md:flex lg:gap-1">
            <Link href="/#how-it-works">{t("nav.howItWorks")}</Link>
            <Link href="/features/chairs">{t("nav.chairs")}</Link>
            <Link href="/features/delegates">{t("nav.delegates")}</Link>
            <Link href="/features/secretariat">{t("nav.secretariat")}</Link>
            <Link href="/#contact">{t("nav.contact")}</Link>
          </nav>
          <div className="flex shrink-0 items-center justify-end gap-1.5 justify-self-end md:col-start-3">
            <PublicPageControls compact className="marketing-header-controls" />
            <Link href="/login" className="mun-apple-btn mun-apple-btn-glass-gray hidden text-xs sm:inline-flex">
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
    </div>
  );
}
