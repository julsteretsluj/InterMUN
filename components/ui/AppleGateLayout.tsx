import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { InterMunEmblem } from "@/components/InterMunEmblem";
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
          <InterMunEmblem alt="" className="max-h-14 w-auto" surface="dark" />
          <h1 className="case-preserve mt-6 text-4xl font-bold tracking-[-0.04em]">
            {appName}
          </h1>
          <p className="clicky-on-band-soft mt-4 max-w-sm text-[1.05rem] leading-relaxed">{tagline}</p>
        </div>
        <p className="clicky-on-band-faint relative z-[1] max-w-sm text-sm leading-relaxed lowercase">
          select your room, enter your codes, and step into session.
        </p>
      </aside>

      <section className="mun-clicky-auth-form">
        <div className="mun-clicky-auth-chrome mb-6 flex max-w-md items-center justify-between gap-3 self-center w-full mx-auto">
          <Link
            href="/"
            className="mun-clicky-auth-chrome-link text-sm font-medium lowercase transition"
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
