// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import {
  Archive,
  Award,
  BarChart3,
  BookOpen,
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
import { ConferenceInquiryForm } from "@/components/marketing/ConferenceInquiryForm";
import { MarketingChamberFrame } from "@/components/marketing/MarketingChamberFrame";
import { MarketingEmph } from "@/components/marketing/MarketingEmph";
import { MarketingOriginMap } from "@/components/marketing/MarketingOriginMap";
import { getPartnershipContactEmail } from "@/lib/branding";
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
  index: string;
};

function RoleFeatureGrid({
  items,
  className,
  dark,
  bento,
}: {
  items: FeatureItem[];
  className?: string;
  dark?: boolean;
  bento?: boolean;
}) {
  return (
    <ul className={cn("grid gap-3 sm:grid-cols-2", bento && "mun-marketing-bento", className)}>
      {items.map((item) => (
        <li key={item.title} className="mun-role-feature">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="mun-role-feature-index">{item.index}</span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]">
              {item.icon}
            </span>
          </div>
          <h3
            className={cn(
              "font-display text-base font-semibold",
              dark ? "text-white" : "text-brand-navy"
            )}
          >
            {item.title}
          </h3>
          <p
            className={cn(
              "mt-1.5 text-sm leading-relaxed",
              dark ? "text-white/65" : "text-brand-muted"
            )}
          >
            {item.description}
          </p>
        </li>
      ))}
    </ul>
  );
}

function GateFlow({
  steps,
}: {
  steps: { code: string; title: string; description: string }[];
}) {
  return (
    <ol className="mun-gate-flow mt-10 grid gap-5 md:grid-cols-3 md:gap-4">
      {steps.map((step) => (
        <li key={step.code} className="mun-gate-card">
          <span className="mun-gate-code">{step.code}</span>
          <h3 className="mt-3 font-display text-lg font-semibold text-brand-navy">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-brand-muted">{step.description}</p>
        </li>
      ))}
    </ol>
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
  dark,
  bandClassName,
  exploreHref,
  exploreLabel,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  items: FeatureItem[];
  reversed?: boolean;
  preview: ReactNode;
  dark?: boolean;
  bandClassName?: string;
  exploreHref?: string;
  exploreLabel?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24 py-16 md:py-20",
        dark ? cn("mun-marketing-role-band text-white", bandClassName) : "border-t border-[var(--hairline)]"
      )}
    >
      <div
        className={cn(
          "mx-auto grid max-w-6xl items-center gap-10 px-4 md:px-6 lg:grid-cols-2 lg:gap-14",
          reversed && "lg:[&>div:first-child]:order-2"
        )}
      >
        <div className={dark ? "mun-marketing-section-dark" : undefined}>
          <p className={cn(dark ? "mun-marketing-eyebrow" : "mun-marketing-eyebrow text-[var(--accent)]")}>
            {eyebrow}
          </p>
          <h2 className="mun-display mt-3 text-3xl md:text-4xl">{title}</h2>
          <p className={cn("mt-4 text-base leading-relaxed md:text-lg", dark ? "text-white/65" : "text-brand-muted")}>
            {description}
          </p>
          <RoleFeatureGrid items={items} className="mt-8" dark={dark} />
          {exploreHref && exploreLabel ? (
            <Link
              href={exploreHref}
              className={cn(
                "mt-6 inline-flex items-center gap-1 font-sans text-xs font-semibold uppercase tracking-wider transition",
                dark ? "text-[var(--accent)] hover:text-white" : "text-[var(--accent)] hover:text-brand-navy"
              )}
            >
              {exploreLabel} →
            </Link>
          ) : null}
        </div>
        <div className="relative">{preview}</div>
      </div>
    </section>
  );
}

