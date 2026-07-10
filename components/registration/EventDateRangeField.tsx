// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  addMonths,
  formatEventDateRange,
  getMonthGrid,
  getWeekdayLabels,
  isBetweenInclusive,
  isSameDay,
  startOfDay,
} from "@/lib/event-date-range";
import { cn } from "@/lib/utils";

type EventDateRangeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputClassName?: string;
  label?: string;
  labelClassName?: string;
  id?: string;
};

type PopoverBox = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

export function EventDateRangeField({
  value,
  onChange,
  placeholder,
  inputClassName,
  label,
  labelClassName,
  id,
}: EventDateRangeFieldProps) {
  const locale = useLocale();
  const t = useTranslations("secretariatRegistration");
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [popoverBox, setPopoverBox] = useState<PopoverBox | null>(null);
  const [viewDate, setViewDate] = useState(() => startOfDay(new Date()));
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPopoverBox(null);
      return;
    }

    function syncPopoverPosition() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const viewportMargin = 12;
      const gap = 8;
      const width = Math.min(rect.width, window.innerWidth - viewportMargin * 2);
      const left = Math.min(
        Math.max(viewportMargin, rect.left),
        window.innerWidth - width - viewportMargin
      );

      const belowTop = rect.bottom + gap;
      const maxBelow = window.innerHeight - belowTop - viewportMargin;
      const maxAbove = rect.top - gap - viewportMargin;

      let top = belowTop;
      let maxHeight = maxBelow;

      if (maxBelow < 280 && maxAbove > maxBelow) {
        maxHeight = maxAbove;
        top = Math.max(viewportMargin, rect.top - gap - maxHeight);
      }

      setPopoverBox({
        top,
        left,
        width,
        maxHeight: Math.max(200, maxHeight),
      });
    }

    syncPopoverPosition();
    window.addEventListener("resize", syncPopoverPosition);
    window.addEventListener("scroll", syncPopoverPosition, true);
    return () => {
      window.removeEventListener("resize", syncPopoverPosition);
      window.removeEventListener("scroll", syncPopoverPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onDocClick(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      if (draftStart && !draftEnd) {
        onChange(formatEventDateRange(draftStart, draftStart, locale));
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [draftEnd, draftStart, locale, onChange, open]);

  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    viewDate
  );
  const weeks = getMonthGrid(viewDate.getFullYear(), viewDate.getMonth());
  const weekdays = getWeekdayLabels(locale);
  const today = startOfDay(new Date());

  function openPicker() {
    setDraftStart(null);
    setDraftEnd(null);
    setOpen(true);
  }

  function handleDayClick(day: Date) {
    const picked = startOfDay(day);
    if (!draftStart || draftEnd) {
      setDraftStart(picked);
      setDraftEnd(null);
      return;
    }

    let start = draftStart;
    let end = picked;
    if (end.getTime() < start.getTime()) {
      const swap = start;
      start = end;
      end = swap;
    }
    setDraftStart(start);
    setDraftEnd(end);
    onChange(formatEventDateRange(start, end, locale));
    setOpen(false);
  }

  function clearDates() {
    onChange("");
    setDraftStart(null);
    setDraftEnd(null);
    setOpen(false);
  }

  const calendarPanel =
    open && popoverBox ? (
      <div
        ref={panelRef}
        role="dialog"
        aria-label={t("eventDatesCalendarAria")}
        className="fixed z-[200] flex flex-col overflow-hidden rounded-2xl border border-[var(--hairline)] bg-white text-[#18181b] shadow-[0_16px_40px_-20px_rgba(11,11,15,0.35)]"
        style={{
          top: popoverBox.top,
          left: popoverBox.left,
          width: popoverBox.width,
          maxHeight: popoverBox.maxHeight,
        }}
      >
        <div className="shrink-0 px-4 pt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setViewDate((current) => addMonths(current, -1))}
              className="rounded-lg p-1.5 text-[#71717a] transition hover:bg-black/5 hover:text-[#18181b]"
              aria-label={t("calendarPreviousMonth")}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <p className="text-sm font-semibold text-[#18181b]">{monthLabel}</p>
            <button
              type="button"
              onClick={() => setViewDate((current) => addMonths(current, 1))}
              className="rounded-lg p-1.5 text-[#71717a] transition hover:bg-black/5 hover:text-[#18181b]"
              aria-label={t("calendarNextMonth")}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-[#71717a]">
            {weekdays.map((name) => (
              <div key={name} className="py-1">
                {name}
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-1">
          <div className="mt-1 space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIndex) => {
                  if (!day) {
                    return <div key={`empty-${weekIndex}-${dayIndex}`} className="h-9" aria-hidden />;
                  }

                  const inDraftRange =
                    draftStart && draftEnd
                      ? isBetweenInclusive(day, draftStart, draftEnd)
                      : draftStart
                        ? isSameDay(day, draftStart)
                        : false;
                  const isStart = draftStart ? isSameDay(day, draftStart) : false;
                  const isEnd = draftEnd ? isSameDay(day, draftEnd) : false;
                  const isToday = isSameDay(day, today);

                  return (
                    <button
                      key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`}
                      type="button"
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "flex h-9 w-full items-center justify-center rounded-full text-sm font-medium text-[#18181b] transition",
                        inDraftRange && "bg-[color-mix(in_srgb,var(--accent)_14%,#fff)]",
                        (isStart || isEnd) &&
                          "bg-[color-mix(in_srgb,var(--accent)_88%,#fff)] text-white hover:bg-[color-mix(in_srgb,var(--accent)_88%,#fff)]",
                        !inDraftRange && !(isStart || isEnd) && "hover:bg-black/5",
                        isToday && !inDraftRange && "ring-1 ring-[color-mix(in_srgb,var(--accent)_35%,var(--hairline))]"
                      )}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--hairline)] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#71717a]">
              {draftStart && !draftEnd ? t("calendarSelectEnd") : t("calendarSelectStart")}
            </p>
            {value ? (
              <button
                type="button"
                onClick={clearDates}
                className="text-xs font-semibold text-[#71717a] transition hover:text-[#18181b]"
              >
                {t("calendarClearDates")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div ref={containerRef} className="relative">
      {label ? (
        <label htmlFor={fieldId} className={labelClassName}>
          {label}
        </label>
      ) : null}
      <div ref={anchorRef} className="relative">
        <input
          id={fieldId}
          readOnly
          value={value}
          placeholder={placeholder}
          onClick={openPicker}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openPicker();
            }
          }}
          className={cn(inputClassName, "cursor-pointer pr-10")}
          aria-haspopup="dialog"
          aria-expanded={open}
        />
        <button
          type="button"
          onClick={openPicker}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-brand-muted transition hover:bg-black/5 hover:text-brand-navy"
          aria-label={t("eventDatesCalendarOpen")}
        >
          <Calendar className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {mounted && calendarPanel ? createPortal(calendarPanel, document.body) : null}
    </div>
  );
}
