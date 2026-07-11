import { PublicPageControls } from "@/components/PublicPageControls";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { MarketingOpening } from "@/components/marketing/MarketingOpening";
import { AppleLayoutWrapper } from "@/components/ui/AppleAppShell";
import { getAppName } from "@/lib/branding";
import { openingOrbUrl } from "@/lib/opening-orb";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("authWizard");
  const appName = getAppName();

  return (
    <MarketingOpening>
      <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-10">
        <link rel="preload" href={openingOrbUrl(0)} as="image" />
        <div className="theme-page-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative w-full max-w-5xl space-y-6">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="mun-apple-btn mun-apple-btn-plain-blue inline-flex items-center gap-1 !px-0 text-sm"
            >
              <ChevronLeft className="size-4 shrink-0" aria-hidden />
              {t("backToHome")}
            </Link>
            <PublicPageControls />
          </div>
          <AppleLayoutWrapper appName={appName} mode="chrome" title={appName}>
            {children}
          </AppleLayoutWrapper>
        </div>
      </div>
    </MarketingOpening>
  );
}
