import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PublicPageControls } from "@/components/PublicPageControls";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("authWizard");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10 dark:bg-transparent">
      <div className="theme-page-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-[var(--radius-md)] px-1 py-1 text-sm font-medium text-brand-muted transition-colors hover:text-brand-navy"
          >
            <ChevronLeft className="size-4 shrink-0" aria-hidden />
            {t("backToHome")}
          </Link>
          <PublicPageControls />
        </div>
        {children}
      </div>
    </div>
  );
}
