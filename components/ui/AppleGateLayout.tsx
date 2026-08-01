import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PublicPageControls } from "@/components/PublicPageControls";
import { AppleAppFrame } from "@/components/ui/AppleAppShell";
import { AppleProductPage } from "@/components/ui/AppleProductPage";
import { AppleWindow } from "@/components/ui/AppleWindow";
import { getAppName } from "@/lib/branding";

type AppleGateLayoutProps = {
  children: React.ReactNode;
  title?: string;
};

export async function AppleGateLayout({ children, title }: AppleGateLayoutProps) {
  const t = await getTranslations("authWizard");
  const appName = getAppName();

  return (
    <AppleAppFrame appName={appName}>
      <AppleProductPage width="narrow" className="min-h-screen bg-[var(--dashboard-cream)] py-10 md:py-16">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="mun-apple-btn mun-apple-btn-plain-blue inline-flex items-center gap-1 rounded-lg !px-2 text-sm transition-all duration-300 hover:-translate-x-0.5 hover:bg-white/70"
          >
            <ChevronLeft className="size-4 shrink-0" aria-hidden />
            {t("backToHome")}
          </Link>
          <PublicPageControls compact />
        </div>
        <AppleWindow
          title={
            title ?? (
              <Link href="/" className="text-inherit no-underline transition-opacity hover:opacity-75">
                {appName}
              </Link>
            )
          }
          showControls
          resizable={false}
          contentClassName="mun-apple-page-body bg-white p-6 md:p-8"
        >
          {children}
        </AppleWindow>
      </AppleProductPage>
    </AppleAppFrame>
  );
}
