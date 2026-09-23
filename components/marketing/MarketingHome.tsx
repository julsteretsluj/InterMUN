// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ConferenceInquiryForm } from "@/components/marketing/ConferenceInquiryForm";
import {
  MarketingChairMotionPreview,
  MarketingDelegatePrepPreview,
  MarketingHeroSessionPreview,
  MarketingSmtOversightPreview,
} from "@/components/marketing/MarketingInteractivePreviews";
import { InterMunEmblem } from "@/components/InterMunEmblem";
import { getAppName, getPartnershipContactEmail } from "@/lib/branding";
import { cn } from "@/lib/utils";

function WindowFrame({
  filename,
  children,
  className,
  floatClass,
}: {
  filename: string;
  children: React.ReactNode;
  className?: string;
  floatClass?: string;
}) {
  return (
    <div className={cn("clicky-window clicky-window-lg", floatClass, className)}>
      <div className="clicky-window-bar">
        <span className="clicky-traffic" aria-hidden />
        <span className="clicky-window-title">{filename}</span>
      </div>
      <div className="clicky-preview-body bg-[var(--clicky-window)]">{children}</div>
    </div>
  );
}

function RoleStrip({
  id,
  kicker,
  title,
  body,
  href,
  hrefLabel,
  preview,
  filename,
  mirror,
}: {
  id: string;
  kicker: string;
  title: string;
  body: string;
  href: string;
  hrefLabel: string;
  preview: React.ReactNode;
  filename: string;
  mirror?: boolean;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-[var(--clicky-line)] py-16 md:py-24">
      <div
        className={cn(
          "mx-auto grid max-w-6xl items-center gap-10 px-4 md:px-8 lg:gap-16",
          mirror ? "lg:grid-cols-[1.05fr_0.95fr]" : "lg:grid-cols-[0.95fr_1.05fr]"
        )}
      >
        <div className={cn(mirror && "lg:order-2")}>
          <p className="clicky-eyebrow">{kicker}</p>
          <h2 className="clicky-section-title mt-3">{title}</h2>
          <p className="clicky-lede mt-4">{body}</p>
          <Link href={href} className="clicky-pill clicky-pill-ghost mt-8">
            {hrefLabel}
          </Link>
        </div>
        <div className={cn("relative", mirror ? "lg:order-1 lg:-rotate-1" : "lg:rotate-1")}>
          <WindowFrame filename={filename}>{preview}</WindowFrame>
          <span
            className={cn(
              "clicky-kaomoji absolute -bottom-3 hidden md:block",
              mirror ? "-left-2" : "-right-2"
            )}
            aria-hidden
          >
            {mirror ? "(¬‿¬)" : "^ ω ^"}
          </span>
        </div>
      </div>
    </section>
  );
}

