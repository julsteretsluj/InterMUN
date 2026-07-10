// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  const fieldId = id ?? useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => startOfDay(new Date()));
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (draftStart && !draftEnd) {
          onChange(formatEventDateRange(draftStart, draftStart, locale));
        }
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
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

  return (
    <div ref={containerRef} className="relative">
      {label ? (
        <label htmlFor={fieldId} className={labelClassName}>
          {label}
        </label>
      ) : null}
      <div className="relative">
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

      {open ? (
        <div
          role="dialog"
          aria-label={t("eventDatesCalendarAria")}
          className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-[var(--hairline)] bg-white p-4 shadow-[0_16px_40px_-20px_rgba(11,11,15,0.35)]"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setViewDate((current) => addMonths(current, -1))}
              className="rounded-lg p-1.5 text-brand-muted transition hover:bg-black/5 hover:text-brand-navy"
              aria-label={t("calendarPreviousMonth")}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <p className="text-sm font-semibold text-brand-navy">{monthLabel}</p>
            <button
              type="button"
              onClick={() => setViewDate((current) => addMonths(current, 1))}
              className="rounded-lg p-1.5 text-brand-muted transition hover:bg-black/5 hover:text-brand-navy"
              aria-label={t("calendarNextMonth")}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-brand-muted">
            {weekdays.map((name) => (
              <div key={name} className="py-1">
                {name}
              </div>
            ))}
          </div>

          <div className="mt-1 space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIndex) => {
                  if (!day) {
                    return <div key={dayIndex} className="h-9" aria-hidden />;
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
                      key={day.toISOString()}
                      type="button"
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "h-9 rounded-full text-sm font-medium transition",
                        inDraftRange
                          ? "bg-[color-mix(in_srgb,var(--accent)_14%,#fff)] text-brand-navy"
                          : "text-brand-navy hover:bg-black/5",
                        (isStart || isEnd) &&
                          "bg-[color-mix(in_srgb,var(--accent)_88%,#fff)] text-white hover:bg-[color-mix(in_srgb,var(--accent)_88%,#fff)]",
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

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--hairline)] pt-3">
            <p className="text-xs text-brand-muted">
              {draftStart && !draftEnd ? t("calendarSelectEnd") : t("calendarSelectStart")}
            </p>
            {value ? (
              <button
                type="button"
                onClick={clearDates}
                className="text-xs font-semibold text-brand-muted transition hover:text-brand-navy"
              >
                {t("calendarClearDates")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
