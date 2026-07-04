import { PublicPageControls } from "@/components/PublicPageControls";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { InterMunEmblem } from "@/components/InterMunEmblem";
import { getAppName } from "@/lib/branding";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("marketing");
  const appName = getAppName();

  return (
    <div className="relative min-h-screen bg-brand-cream text-brand-navy dark:bg-[var(--color-bg-page)]">
      <div className="theme-page-glow pointer-events-none absolute inset-0" aria-hidden />
      <header className="relative z-10 border-b border-[var(--hairline)] bg-[var(--material-thin)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <InterMunEmblem alt="" className="h-9 w-9 rounded-xl md:h-10 md:w-10" />
            <span className="truncate font-display text-sm font-semibold tracking-tight md:text-base">
              {appName}
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-brand-muted md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-brand-navy">
              {t("nav.howItWorks")}
            </a>
            <a href="#features" className="transition-colors hover:text-brand-navy">
              {t("nav.features")}
            </a>
            <a href="#about" className="transition-colors hover:text-brand-navy">
              {t("nav.about")}
            </a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden sm:block">
              <PublicPageControls />
            </div>
            <Link
              href="/login"
              className="mun-btn hidden rounded-full px-4 py-2 text-sm font-semibold sm:inline-flex"
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
