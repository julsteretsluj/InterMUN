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
        <AppleProductPage width="narrow" className="relative min-h-screen bg-[var(--dashboard-cream)] py-10 md:py-16">
          <link rel="preload" href={openingOrbUrl(0)} as="image" />
          <div className="pointer-events-none absolute -left-10 top-24 h-40 w-40 rounded-[55%_45%_60%_40%] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] blur-3xl" aria-hidden />
          <div className="relative space-y-8">
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/"
                className="mun-apple-btn mun-apple-btn-plain-blue inline-flex items-center gap-1 !px-0 text-sm transition-all duration-300 hover:-translate-x-0.5"
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
              contentClassName="mun-apple-page-body bg-white p-6 md:p-8 rounded-b-[var(--radius-xl)]"
            >
              {children}
            </AppleWindow>
          </div>
        </AppleProductPage>
      </AppleAppFrame>
    </MarketingOpening>
  );
}
