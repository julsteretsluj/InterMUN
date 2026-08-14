// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useLayoutEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { GUIDED_TOUR_STEPS, findVisibleTourTarget } from "@/lib/guided-tour";
import { useTour } from "@/components/tour/tour-context";

type Hole = { top: number; left: number; width: number; height: number };

const PAD = 10;

function clampTooltip(left: number, top: number, width: number, height: number) {
  const maxLeft = Math.max(12, window.innerWidth - width - 12);
  const maxTop = Math.max(12, window.innerHeight - height - 12);
  return {
    left: Math.min(Math.max(12, left), maxLeft),
    top: Math.min(Math.max(12, top), maxTop),
  };
}

export function GuidedTourOverlay() {
  const { view, running, stepIndex, next, back, stop } = useTour();
  const t = useTranslations("guidedTour");
  const steps = GUIDED_TOUR_STEPS[view];
  const step = steps[stepIndex];
  const [hole, setHole] = useState<Hole | null>(null);

  useLayoutEffect(() => {
    if (!running || !step) {
      setHole(null);
      return;
    }

    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      if (!step.target) {
        setHole(null);
        return;
      }
      const el = findVisibleTourTarget(step.target);
      if (!el) {
        setHole(null);
        return;
      }
      el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      const r = el.getBoundingClientRect();
      setHole({
        top: r.top - PAD,
        left: r.left - PAD,
        width: r.width + PAD * 2,
        height: r.height + PAD * 2,
      });
    };

    const t1 = window.setTimeout(measure, 80);
    const t2 = window.setTimeout(measure, 420);
    const skipMissing = window.setTimeout(() => {
      if (cancelled || !step.target) return;
      if (!findVisibleTourTarget(step.target)) next();
    }, 900);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(skipMissing);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [running, step, stepIndex, next]);

  if (!running || !step) return null;

  const title = t(`${view}.${step.id}.title`);
  const body = t(`${view}.${step.id}.body`);
  const isLast = stepIndex >= steps.length - 1;
  const tooltipWidth = 320;
  const tooltipHeight = 220;
  let tooltipLeft = (window.innerWidth - tooltipWidth) / 2;
  let tooltipTop = window.innerHeight * 0.28;
  if (hole) {
    const rightSpace = window.innerWidth - (hole.left + hole.width);
    if (rightSpace > tooltipWidth + 28) {
      tooltipLeft = hole.left + hole.width + 16;
      tooltipTop = hole.top;
    } else if (hole.top > tooltipHeight + 24) {
      tooltipLeft = hole.left;
      tooltipTop = hole.top - tooltipHeight - 12;
    } else {
      tooltipLeft = hole.left;
      tooltipTop = hole.top + hole.height + 16;
    }
  }
  const pos = clampTooltip(tooltipLeft, tooltipTop, tooltipWidth, tooltipHeight);

  return (
    <div className="guided-tour-root" role="dialog" aria-modal="true" aria-labelledby="guided-tour-title">
      {hole ? (
        <>
          <div className="guided-tour-dim" style={{ top: 0, left: 0, right: 0, height: Math.max(0, hole.top) }} />
          <div
            className="guided-tour-dim"
            style={{
              top: hole.top + hole.height,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <div
            className="guided-tour-dim"
            style={{
              top: hole.top,
              left: 0,
              width: Math.max(0, hole.left),
              height: hole.height,
            }}
          />
          <div
            className="guided-tour-dim"
            style={{
              top: hole.top,
              left: hole.left + hole.width,
              right: 0,
              height: hole.height,
            }}
          />
          <div
            className="guided-tour-hole"
            style={{
              top: hole.top,
              left: hole.left,
              width: hole.width,
              height: hole.height,
            }}
          />
        </>
      ) : (
        <div className="guided-tour-dim inset-0" />
      )}

      <div
        className="guided-tour-card"
        style={{ top: pos.top, left: pos.left, width: tooltipWidth }}
      >
        <p className="guided-tour-kicker">
          {t("common.stepOf", { current: stepIndex + 1, total: steps.length })}
        </p>
        <h2 id="guided-tour-title" className="guided-tour-title">
          {title}
        </h2>
        <p className="guided-tour-body">{body}</p>
        <div className="guided-tour-actions">
          <button type="button" className="guided-tour-btn-ghost" onClick={() => stop(true)}>
            {t("common.skip")}
          </button>
          <div className="ml-auto flex gap-2">
            {stepIndex > 0 ? (
              <button type="button" className="guided-tour-btn-secondary" onClick={back}>
                {t("common.back")}
              </button>
            ) : null}
            <button type="button" className="guided-tour-btn-primary" onClick={next}>
              {isLast ? t("common.done") : t("common.next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
