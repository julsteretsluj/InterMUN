import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AppleAppFrame } from "@/components/ui/AppleAppShell";
import { AppleProductPage } from "@/components/ui/AppleProductPage";
import { AppleWindow } from "@/components/ui/AppleWindow";
import { getAppName } from "@/lib/branding";

export default async function AllocationSignupLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("authWizard");
  const appName = getAppName();

  return (
    <AppleAppFrame appName={appName}>
      <AppleProductPage width="narrow" className="min-h-screen py-8 md:py-12">
        <div className="mb-4 flex items-center justify-start">
          <Link
            href="/"
            className="mun-apple-btn mun-apple-btn-plain-blue inline-flex items-center gap-1 !px-0 text-sm"
          >
            <ChevronLeft className="size-4 shrink-0" aria-hidden />
            {t("backToHome")}
          </Link>
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
      </AppleProductPage>
    </AppleAppFrame>
  );
}
