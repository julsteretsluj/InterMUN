import Link from "next/link";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import {
  Archive,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gavel,
  Globe2,
  LayoutDashboard,
  MessageSquare,
  Mic2,
  Newspaper,
  Shield,
  Timer,
  Users,
  Vote,
} from "lucide-react";
import { BrandWordmark } from "@/components/BrandWordmark";
import { INQUIRY_EMAIL } from "@/lib/branding";
import {
  MarketingChairMotionPreview,
  MarketingDelegatePrepPreview,
  MarketingHeroSessionPreview,
  MarketingSmtOversightPreview,
} from "@/components/marketing/MarketingInteractivePreviews";
import { cn } from "@/lib/utils";

type FeatureItem = {
  icon: ReactNode;
  title: string;
  description: string;
};

function FeatureGrid({ items, className }: { items: FeatureItem[]; className?: string }) {
  return (
    <ul className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <li
          key={item.title}
          className="mun-lift rounded-2xl border border-[var(--hairline)] bg-[var(--material-thick)] p-5 shadow-[var(--dashboard-shadow)]"
        >
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]">
            {item.icon}
          </div>
          <h3 className="font-display text-base font-semibold text-brand-navy">{item.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">{item.description}</p>
        </li>
      ))}
    </ul>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="relative rounded-2xl border border-[var(--hairline)] bg-[var(--material-thick)] p-6 shadow-[var(--dashboard-shadow)]">
      <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
        {number}
      </span>
      <h3 className="mt-3 font-display text-lg font-semibold text-brand-navy">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted">{description}</p>
    </div>
  );
}

function RoleSection({
  id,
  eyebrow,
  title,
  description,
  items,
  reversed,
  preview,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  items: FeatureItem[];
  reversed?: boolean;
  preview: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-[var(--hairline)] py-16 md:py-20">
      <div
        className={cn(
          "mx-auto grid max-w-6xl items-center gap-10 px-4 md:px-6 lg:grid-cols-2 lg:gap-14",
          reversed && "lg:[&>div:first-child]:order-2"
        )}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">{eyebrow}</p>
          <h2 className="mun-display mt-3 text-3xl text-brand-navy md:text-4xl">{title}</h2>
          <p className="mt-4 text-base leading-relaxed text-brand-muted md:text-lg">{description}</p>
          <FeatureGrid items={items} className="mt-8" />
        </div>
        <div className="relative">{preview}</div>
      </div>
    </section>
  );
}

