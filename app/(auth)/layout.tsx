import { PublicPageControls } from "@/components/PublicPageControls";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { MarketingOpening } from "@/components/marketing/MarketingOpening";
import { AppleAppFrame } from "@/components/ui/AppleAppShell";
import { AppleProductPage } from "@/components/ui/AppleProductPage";
import { AppleWindow } from "@/components/ui/AppleWindow";
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
      <AppleAppFrame appName={appName}>
        <AppleProductPage width="narrow" className="relative min-h-screen py-8 md:py-12">
          <link rel="preload" href={openingOrbUrl(0)} as="image" />
          <div className="theme-page-glow pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative space-y-6">
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/"
                className="mun-apple-btn mun-apple-btn-plain-blue inline-flex items-center gap-1 !px-0 text-sm"
              >
                <ChevronLeft className="size-4 shrink-0" aria-hidden />
                {t("backToHome")}
              </Link>
              <PublicPageControls compact />
            </div>
            <AppleWindow
              title={
                <Link href="/" className="text-inherit no-underline transition-opacity hover:opacity-75">
                  {appName}
                </Link>
              }
              showControls
              resizable={false}
              contentClassName="mun-apple-page-body p-4 md:p-6"
            >
              {children}
            </AppleWindow>
          </div>
        </AppleProductPage>
      </AppleAppFrame>
    </MarketingOpening>
  );
}