export async function MarketingHome() {
  const t = await getTranslations("marketing");
  const appName = getAppName();
  const partnershipEmail = getPartnershipContactEmail();

  return (
    <>
      {/* Hero — quiet first viewport: brand, one line, one CTA pair */}
      <section className="clicky-desktop-stage overflow-x-clip">
        <div className="relative mx-auto flex min-h-[min(72vh,36rem)] max-w-6xl flex-col justify-center px-4 py-16 md:min-h-[min(78vh,42rem)] md:px-8 md:py-20">
          <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
            <div className="clicky-sticky absolute left-0 top-[14%] hidden max-w-[9.5rem] clicky-float-a sm:block md:left-2 md:max-w-[11rem]">
              {t("hero.sticky1")}
            </div>
            <div className="clicky-sticky clicky-sticky--blue absolute right-0 top-[20%] hidden max-w-[9rem] clicky-float-b sm:block md:right-2 md:max-w-[10rem]">
              {t("hero.sticky2")}
            </div>
            <span className="clicky-kaomoji absolute bottom-[16%] left-[4%] hidden clicky-float-c md:block">
              ¯\_(ツ)_/¯
            </span>
            <span className="clicky-kaomoji absolute right-[8%] bottom-[24%] hidden clicky-float-a lg:block">
              (⌐■_■)
            </span>
          </div>

          <div className="relative z-[1] mx-auto max-w-2xl text-center">
            <div className="mb-5 flex justify-center">
              <InterMunEmblem alt="" className="max-h-14 w-auto md:max-h-16" />
            </div>
            <h1 className="case-preserve text-[clamp(2.6rem,8vw,4.5rem)] font-bold leading-[0.95] tracking-[-0.045em] text-[var(--clicky-ink)]">
              {appName}
            </h1>
            <p className="mt-4 text-base text-[var(--clicky-ink-soft)] md:text-lg">
              {t("hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register/secretariat" className="clicky-pill clicky-pill-primary">
                {t("hero.ctaStart")}
              </Link>
              <Link href="/signup" className="clicky-pill clicky-pill-ghost">
                {t("hero.ctaJoin")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Floor demo — below the fold */}
      <section className="border-t border-[var(--clicky-line)] bg-[var(--clicky-paper-deep)]/40 py-12 md:py-16">
        <div className="relative mx-auto max-w-4xl px-4 md:px-8">
          <p className="clicky-eyebrow mb-4 text-center">{t("hero.floorEyebrow")}</p>
          <WindowFrame filename="session-floor.mov" className="clicky-float-a" floatClass="">
            <MarketingHeroSessionPreview heroCompact />
          </WindowFrame>
        </div>
      </section>

      {/* How it works — clico numbered, asymmetric */}
      <section
        id="how-it-works"
        className="scroll-mt-28 border-t border-[var(--clicky-line)] bg-[var(--clicky-paper-deep)]/60 py-16 md:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="max-w-xl md:ml-[8%]">
            <p className="clicky-eyebrow">{t("steps.eyebrow")}</p>
            <h2 className="clicky-section-title mt-3">{t("steps.title")}</h2>
            <p className="clicky-lede mt-4">{t("steps.subtitle")}</p>
          </div>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { n: "01", title: t("steps.step1Title"), body: t("steps.step1Description"), code: t("steps.step1Code") },
              { n: "02", title: t("steps.step2Title"), body: t("steps.step2Description"), code: t("steps.step2Code") },
              { n: "03", title: t("steps.step3Title"), body: t("steps.step3Description"), code: t("steps.step3Code") },
            ].map((step, i) => (
              <li
                key={step.n}
                className={cn(
                  "clicky-window p-5",
                  i === 1 && "md:mt-10",
                  i === 2 && "md:mt-4"
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs font-semibold text-[var(--clicky-blue)]">{step.n}</span>
                  <span className="rounded-full bg-[var(--clicky-paper)] px-2 py-0.5 font-mono text-[0.65rem] text-[var(--clicky-ink-faint)]">
                    {step.code}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--clicky-ink-soft)]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <RoleStrip
        id="for-chairs"
        kicker={t("chairs.eyebrow")}
        title={t("chairs.title")}
        body={t("chairs.description")}
        href="/features/chairs"
        hrefLabel={t("exploreChairs")}
        filename="dais-floor.app"
        preview={<MarketingChairMotionPreview />}
      />

      <RoleStrip
        id="for-delegates"
        kicker={t("delegates.eyebrow")}
        title={t("delegates.title")}
        body={t("delegates.description")}
        href="/features/delegates"
        hrefLabel={t("exploreDelegates")}
        filename="delegate-prep.app"
        preview={<MarketingDelegatePrepPreview />}
        mirror
      />

      <RoleStrip
        id="for-secretariat"
        kicker={t("smt.eyebrow")}
        title={t("smt.title")}
        body={t("smt.description")}
        href="/features/secretariat"
        hrefLabel={t("exploreSecretariat")}
        filename="smt-oversight.app"
        preview={<MarketingSmtOversightPreview />}
      />

      {/* Platform extras */}
      <section className="border-t border-[var(--clicky-line)] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="max-w-lg">
            <p className="clicky-eyebrow">{t("platform.eyebrow")}</p>
            <h2 className="clicky-section-title mt-3">{t("platform.title")}</h2>
            <p className="clicky-lede mt-4">{t("platform.description")}</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: t("platform.feature1Title"), d: t("platform.feature1Description") },
              { t: t("platform.feature2Title"), d: t("platform.feature2Description") },
              { t: t("platform.feature3Title"), d: t("platform.feature3Description") },
              { t: t("platform.feature4Title"), d: t("platform.feature4Description") },
            ].map((item, i) => (
              <div
                key={item.t}
                className={cn(
                  "rounded-[var(--clicky-radius)] border border-[var(--clicky-line)] bg-[var(--clicky-window)] p-5",
                  i % 2 === 1 && "sm:translate-y-4"
                )}
              >
                <h3 className="font-semibold tracking-[-0.02em]">{item.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--clicky-ink-soft)]">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="clicky-band border-t border-white/10 py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <p className="clicky-kaomoji clicky-on-band-faint">{t("about.dreamEyebrow")}</p>
          <h2 className="mt-4 text-[clamp(1.6rem,3.5vw,2.4rem)] font-bold leading-tight tracking-[-0.03em]">
            {t("about.title")}
          </h2>
          <div className="clicky-on-band-soft mt-8 space-y-5 text-[1.05rem] leading-relaxed">
            <p>{t("about.paragraph1")}</p>
            <p>{t("about.paragraph2")}</p>
            <p>{t("about.paragraph3")}</p>
          </div>
          <p className="clicky-on-band-faint mt-10 text-sm">{t("about.footerLabel", { app: appName })}</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-[var(--clicky-line)] py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-[0.8fr_1.2fr] md:px-8">
          <div>
            <h2 className="clicky-section-title">{t("faq.title")}</h2>
            <p className="clicky-lede mt-3">{t("faq.subtitle")}</p>
          </div>
          <div className="clicky-faq">
            <details open>
              <summary>{t("faq.q1")}</summary>
              <p>{t("faq.a1")}</p>
            </details>
            <details>
              <summary>{t("faq.q2")}</summary>
              <p>{t("faq.a2")}</p>
            </details>
            <details>
              <summary>{t("faq.q3")}</summary>
              <p>{t("faq.a3")}</p>
            </details>
            <details>
              <summary>{t("faq.q4")}</summary>
              <p>{t("faq.a4")}</p>
            </details>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-28 border-t border-[var(--clicky-line)] bg-[var(--clicky-paper-deep)]/50 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-[0.9fr_1.1fr] md:px-8">
          <div>
            <p className="clicky-eyebrow">{t("contact.eyebrow")}</p>
            <h2 className="clicky-section-title mt-3">{t("contact.title")}</h2>
            <p className="clicky-lede mt-4">{t("contact.description")}</p>
            {partnershipEmail ? (
              <p className="mt-6 text-sm text-[var(--clicky-ink-soft)]">
                {t("contact.directEmail")}{" "}
                <a href={`mailto:${partnershipEmail}`} className="font-medium text-[var(--clicky-blue)]">
                  {partnershipEmail}
                </a>
              </p>
            ) : null}
          </div>
          <ConferenceInquiryForm />
        </div>
      </section>
    </>
  );
}
