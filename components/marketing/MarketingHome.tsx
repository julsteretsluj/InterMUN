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
      {/* Hero — heyclicky desktop stage */}
      <section className="clicky-desktop-stage overflow-hidden">
        <div className="relative mx-auto max-w-6xl">
          <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
            <div className="clicky-sticky absolute left-[4%] top-[8%] max-w-[11rem] clicky-float-a">
              roll call, timers, and motions in one floor.
            </div>
            <div className="clicky-sticky clicky-sticky--blue absolute right-[6%] top-[18%] max-w-[10rem] clicky-float-b">
              built for chairs who hate juggling tabs.
            </div>
            <span className="clicky-kaomoji absolute bottom-[22%] left-[8%] clicky-float-c">¯\_(ツ)_/¯</span>
          </div>

          <div className="relative z-[1] mx-auto max-w-2xl pt-6 text-center md:pt-10">
            <p className="clicky-kaomoji mb-3">^ ω ^</p>
            <h1 className="case-preserve text-[clamp(2.6rem,8vw,4.5rem)] font-bold leading-[0.95] tracking-[-0.045em] text-[var(--clicky-ink)]">
              {appName}
            </h1>
            <p className="mt-4 text-base lowercase text-[var(--clicky-ink-soft)] md:text-lg">
              {t("hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register/secretariat" className="clicky-pill clicky-pill-primary">
                {t("hero.ctaStart")}
              </Link>
              <Link href="/login" className="clicky-pill clicky-pill-ghost">
                {t("hero.ctaJoin")}
              </Link>
            </div>
            <p className="mt-4 text-xs lowercase text-[var(--clicky-ink-faint)]">
              {t("hero.chip1")} · {t("hero.chip2")} · {t("hero.chip3")}
            </p>
          </div>

          <div className="relative z-[1] mx-auto mt-12 max-w-4xl md:mt-16">
            <WindowFrame filename="session-floor.mov" className="clicky-float-a" floatClass="">
              <div className="p-2 md:p-3">
                <MarketingHeroSessionPreview heroCompact />
              </div>
            </WindowFrame>
          </div>
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
                <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em] lowercase">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--clicky-ink-soft)]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div id="features">
        <RoleStrip
          id="chairs"
          kicker={t("chairs.eyebrow")}
          title={t("chairs.title")}
          body={t("chairs.description")}
          href="/features/chairs"
          hrefLabel={t("exploreChairs")}
          filename="chair-motions.app"
          preview={
            <div className="p-2">
              <MarketingChairMotionPreview />
            </div>
          }
        />
        <RoleStrip
          id="delegates"
          mirror
          kicker={t("delegates.eyebrow")}
          title={t("delegates.title")}
          body={t("delegates.description")}
          href="/features/delegates"
          hrefLabel={t("exploreDelegates")}
          filename="delegate-prep.app"
          preview={
            <div className="p-2">
              <MarketingDelegatePrepPreview />
            </div>
          }
        />
        <RoleStrip
          id="smt"
          kicker={t("smt.eyebrow")}
          title={t("smt.title")}
          body={t("smt.description")}
          href="/features/secretariat"
          hrefLabel={t("exploreSecretariat")}
          filename="secretariat.live"
          preview={
            <div className="p-2">
              <MarketingSmtOversightPreview />
            </div>
          }
        />
      </div>

      {/* Platform — ohhmy bold statement, not card grid clone */}
      <section className="border-t border-[var(--clicky-line)] py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 text-center md:px-8">
          <p className="clicky-eyebrow">{t("platform.eyebrow")}</p>
          <h2 className="mt-4 text-[clamp(2rem,5vw,3.25rem)] font-bold lowercase leading-[1.05] tracking-[-0.04em]">
            {t("platform.title")}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-[var(--clicky-ink-soft)]">{t("platform.description")}</p>
          <div className="mt-12 grid gap-3 text-left sm:grid-cols-2">
            {[
              { t: t("platform.feature1Title"), d: t("platform.feature1Description") },
              { t: t("platform.feature2Title"), d: t("platform.feature2Description") },
              { t: t("platform.feature3Title"), d: t("platform.feature3Description") },
              { t: t("platform.feature4Title"), d: t("platform.feature4Description") },
            ].map((item, i) => (
              <div
                key={item.t}
                className={cn(
                  "rounded-[var(--clicky-radius)] border border-[var(--clicky-line)] bg-white p-5",
                  i % 2 === 1 && "sm:translate-y-4"
                )}
              >
                <h3 className="font-semibold tracking-[-0.02em] lowercase">{item.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--clicky-ink-soft)]">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder note — heyclicky manifesto */}
      <section id="about" className="border-t border-[var(--clicky-line)] bg-[var(--clicky-ink)] py-16 text-[#f7f6f2] md:py-24">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <p className="clicky-kaomoji text-white/50">the dream</p>
          <h2 className="mt-4 text-[clamp(1.6rem,3.5vw,2.4rem)] font-bold lowercase leading-tight tracking-[-0.03em]">
            {t("about.title")}
          </h2>
          <div className="mt-8 space-y-5 text-[1.05rem] leading-relaxed text-white/75">
            <p>{t("about.p1")}</p>
            <p>{t("about.p2")}</p>
            <p>{t("about.p3")}</p>
          </div>
          <p className="mt-10 text-sm text-white/45 lowercase">
            {t("about.eyebrow")} · <span className="case-preserve">{appName}</span>
          </p>
        </div>
      </section>

      {/* FAQ — heyclicky style */}
      <section className="border-t border-[var(--clicky-line)] py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-[0.8fr_1.2fr] md:px-8">
          <div>
            <h2 className="clicky-section-title">frequently asked</h2>
            <p className="clicky-lede mt-3">what chairs and secretariat usually ask before a conference weekend.</p>
          </div>
          <div className="clicky-faq">
            <details open>
              <summary>who is this for?</summary>
              <p>delegates, chairs, advisors, and secretariat — one conference workspace with role-aware tools.</p>
            </details>
            <details>
              <summary>can we run press corps and ga differently?</summary>
              <p>yes. procedure profiles keep press corps RoP scoped to that chamber without changing other committees.</p>
            </details>
            <details>
              <summary>how do people get into a room?</summary>
              <p>event code, then room / committee code, then optional placard codes — designed for real check-in lines.</p>
            </details>
            <details>
              <summary>is it ready for a live weekend?</summary>
              <p>session floor, voting, notes, documents, and oversight are built for concurrent use across chambers.</p>
            </details>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-28 border-t border-[var(--clicky-line)] bg-[var(--clicky-paper-deep)]/50 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-[1fr_1.1fr] md:px-8 lg:gap-16">
          <div className="md:pt-6">
            <p className="clicky-eyebrow">{t("contact.eyebrow")}</p>
            <h2 className="clicky-section-title mt-3">{t("contact.title")}</h2>
            <p className="clicky-lede mt-4">{t("contact.description")}</p>
            {partnershipEmail ? (
              <a href={`mailto:${partnershipEmail}`} className="mt-6 inline-block text-sm font-semibold text-[var(--clicky-blue)]">
                {partnershipEmail}
              </a>
            ) : null}
          </div>
          <ConferenceInquiryForm />
        </div>
      </section>
    </>
  );
}
