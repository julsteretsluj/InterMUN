import Link from "next/link";
import { PublicPageControls } from "@/components/PublicPageControls";
import { getTranslations } from "next-intl/server";
import { MarketingOrbTrigger } from "@/components/marketing/MarketingOrbTrigger";
import { openingOrbUrl } from "@/lib/opening-orb";
import { getAppName } from "@/lib/branding";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("marketing");
  const appName = getAppName();

  return (
    <div className="marketing-shell relative min-h-screen text-brand-navy dark:bg-[var(--color-bg-page)]">
      <link rel="preload" href={openingOrbUrl(0)} as="image" />
      <header className="marketing-header relative z-10 border-b backdrop-blur-md">
        <div className="mun-marketing-rainbow-bar" aria-hidden />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 md:gap-3 md:px-5">
          <div className="flex shrink-0 items-center gap-2">
            <MarketingOrbTrigger emblemClassName="max-h-8 w-auto md:max-h-9" />
            <Link href="/" className="whitespace-nowrap font-display text-xs font-semibold tracking-tight md:text-sm">
              {appName}
            </Link>
          </div>
          <nav className="marketing-nav hidden shrink-0 items-center gap-0.5 md:flex lg:gap-1.5">
            <Link href="/#how-it-works">{t("nav.howItWorks")}</Link>
            <Link href="/features/chairs">{t("nav.chairs")}</Link>
            <Link href="/features/delegates">{t("nav.delegates")}</Link>
            <Link href="/features/secretariat">{t("nav.secretariat")}</Link>
            <Link href="/#contact">{t("nav.contact")}</Link>
          </nav>
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="marketing-header-controls hidden sm:block">
              <PublicPageControls compact />
            </div>
            <Link
              href="/login"
              className="mun-btn mun-btn-outline hidden rounded-full px-3 py-1.5 text-xs font-semibold sm:inline-flex"
            >
              {t("nav.signIn")}
            </Link>
            <Link href="/signup" className="mun-btn-primary rounded-full px-3 py-1.5 text-xs font-semibold">
              {t("nav.getStarted")}
            </Link>
          </div>
        </div>
        <div className="marketing-header-controls flex justify-end px-3 pb-2 sm:hidden">
          <PublicPageControls compact />
        </div>
      </header>
      <main className="relative z-10">{children}</main>
    </div>
  );
}
