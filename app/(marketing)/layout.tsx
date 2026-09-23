import Link from "next/link";
import { PublicPageControls } from "@/components/PublicPageControls";
import { getTranslations } from "next-intl/server";
import { MarketingMazeScript } from "@/components/marketing/MarketingMazeScript";
import { MarketingPrimaryNav } from "@/components/marketing/MarketingPrimaryNav";
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
    <div className="marketing-shell mun-apple-site relative min-h-screen">
      <MarketingMazeScript />
      <header className="marketing-header sticky top-0 z-30">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-2 px-4 py-3 md:grid-cols-[auto_1fr_auto] md:gap-4 md:px-8">
          <Link
            href="/"
            className="marketing-header-brand case-preserve min-w-0 truncate text-base md:text-lg"
          >
            {appName}
          </Link>
          <MarketingPrimaryNav />
          <div className="flex shrink-0 items-center justify-end gap-1.5 justify-self-end sm:gap-2">
            <PublicPageControls compact className="marketing-header-controls" />
            <Link href="/login" className="clicky-pill clicky-pill-ghost !hidden !py-1.5 !text-xs sm:!inline-flex">
              {t("nav.signIn").toLowerCase()}
            </Link>
            <Link href="/signup" className="clicky-pill clicky-pill-primary !py-1.5 !text-xs lowercase">
              {t("nav.getStarted").toLowerCase()}
            </Link>
          </div>
        </div>
      </header>
      <main className="relative z-10">{children}</main>
      <MarketingSiteFooter />
    </div>
  );
}
