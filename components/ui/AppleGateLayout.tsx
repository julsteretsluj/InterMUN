import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PublicPageControls } from "@/components/PublicPageControls";
import { getAppName, getAppTagline } from "@/lib/branding";

type AppleGateLayoutProps = {
  children: React.ReactNode;
  title?: string;
};

export async function AppleGateLayout({ children, title }: AppleGateLayoutProps) {
  const t = await getTranslations("authWizard");
  const appName = getAppName();
  const tagline = getAppTagline();

  return (
    <div className="mun-seamun-split min-h-screen">
      <aside className="mun-seamun-brand-panel">
        <div className="mun-seamun-brand-glow" aria-hidden />
        <div className="mun-seamun-brand-letter" aria-hidden>
          I
        </div>
        <div className="relative z-[1] flex flex-1 flex-col justify-between">
          <div>
            <p className="mun-seamun-eyebrow text-white/70">Est. 2026 — Conference platform</p>
            <h1 className="mun-seamun-brand-title mt-5 text-white">
              {typeof title === "string" ? title : appName}
            </h1>
            <p className="mt-4 max-w-sm text-[1.05rem] leading-relaxed text-white/75">{tagline}</p>
          </div>
          <p className="border-t border-white/15 pt-6 font-heading text-sm italic text-white/55">
            Select your room, enter your codes, and step into session.
          </p>
        </div>
      </aside>

      <section className="mun-seamun-form-panel">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-muted transition hover:text-brand-navy"
          >
            <ChevronLeft className="size-4 shrink-0" aria-hidden />
            {t("backToHome")}
          </Link>
          <PublicPageControls compact />
        </div>
        <div className="mun-seamun-form-card">{children}</div>
      </section>
    </div>
  );
}
