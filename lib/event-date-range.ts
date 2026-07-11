// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isBetweenInclusive(day: Date, start: Date, end: Date): boolean {
  const t = startOfDay(day).getTime();
  const a = startOfDay(start).getTime();
  const b = startOfDay(end).getTime();
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return t >= lo && t <= hi;
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/** Human-readable range, e.g. "14–16 March 2026". */
export function formatEventDateRange(start: Date, end: Date, locale: string): string {
  const a = startOfDay(start);
  const b = startOfDay(end);
  const lo = a.getTime() <= b.getTime() ? a : b;
  const hi = a.getTime() <= b.getTime() ? b : a;

  const dayFmt = new Intl.DateTimeFormat(locale, { day: "numeric" });
  const monthFmt = new Intl.DateTimeFormat(locale, { month: "long" });
  const monthYearFmt = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const fullFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" });

  if (isSameDay(lo, hi)) return fullFmt.format(lo);

  const sameMonth = lo.getMonth() === hi.getMonth() && lo.getFullYear() === hi.getFullYear();
  const sameYear = lo.getFullYear() === hi.getFullYear();

  if (sameMonth) {
    return `${dayFmt.format(lo)}–${dayFmt.format(hi)} ${monthYearFmt.format(lo)}`;
  }
  if (sameYear) {
    return `${dayFmt.format(lo)} ${monthFmt.format(lo)} – ${dayFmt.format(hi)} ${monthFmt.format(hi)} ${lo.getFullYear()}`;
  }

  return `${fullFmt.format(lo)} – ${fullFmt.format(hi)}`;
}

export function formatMonthYear(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date);
}

export function getWeekdayLabels(locale: string): string[] {
  const base = new Date(2024, 0, 7); // Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    return new Intl.DateTimeFormat(locale, { weekday: "short" })
      .format(d)
      .replace(/\./g, "")
      .toUpperCase()
      .slice(0, 3);
  });
}

export function getMonthNames(locale: string): string[] {
  return Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2024, month, 1))
  );
}

export function getCalendarYearRange(yearsBehind = 2, yearsAhead = 12): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let year = current - yearsBehind; year <= current + yearsAhead; year++) {
    years.push(year);
  }
  return years;
}