export async function MarketingHome() {
  const t = await getTranslations("marketing");
  const partnershipEmail = getPartnershipContactEmail();

  const chairFeatures: FeatureItem[] = [
    {
      index: "§ I",
      icon: <ClipboardList className="h-4 w-4" aria-hidden />,
      title: t("chairs.feature1Title"),
      description: t("chairs.feature1Description"),
    },
    {
      index: "§ II",
      icon: <Gavel className="h-4 w-4" aria-hidden />,
      title: t("chairs.feature2Title"),
      description: t("chairs.feature2Description"),
    },
    {
      index: "§ III",
      icon: <Timer className="h-4 w-4" aria-hidden />,
      title: t("chairs.feature3Title"),
      description: t("chairs.feature3Description"),
    },
    {
      index: "§ IV",
      icon: <Vote className="h-4 w-4" aria-hidden />,
      title: t("chairs.feature4Title"),
      description: t("chairs.feature4Description"),
    },
  ];

  const delegateFeatures: FeatureItem[] = [
    {
      index: "A",
      icon: <FileText className="h-4 w-4" aria-hidden />,
      title: t("delegates.feature1Title"),
      description: t("delegates.feature1Description"),
    },
    {
      index: "B",
      icon: <BookOpen className="h-4 w-4" aria-hidden />,
      title: t("delegates.feature2Title"),
      description: t("delegates.feature2Description"),
    },
    {
      index: "C",
      icon: <MessageSquare className="h-4 w-4" aria-hidden />,
      title: t("delegates.feature3Title"),
      description: t("delegates.feature3Description"),
    },
    {
      index: "D",
      icon: <Mic2 className="h-4 w-4" aria-hidden />,
      title: t("delegates.feature4Title"),
      description: t("delegates.feature4Description"),
    },
  ];

  const smtFeatures: FeatureItem[] = [
    {
      index: "01",
      icon: <LayoutDashboard className="h-4 w-4" aria-hidden />,
      title: t("smt.feature1Title"),
      description: t("smt.feature1Description"),
    },
    {
      index: "02",
      icon: <Users className="h-4 w-4" aria-hidden />,
      title: t("smt.feature2Title"),
      description: t("smt.feature2Description"),
    },
    {
      index: "03",
      icon: <Award className="h-4 w-4" aria-hidden />,
      title: t("smt.feature3Title"),
      description: t("smt.feature3Description"),
    },
    {
      index: "04",
      icon: <BarChart3 className="h-4 w-4" aria-hidden />,
      title: t("smt.feature4Title"),
      description: t("smt.feature4Description"),
    },
  ];

  const platformFeatures: FeatureItem[] = [
    {
      index: "LANG",
      icon: <Globe2 className="h-4 w-4" aria-hidden />,
      title: t("platform.feature1Title"),
      description: t("platform.feature1Description"),
    },
    {
      index: "PRESS",
      icon: <Newspaper className="h-4 w-4" aria-hidden />,
      title: t("platform.feature2Title"),
      description: t("platform.feature2Description"),
    },
    {
      index: "ARCH",
      icon: <Archive className="h-4 w-4" aria-hidden />,
      title: t("platform.feature3Title"),
      description: t("platform.feature3Description"),
    },
    {
      index: "ADV",
      icon: <Shield className="h-4 w-4" aria-hidden />,
      title: t("platform.feature4Title"),
      description: t("platform.feature4Description"),
    },
  ];

  const gateSteps = [
    {
      code: t("steps.step1Code"),
      title: t("steps.step1Title"),
      description: t("steps.step1Description"),
    },
    {
      code: t("steps.step2Code"),
      title: t("steps.step2Title"),
      description: t("steps.step2Description"),
    },
    {
      code: t("steps.step3Code"),
      title: t("steps.step3Title"),
      description: t("steps.step3Description"),
    },
  ];

  return (
    <>
      <section className="mun-marketing-hero relative overflow-hidden border-b border-white/10">
        <div className="mun-marketing-rainbow-bar absolute inset-x-0 top-0" aria-hidden />
        <div className="pointer-events-none absolute -left-16 bottom-8 h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--gold)_16%,transparent)] blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] blur-3xl" aria-hidden />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 md:px-6 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="mun-marketing-hero-copy">
            <p className="mun-marketing-eyebrow">{t("hero.eyebrow")}</p>
            <div className="mt-4 flex items-start gap-4 sm:gap-5 md:gap-6">
              <Image
                src="/marketing/hero-laptop.png"
                alt=""
                width={986}
                height={986}
                priority
                aria-hidden
                className="mun-marketing-hero-accent hidden w-[4.5rem] shrink-0 sm:block md:w-24 lg:w-28"
              />
              <h1 className="mun-display min-w-0 text-4xl md:text-5xl lg:text-6xl">
                {t("hero.title")}{" "}
                <MarketingEmph>{t("hero.titleEmphasis")}</MarketingEmph>
              </h1>
            </div>
            <p className="mt-5 max-w-xl text-base leading-relaxed md:text-lg">{t("hero.subtitle")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/#contact"
                className="mun-btn-primary rounded-full px-6 py-3 text-base font-semibold shadow-[0_12px_32px_-12px_color-mix(in_srgb,var(--accent)_65%,transparent)]"
              >
                {t("hero.ctaStart")} →
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-white/20 bg-white/8 px-6 py-3 text-base font-semibold text-white backdrop-blur-sm transition hover:border-white/35 hover:bg-white/12"
              >
                {t("hero.ctaJoin")} →
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-2">
              <li className="mun-procedure-chip">{t("hero.chip1")}</li>
              <li className="mun-procedure-chip">{t("hero.chip2")}</li>
              <li className="mun-procedure-chip">{t("hero.chip3")}</li>
            </ul>
          </div>
          <div className="mun-marketing-hero-preview relative">
            <MarketingChamberFrame label={t("hero.previewLabel")}>
              <MarketingHeroSessionPreview />
            </MarketingChamberFrame>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mun-marketing-surface scroll-mt-24 border-b border-[var(--hairline)] py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="max-w-2xl">
            <p className="mun-marketing-eyebrow">{t("steps.eyebrow")}</p>
            <h2 className="mun-display mt-3 text-3xl text-brand-navy md:text-4xl">{t("steps.title")}</h2>
            <p className="mt-4 text-base leading-relaxed text-brand-muted md:text-lg">{t("steps.subtitle")}</p>
          </div>
          <GateFlow steps={gateSteps} />
        </div>
      </section>

      <section id="features" className="scroll-mt-24">
        <RoleSection
          id="chairs"
          dark
          eyebrow={t("chairs.eyebrow")}
          title={t("chairs.title")}
          description={t("chairs.description")}
          items={chairFeatures}
          exploreHref="/features/chairs"
          exploreLabel={t("exploreChairs")}
          preview={
            <MarketingChamberFrame label={t("chairs.previewLabel")}>
              <MarketingChairMotionPreview />
            </MarketingChamberFrame>
          }
        />

        <RoleSection
          id="delegates"
          dark
          bandClassName="mun-marketing-role-band-alt"
          reversed
          eyebrow={t("delegates.eyebrow")}
          title={t("delegates.title")}
          description={t("delegates.description")}
          items={delegateFeatures}
          exploreHref="/features/delegates"
          exploreLabel={t("exploreDelegates")}
          preview={
            <MarketingChamberFrame label={t("delegates.previewLabel")} variant="light">
              <MarketingDelegatePrepPreview />
            </MarketingChamberFrame>
          }
        />

        <RoleSection
          id="smt"
          dark
          eyebrow={t("smt.eyebrow")}
          title={t("smt.title")}
          description={t("smt.description")}
          items={smtFeatures}
          exploreHref="/features/secretariat"
          exploreLabel={t("exploreSecretariat")}
          preview={
            <MarketingChamberFrame label={t("smt.previewLabel")}>
              <MarketingSmtOversightPreview />
            </MarketingChamberFrame>
          }
        />

        <section className="mun-marketing-surface border-t border-[var(--hairline)] py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <div className="max-w-2xl">
              <p className="mun-marketing-eyebrow">{t("platform.eyebrow")}</p>
              <h2 className="mun-display mt-3 text-3xl text-brand-navy md:text-4xl">{t("platform.title")}</h2>
              <p className="mt-4 text-base leading-relaxed text-brand-muted md:text-lg">
                {t("platform.description")}
              </p>
            </div>
            <RoleFeatureGrid items={platformFeatures} bento className="mt-10 lg:grid-cols-4" />
          </div>
        </section>
      </section>

      <section id="origin" className="mun-marketing-surface scroll-mt-24 border-t border-[var(--hairline)] py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="max-w-2xl">
            <p className="mun-marketing-eyebrow">{t("origin.eyebrow")}</p>
            <h2 className="mun-display mt-3 text-3xl text-brand-navy md:text-4xl">{t("origin.title")}</h2>
          </div>
          <MarketingOriginMap
            className="mt-10 max-w-4xl"
            tooltip={t("origin.tooltip")}
            mapAria={t("origin.mapAria")}
          />
        </div>
      </section>

      <section id="about" className="mun-marketing-surface scroll-mt-24 border-b border-[var(--hairline)] py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:px-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="flex justify-center lg:justify-start">
            <div className="mun-marketing-contact-card max-w-sm p-8">
              <BrandWordmark size="hero" />
            </div>
          </div>
          <div>
            <p className="mun-marketing-eyebrow">{t("about.eyebrow")}</p>
            <h2 className="mun-display mt-3 text-3xl text-brand-navy md:text-4xl">{t("about.title")}</h2>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-brand-muted">
              <p>{t("about.paragraph1")}</p>
              <p>{t("about.paragraph2")}</p>
              <p>{t("about.paragraph3")}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="mun-marketing-surface scroll-mt-24 border-t border-[var(--hairline)] py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <div className="mun-marketing-contact-card">
            <div className="text-center">
              <p className="mun-marketing-eyebrow">{t("contact.eyebrow")}</p>
              <h2 className="mun-display mt-3 text-3xl text-brand-navy md:text-4xl">{t("contact.title")}</h2>
              <p className="mt-4 text-base leading-relaxed text-brand-muted md:text-lg">{t("contact.description")}</p>
            </div>
            <div className="mt-8 border-t border-[var(--hairline)] pt-8">
              <ConferenceInquiryForm />
            </div>
            <p className="mt-6 text-center text-sm text-brand-muted">
              {t("contact.directEmail")}{" "}
              {partnershipEmail ? (
                <a
                  href={`mailto:${partnershipEmail}`}
                  className="font-mono font-semibold text-[var(--accent)] hover:underline"
                  aria-label={t("contact.emailAria")}
                >
                  {partnershipEmail}
                </a>
              ) : null}
            </p>
          </div>
        </div>
      </section>

      <section className="mun-marketing-hero relative overflow-hidden border-t border-white/10 py-16 md:py-20">
        <div className="mun-marketing-rainbow-bar absolute inset-x-0 top-0" aria-hidden />
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
          <h2 className="mun-display text-3xl md:text-4xl">
            {t("footer.ctaTitle")}{" "}
            <MarketingEmph>{t("footer.ctaTitleEmphasis")}</MarketingEmph>
          </h2>
          <p className="mt-4 text-base leading-relaxed md:text-lg">{t("footer.ctaSubtitle")}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="mun-btn-gold rounded-full px-7 py-3 text-base font-bold">
              {t("footer.ctaStart")} →
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/20 bg-white/8 px-7 py-3 text-base font-semibold text-white backdrop-blur-sm transition hover:border-white/35 hover:bg-white/12"
            >
              {t("footer.ctaJoin")}
            </Link>
          </div>
        </div>
      </section>

      <footer className="mun-marketing-surface border-t border-[var(--hairline)] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-brand-muted md:flex-row md:px-6">
          <p className="font-sans text-xs tracking-wide">{t("footer.copyright", { year: new Date().getFullYear() })}</p>
          <div className="flex flex-wrap items-center justify-center gap-4 font-sans text-xs uppercase tracking-wider">
            {partnershipEmail ? (
              <a href={`mailto:${partnershipEmail}`} className="hover:text-brand-navy">
                {t("footer.contact")}
              </a>
            ) : null}
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
