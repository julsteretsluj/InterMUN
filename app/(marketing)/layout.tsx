import Link from "next/link";
import { PublicPageControls } from "@/components/PublicPageControls";
import { MarketingMazeScript } from "@/components/marketing/MarketingMazeScript";
import { MarketingOrbTrigger } from "@/components/marketing/MarketingOrbTrigger";
import { MarketingPrimaryNav } from "@/components/marketing/MarketingPrimaryNav";
import { getAppName } from "@/lib/branding";
import { MarketingSiteFooter } from "@/components/marketing/MarketingSiteFooter";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const appName = getAppName();

  return (
    <div className="marketing-shell mun-apple-site relative min-h-screen">
      <MarketingMazeScript />
      <header className="marketing-header sticky top-0 z-30">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_auto] items-center gap-2 px-4 py-3 md:grid-cols-[auto_1fr_auto] md:gap-4 md:px-8">
          <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
            <MarketingOrbTrigger className="shrink-0" emblemClassName="max-h-8 w-auto md:max-h-9" />
            <Link
              href="/"
              className="marketing-header-brand case-preserve min-w-0 truncate text-base md:text-lg"
            >
              {appName}
            </Link>
          </div>
          <MarketingPrimaryNav />
          <div className="flex shrink-0 items-center justify-end gap-1.5 justify-self-end sm:gap-2">
            <PublicPageControls
              compact
              className="marketing-header-controls opacity-45 transition-opacity hover:opacity-100 focus-within:opacity-100"
            />
            <Link
              href="/login"
              className="clicky-pill clicky-pill-ghost !hidden !py-1.5 !text-xs sm:!inline-flex"
            >
              sign in
            </Link>
            <Link
              href="/signup"
              className="clicky-pill clicky-pill-primary !hidden !py-1.5 !text-xs sm:!inline-flex"
            >
              join your conference
            </Link>
          </div>
        </div>
      </header>
      <main className="relative z-10">{children}</main>
      <MarketingSiteFooter />
    </div>
  );
}
