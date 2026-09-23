import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PublicPageControls } from "@/components/PublicPageControls";
import { getAppName, getAppTagline } from "@/lib/branding";

type AppleGateLayoutProps = {
  children: React.ReactNode;
  title?: string;
};

export async function AppleGateLayout({ children }: AppleGateLayoutProps) {
  const t = await getTranslations("authWizard");
  const tagline = getAppTagline();
  const appName = getAppName();

  return (
    <div className="mun-clicky-auth">
      <aside className="mun-clicky-auth-brand">
        <div className="relative z-[1]">
          <p className="clicky-kaomoji text-white/40">^ ω ^</p>
          <h1 className="mt-6 text-4xl font-bold lowercase tracking-[-0.04em] text-[#f7f6f2]">
            {appName.toLowerCase()}
          </h1>
          <p className="mt-4 max-w-sm text-[1.05rem] leading-relaxed text-white/70">{tagline}</p>
        </div>
        <p className="relative z-[1] max-w-sm text-sm leading-relaxed text-white/40 lowercase">
          select your room, enter your codes, and step into session.
        </p>
      </aside>

      <section className="mun-clicky-auth-form">
        <div className="mb-6 flex max-w-md items-center justify-between gap-3 self-center w-full mx-auto">
          <Link
            href="/"
            className="text-sm font-medium lowercase text-[var(--clicky-ink-soft)] transition hover:text-[var(--clicky-ink)]"
          >
            ← {t("backToHome").toLowerCase()}
          </Link>
          <PublicPageControls compact />
        </div>
        <div className="mun-clicky-auth-card">{children}</div>
      </section>
    </div>
  );
}
