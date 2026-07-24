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
}: {
  items: FeatureItem[];
  className?: string;
  dark?: boolean;
}) {
  return (
    <ul className={cn("grid gap-3 sm:grid-cols-2", className)}>
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
              dark ? "text-[color:var(--marketing-ink)]" : "text-brand-navy"
            )}
          >
            {item.title}
          </h3>
          <p
            className={cn(
              "mt-1.5 text-sm leading-relaxed",
              dark ? "text-[color:var(--marketing-ink-soft)]" : "text-brand-muted"
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
    <ol className="mun-gate-flow mt-12 grid gap-4 md:grid-cols-3 md:gap-4">
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
        "scroll-mt-24 py-12 md:py-12",
        dark
          ? cn("mun-marketing-role-band text-[color:var(--marketing-ink)]", bandClassName)
          : "border-t border-[var(--hairline)]"
      )}
    >
      <div
        className={cn(
          "mx-auto grid max-w-6xl items-center gap-8 px-4 md:px-6 lg:grid-cols-2 lg:gap-12",
          reversed && "lg:[&>div:first-child]:order-2"
        )}
      >
        <div className={dark ? "mun-marketing-section-dark" : undefined}>
          <p className={cn(dark ? "mun-marketing-eyebrow" : "mun-marketing-eyebrow text-[var(--accent)]")}>
            {eyebrow}
          </p>
          <h2 className="mun-display mt-3 text-3xl md:text-4xl">{title}</h2>
          <p
            className={cn(
              "mt-4 text-base leading-relaxed md:text-lg",
              dark ? "text-[color:var(--marketing-ink-soft)]" : "text-brand-muted"
            )}
          >
            {description}
          </p>
          <RoleFeatureGrid items={items} className="mt-8" dark={dark} />
          {exploreHref && exploreLabel ? (
            <Link
              href={exploreHref}
              className={cn(
                "mt-6 inline-flex items-center gap-1 font-sans text-xs font-semibold uppercase tracking-wider transition",
                dark
                  ? "text-[var(--accent)] hover:text-[color:var(--marketing-ink)]"
                  : "text-[var(--accent)] hover:text-brand-navy"
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
      <section className="mun-marketing-hero relative overflow-hidden border-b border-[color:var(--marketing-hairline)] pb-12 md:pb-12">
        <div className="pointer-events-none absolute -left-16 bottom-8 h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--gold)_16%,transparent)] blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] blur-3xl" aria-hidden />
        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-12">
          <div className="mun-marketing-hero-stage grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12 xl:gap-12">
            <div className="mun-marketing-hero-copy order-2 lg:order-1">
              <p className="mun-marketing-eyebrow mun-marketing-eyebrow-hero">{t("hero.eyebrow")}</p>
              <h1 className="mun-apple-text mun-apple-text-large-title-emphasized mt-4 text-[color:var(--marketing-ink)] md:text-[2.75rem] lg:text-[3.25rem]">
                <span className="block">{t("hero.title")}</span>
                <MarketingEmph className="mt-2 block text-[1.2em] leading-none md:mt-3">
                  {t("hero.titleEmphasis")}
                </MarketingEmph>
              </h1>
              <p className="mun-apple-text mun-apple-text-body mt-6 max-w-xl text-[color:var(--marketing-ink-soft)]">{t("hero.subtitle")}</p>
              <div className="mun-marketing-hero-actions mt-8 flex flex-col items-start gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Link href="/register/secretariat" className="mun-apple-btn mun-apple-btn-filled-blue px-6 py-2.5 text-base">
                    {t("hero.ctaStart")} →
                  </Link>
                  <Link
                    href="/login"
                    className="mun-apple-btn mun-apple-btn-glass-gray px-6 py-2.5 text-base"
                  >
                    {t("hero.ctaJoin")} →
                  </Link>
                </div>
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                  <li className="mun-procedure-chip">{t("hero.chip1")}</li>
                  <li className="mun-procedure-chip">{t("hero.chip2")}</li>
                  <li className="mun-procedure-chip">{t("hero.chip3")}</li>
                </ul>
              </div>
            </div>

            <div className="mun-marketing-hero-visual order-1 flex justify-center lg:order-2 lg:justify-end">
              <Image
                src="/marketing/hero-laptop.png"
                alt=""
                width={975}
                height={975}
                priority
                aria-hidden
                className="mun-marketing-hero-accent w-full max-w-[18rem] sm:max-w-[22rem] md:max-w-[26rem] lg:max-w-none lg:w-[min(100%,28rem)] xl:w-[min(100%,34rem)]"
              />
            </div>
          </div>

          <div className="mun-marketing-hero-demo relative mt-12 w-full md:mt-12 lg:mt-12">
            <MarketingChamberFrame label={t("hero.previewLabel")}>
              <MarketingHeroSessionPreview heroCompact />
            </MarketingChamberFrame>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mun-marketing-surface scroll-mt-24 border-b border-[var(--hairline)] py-12 md:py-12">
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

        <section className="mun-marketing-surface border-t border-[var(--hairline)] py-12 md:py-12">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <div className="max-w-2xl">
              <p className="mun-marketing-eyebrow">{t("platform.eyebrow")}</p>
              <h2 className="mun-display mt-3 text-3xl text-brand-navy md:text-4xl">{t("platform.title")}</h2>
              <p className="mt-4 text-base leading-relaxed text-brand-muted md:text-lg">
                {t("platform.description")}
              </p>
            </div>
            <RoleFeatureGrid items={platformFeatures} className="mt-12 lg:grid-cols-4" />
          </div>
        </section>
      </section>

      <section id="origin" className="mun-marketing-surface scroll-mt-24 border-t border-[var(--hairline)] py-12 md:py-12">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="max-w-2xl">
            <p className="mun-marketing-eyebrow">{t("origin.eyebrow")}</p>
            <h2 className="mun-display mt-3 text-3xl text-brand-navy md:text-4xl">{t("origin.title")}</h2>
          </div>
          <MarketingOriginMap
            className="mt-12 max-w-4xl"
            tooltip={t("origin.tooltip")}
            mapAria={t("origin.mapAria")}
          />
        </div>
      </section>

      <section id="about" className="mun-marketing-surface scroll-mt-24 border-b border-[var(--hairline)] py-12 md:py-12">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 md:px-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="flex justify-center lg:justify-start">
            <div className="mun-marketing-contact-card max-w-sm p-8">
              <BrandWordmark size="hero" />
              <p className="mun-marketing-eyebrow mt-6 text-center">{t("hero.eyebrow")}</p>
            </div>
          </div>
          <div>
            <p className="mun-marketing-eyebrow">{t("about.eyebrow")}</p>
            <h2 className="mun-display mt-3 text-3xl text-brand-navy md:text-4xl">{t("about.title")}</h2>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-brand-muted">
              <p>{t("about.paragraph1")}</p>
              <p>{t("about.paragraph2")}</p>
              <p>{t("about.paragraph3")}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="mun-marketing-surface scroll-mt-24 border-t border-[var(--hairline)] py-12 md:py-12">
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
              {t("contact.registerSecretariat")}{" "}
              <Link href="/register/secretariat" className="font-semibold text-[var(--accent)] hover:underline">
                {t("contact.registerSecretariatLink")} →
              </Link>
            </p>
            <p className="mt-4 text-center text-sm text-brand-muted">
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

      <section className="mun-marketing-hero relative overflow-hidden border-t border-[color:var(--marketing-hairline)] py-12 md:py-12">
        <div className="mun-marketing-rainbow-bar absolute inset-x-0 top-0" aria-hidden />
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
          <p className="mun-marketing-eyebrow">{t("hero.eyebrow")}</p>
          <h2 className="mun-display mt-3 text-3xl md:text-4xl">
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
              className="rounded-full border border-[color:var(--marketing-glass-line)] bg-[color:var(--marketing-glass-fill)] px-7 py-3 text-base font-semibold text-[color:var(--marketing-ink)] backdrop-blur-sm transition hover:border-[color:var(--marketing-glass-line-strong)] hover:bg-[color:var(--marketing-glass-fill-strong)]"
            >
              {t("footer.ctaJoin")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