export async function MarketingHome() {
  const t = await getTranslations("marketing");

  const chairFeatures: FeatureItem[] = [
    {
      icon: <ClipboardList className="h-5 w-5" aria-hidden />,
      title: t("chairs.feature1Title"),
      description: t("chairs.feature1Description"),
    },
    {
      icon: <Gavel className="h-5 w-5" aria-hidden />,
      title: t("chairs.feature2Title"),
      description: t("chairs.feature2Description"),
    },
    {
      icon: <Timer className="h-5 w-5" aria-hidden />,
      title: t("chairs.feature3Title"),
      description: t("chairs.feature3Description"),
    },
    {
      icon: <Vote className="h-5 w-5" aria-hidden />,
      title: t("chairs.feature4Title"),
      description: t("chairs.feature4Description"),
    },
  ];

  const delegateFeatures: FeatureItem[] = [
    {
      icon: <FileText className="h-5 w-5" aria-hidden />,
      title: t("delegates.feature1Title"),
      description: t("delegates.feature1Description"),
    },
    {
      icon: <BookOpen className="h-5 w-5" aria-hidden />,
      title: t("delegates.feature2Title"),
      description: t("delegates.feature2Description"),
    },
    {
      icon: <MessageSquare className="h-5 w-5" aria-hidden />,
      title: t("delegates.feature3Title"),
      description: t("delegates.feature3Description"),
    },
    {
      icon: <Mic2 className="h-5 w-5" aria-hidden />,
      title: t("delegates.feature4Title"),
      description: t("delegates.feature4Description"),
    },
  ];

  const smtFeatures: FeatureItem[] = [
    {
      icon: <LayoutDashboard className="h-5 w-5" aria-hidden />,
      title: t("smt.feature1Title"),
      description: t("smt.feature1Description"),
    },
    {
      icon: <Users className="h-5 w-5" aria-hidden />,
      title: t("smt.feature2Title"),
      description: t("smt.feature2Description"),
    },
    {
      icon: <Award className="h-5 w-5" aria-hidden />,
      title: t("smt.feature3Title"),
      description: t("smt.feature3Description"),
    },
    {
      icon: <BarChart3 className="h-5 w-5" aria-hidden />,
      title: t("smt.feature4Title"),
      description: t("smt.feature4Description"),
    },
  ];

  const platformFeatures: FeatureItem[] = [
    {
      icon: <Globe2 className="h-5 w-5" aria-hidden />,
      title: t("platform.feature1Title"),
      description: t("platform.feature1Description"),
    },
    {
      icon: <Newspaper className="h-5 w-5" aria-hidden />,
      title: t("platform.feature2Title"),
      description: t("platform.feature2Description"),
    },
    {
      icon: <Archive className="h-5 w-5" aria-hidden />,
      title: t("platform.feature3Title"),
      description: t("platform.feature3Description"),
    },
    {
      icon: <Shield className="h-5 w-5" aria-hidden />,
      title: t("platform.feature4Title"),
      description: t("platform.feature4Description"),
    },
  ];

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 md:px-6 md:pb-20 md:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              {t("hero.eyebrow")}
            </p>
            <h1 className="mun-display mt-4 text-4xl text-brand-navy md:text-5xl lg:text-6xl">
              {t("hero.title")}{" "}
              <span className="mun-emph">{t("hero.titleEmphasis")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-muted md:text-lg">
              {t("hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="mun-btn-primary rounded-full px-6 py-3 text-base font-semibold">
                {t("hero.ctaStart")} →
              </Link>
              <Link href="/login" className="mun-btn rounded-full px-6 py-3 text-base font-semibold">
                {t("hero.ctaJoin")} →
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-brand-muted">
              <li className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                {t("hero.bullet1")}
              </li>
              <li className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                {t("hero.bullet2")}
              </li>
              <li className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                {t("hero.bullet3")}
              </li>
            </ul>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--accent)_16%,transparent),transparent_70%)]" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#12121A] p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)]">
              <MarketingHeroSessionPreview />
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 border-y border-[var(--hairline)] bg-[var(--material-thin)] py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              {t("steps.eyebrow")}
            </p>
            <h2 className="mun-display mt-3 text-3xl text-brand-navy md:text-4xl">{t("steps.title")}</h2>
            <p className="mt-4 text-base leading-relaxed text-brand-muted md:text-lg">{t("steps.subtitle")}</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <StepCard number="01" title={t("steps.step1Title")} description={t("steps.step1Description")} />
            <StepCard number="02" title={t("steps.step2Title")} description={t("steps.step2Description")} />
            <StepCard number="03" title={t("steps.step3Title")} description={t("steps.step3Description")} />
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 py-4">
        <RoleSection
          id="chairs"
          eyebrow={t("chairs.eyebrow")}
          title={t("chairs.title")}
          description={t("chairs.description")}
          items={chairFeatures}
          preview={
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#12121A] p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)]">
              <MarketingChairMotionPreview />
            </div>
          }
        />

        <RoleSection
          id="delegates"
          eyebrow={t("delegates.eyebrow")}
          title={t("delegates.title")}
          description={t("delegates.description")}
          items={delegateFeatures}
          reversed
          preview={<MarketingDelegatePrepPreview />}
        />

        <RoleSection
          id="smt"
          eyebrow={t("smt.eyebrow")}
          title={t("smt.title")}
          description={t("smt.description")}
          items={smtFeatures}
          preview={<MarketingSmtOversightPreview />}
        />

        <section className="border-t border-[var(--hairline)] py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                {t("platform.eyebrow")}
              </p>
              <h2 className="mun-display mt-3 text-3xl text-brand-navy md:text-4xl">{t("platform.title")}</h2>
              <p className="mt-4 text-base leading-relaxed text-brand-muted md:text-lg">
                {t("platform.description")}
              </p>
            </div>
            <FeatureGrid items={platformFeatures} className="mt-10 lg:grid-cols-4" />
          </div>
        </section>
      </section>

      <section id="about" className="scroll-mt-24 border-t border-[var(--hairline)] bg-[var(--material-thin)] py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex justify-center lg:justify-start">
            <BrandWordmark size="hero" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              {t("about.eyebrow")}
            </p>
            <h2 className="mun-display mt-3 text-3xl text-brand-navy md:text-4xl">{t("about.title")}</h2>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-brand-muted">
              <p>{t("about.paragraph1")}</p>
              <p>{t("about.paragraph2")}</p>
              <p>{t("about.paragraph3")}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-24 border-t border-[var(--hairline)] py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            {t("contact.eyebrow")}
          </p>
          <h2 className="mun-display mt-3 text-3xl text-brand-navy md:text-4xl">{t("contact.title")}</h2>
          <p className="mt-4 text-base leading-relaxed text-brand-muted md:text-lg">{t("contact.description")}</p>
          <a
            href={`mailto:${INQUIRY_EMAIL}`}
            className="mt-6 inline-flex items-center justify-center rounded-full border border-[var(--hairline)] bg-[var(--material-thick)] px-6 py-3 text-base font-semibold text-brand-navy shadow-[var(--dashboard-shadow)] transition hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--hairline))] hover:text-[var(--accent)]"
            aria-label={t("contact.emailAria")}
          >
            {INQUIRY_EMAIL}
          </a>
        </div>
      </section>

      <section className="border-t border-[var(--hairline)] py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
          <h2 className="mun-display text-3xl text-brand-navy md:text-4xl">{t("footer.ctaTitle")}</h2>
          <p className="mt-4 text-base leading-relaxed text-brand-muted md:text-lg">{t("footer.ctaSubtitle")}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="mun-btn-gold rounded-full px-7 py-3 text-base font-bold">
              {t("footer.ctaStart")} →
            </Link>
            <Link href="/login" className="mun-btn rounded-full px-7 py-3 text-base font-semibold">
              {t("footer.ctaJoin")}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--hairline)] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-brand-muted md:flex-row md:px-6">
          <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href={`mailto:${INQUIRY_EMAIL}`}
              className="hover:text-brand-navy"
            >
              {t("footer.contact")}
            </a>
            <Link href="/login" className="hover:text-brand-navy">
              {t("nav.signIn")}
            </Link>
            <Link href="/signup" className="hover:text-brand-navy">
              {t("nav.getStarted")}
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
