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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <MarketingOrbTrigger />
            <Link href="/" className="min-w-0 truncate font-display text-sm font-semibold tracking-tight md:text-base">
              {appName}
            </Link>
          </div>
          <nav className="marketing-nav hidden items-center gap-5 md:flex">
            <Link href="/#how-it-works">{t("nav.howItWorks")}</Link>
            <Link href="/features/chairs">{t("nav.chairs")}</Link>
            <Link href="/features/delegates">{t("nav.delegates")}</Link>
            <Link href="/features/secretariat">{t("nav.secretariat")}</Link>
            <Link href="/#contact">{t("nav.contact")}</Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden sm:block">
              <PublicPageControls />
            </div>
            <Link
              href="/login"
              className="mun-btn mun-btn-outline hidden rounded-full px-4 py-2 text-sm font-semibold sm:inline-flex"
            >
              {t("nav.signIn")}
            </Link>
            <Link href="/signup" className="mun-btn-primary rounded-full px-4 py-2 text-sm font-semibold">
              {t("nav.getStarted")}
            </Link>
          </div>
        </div>
        <div className="flex justify-end px-4 pb-3 sm:hidden">
          <PublicPageControls />
        </div>
      </header>
      <main className="relative z-10">{children}</main>
    </div>
  );
}
