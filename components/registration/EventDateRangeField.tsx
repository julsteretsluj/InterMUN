// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useId, useMemo, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  formatEventDateRange,
  getCalendarYearRange,
  getMonthGrid,
  getMonthNames,
  getWeekdayLabels,
  isBetweenInclusive,
  isSameDay,
  startOfDay,
} from "@/lib/event-date-range";
import { cn } from "@/lib/utils";
import { AppleConfirmSheet } from "@/components/ui/AppleSheet";
import { AppleCalendar } from "@/components/ui/AppleCalendar";
import { ApplePopover, ApplePopoverContent, ApplePopoverTrigger } from "@/components/ui/ApplePopover";

type EventDateRangeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputClassName?: string;
  label?: string;
  labelClassName?: string;
  id?: string;
  grouped?: boolean;
};

export function EventDateRangeField({
  value,
  onChange,
  placeholder,
  inputClassName,
  label,
  labelClassName,
  id,
  grouped = false,
}: EventDateRangeFieldProps) {
  const locale = useLocale();
  const t = useTranslations("secretariatRegistration");
  const tCommon = useTranslations("common");
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => startOfDay(new Date()));
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);
  const [clearSheetOpen, setClearSheetOpen] = useState(false);

  const monthNames = useMemo(() => getMonthNames(locale), [locale]);
  const years = useMemo(() => getCalendarYearRange(), []);
  const weeks = getMonthGrid(viewDate.getFullYear(), viewDate.getMonth());
  const weekdays = getWeekdayLabels(locale);
  const today = startOfDay(new Date());

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraftStart(null);
      setDraftEnd(null);
    } else if (draftStart && !draftEnd) {
      onChange(formatEventDateRange(draftStart, draftStart, locale));
    }
    setOpen(nextOpen);
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

  function getDayMeta(day: Date) {
    const inDraftRange =
      draftStart && draftEnd
        ? isBetweenInclusive(day, draftStart, draftEnd)
        : draftStart
          ? isSameDay(day, draftStart)
          : false;
    const isStart = draftStart ? isSameDay(day, draftStart) : false;
    const isEnd = draftEnd ? isSameDay(day, draftEnd) : false;

    return {
      isToday: isSameDay(day, today),
      isSelected: isStart || isEnd,
      isRangeStart: isStart,
      isRangeEnd: isEnd,
      isInRange: inDraftRange,
    };
  }

  return (
    <div ref={containerRef} className={cn(grouped ? "mun-apple-text-field-row w-full" : "relative")}>
      {!grouped && label ? (
        <label htmlFor={fieldId} className={labelClassName}>
          {label}
        </label>
      ) : null}
      <ApplePopover open={open} onOpenChange={handleOpenChange}>
        <ApplePopoverTrigger
          id={fieldId}
          aria-label={label ?? t("eventDatesCalendarAria")}
          className={cn(
            grouped
              ? "mun-apple-text-field-input mun-apple-text-field-input-button min-w-0 flex-1"
              : "mun-apple-calendar-compact-trigger w-full",
            !value && "is-placeholder",
            inputClassName
          )}
        >
          <span>{value || placeholder}</span>
          <CalendarDays className="mun-apple-calendar-compact-icon h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        </ApplePopoverTrigger>
        <ApplePopoverContent
          side="bottom"
          align="start"
          fitViewport
          panelWidth={288}
          aria-label={t("eventDatesCalendarAria")}
          className="mun-apple-calendar-popover p-0"
        >
          <AppleCalendar
            viewDate={viewDate}
            onViewDateChange={setViewDate}
            locale={locale}
            weeks={weeks}
            weekdays={weekdays}
            monthNames={monthNames}
            years={years}
            onDayClick={handleDayClick}
            getDayMeta={getDayMeta}
            previousMonthLabel={t("calendarPreviousMonth")}
            nextMonthLabel={t("calendarNextMonth")}
            monthLabel={t("calendarMonthLabel")}
            yearLabel={t("calendarYearLabel")}
            footer={
              <div className="flex items-center justify-between gap-2">
                <p className="mun-apple-text mun-apple-text-caption-1 mun-vibrancy-secondary">
                  {draftStart && !draftEnd ? t("calendarSelectEnd") : t("calendarSelectStart")}
                </p>
                {value ? (
                  <button
                    type="button"
                    onClick={() => setClearSheetOpen(true)}
                    className="mun-apple-btn mun-apple-btn-plain-blue mun-apple-btn-compact !px-0"
                  >
                    {t("calendarClearDates")}
                  </button>
                ) : null}
              </div>
            }
          />
        </ApplePopoverContent>
      </ApplePopover>

      <AppleConfirmSheet
        open={clearSheetOpen}
        onOpenChange={setClearSheetOpen}
        title={t("actionSheetClearDatesTitle")}
        message={t("actionSheetClearDatesMessage")}
        confirmLabel={t("actionSheetClearDatesConfirm")}
        cancelLabel={tCommon("cancel")}
        confirmRole="destructive"
        onConfirm={clearDates}
      />
    </div>
  );
}
