// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { addMonths, formatMonthYear } from "@/lib/event-date-range";
import { cn } from "@/lib/utils";

export type AppleCalendarDayMeta = {
  isToday?: boolean;
  isSelected?: boolean;
  isRangeStart?: boolean;
  isRangeEnd?: boolean;
  isInRange?: boolean;
};

type AppleCalendarProps = {
  viewDate: Date;
  onViewDateChange: (date: Date) => void;
  locale: string;
  weeks: (Date | null)[][];
  weekdays: string[];
  monthNames: string[];
  years: number[];
  onDayClick: (day: Date) => void;
  getDayMeta: (day: Date) => AppleCalendarDayMeta;
  previousMonthLabel: string;
  nextMonthLabel: string;
  monthLabel: string;
  yearLabel: string;
  footer?: ReactNode;
  className?: string;
};

export function AppleCalendar({
  viewDate,
  onViewDateChange,
  locale,
  weeks,
  weekdays,
  monthNames,
  years,
  onDayClick,
  getDayMeta,
  previousMonthLabel,
  nextMonthLabel,
  monthLabel,
  yearLabel,
  footer,
  className,
}: AppleCalendarProps) {
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  function setViewMonth(month: number) {
    onViewDateChange(new Date(viewDate.getFullYear(), month, 1));
  }

  function setViewYear(year: number) {
    onViewDateChange(new Date(year, viewDate.getMonth(), 1));
  }

  return (
    <div className={cn("mun-apple-calendar", className)}>
      <header className="mun-apple-calendar-header">
        <button
          type="button"
          className="mun-apple-calendar-month-button"
          aria-expanded={monthPickerOpen}
          onClick={() => setMonthPickerOpen((open) => !open)}
        >
          <span>{formatMonthYear(viewDate, locale)}</span>
          <ChevronDown
            className={cn("mun-apple-calendar-month-chevron", monthPickerOpen && "is-open")}
            aria-hidden
          />
        </button>
        <div className="mun-apple-calendar-nav-group">
          <button
            type="button"
            className="mun-apple-calendar-nav"
            aria-label={previousMonthLabel}
            onClick={() => onViewDateChange(addMonths(viewDate, -1))}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </button>
          <button
            type="button"
            className="mun-apple-calendar-nav"
            aria-label={nextMonthLabel}
            onClick={() => onViewDateChange(addMonths(viewDate, 1))}
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </header>

      {monthPickerOpen ? (
        <div className="mun-apple-calendar-month-picker">
          <label className="mun-apple-calendar-picker-field">
            <span className="mun-apple-calendar-picker-label">{monthLabel}</span>
            <select
              className="mun-apple-calendar-picker-select"
              value={viewDate.getMonth()}
              onChange={(event) => setViewMonth(Number(event.target.value))}
              aria-label={monthLabel}
            >
              {monthNames.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="mun-apple-calendar-picker-field">
            <span className="mun-apple-calendar-picker-label">{yearLabel}</span>
            <select
              className="mun-apple-calendar-picker-select"
              value={viewDate.getFullYear()}
              onChange={(event) => setViewYear(Number(event.target.value))}
              aria-label={yearLabel}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <div className="mun-apple-calendar-weekdays" aria-hidden>
        {weekdays.map((name) => (
          <div key={name} className="mun-apple-calendar-weekday">
            {name}
          </div>
        ))}
      </div>

      <div className="mun-apple-calendar-grid" role="grid" aria-label={formatMonthYear(viewDate, locale)}>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="mun-apple-calendar-week" role="row">
            {week.map((day, dayIndex) => {
              if (!day) {
                return <div key={`empty-${weekIndex}-${dayIndex}`} className="mun-apple-calendar-day is-empty" role="gridcell" aria-hidden />;
              }

              const meta = getDayMeta(day);
              const isEndpoint = meta.isRangeStart || meta.isRangeEnd || meta.isSelected;

              return (
                <button
                  key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`}
                  type="button"
                  role="gridcell"
                  aria-selected={isEndpoint || meta.isInRange}
                  aria-current={meta.isToday ? "date" : undefined}
                  onClick={() => onDayClick(day)}
                  className={cn(
                    "mun-apple-calendar-day",
                    meta.isToday && "is-today",
                    meta.isInRange && "is-in-range",
                    meta.isRangeStart && "is-range-start",
                    meta.isRangeEnd && "is-range-end",
                    isEndpoint && "is-selected"
                  )}
                >
                  <span className="mun-apple-calendar-day-label">{day.getDate()}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {footer ? <footer className="mun-apple-calendar-footer">{footer}</footer> : null}
    </div>
  );
}
