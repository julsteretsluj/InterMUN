"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { NewsroomItem, NewsroomResponse } from "@/app/api/newsroom/route";

/** How often (ms) the client re-checks the proxy for fresh headlines. */
const REFRESH_INTERVAL_MS = 180_000;
/** How often (ms) the live ticker advances to the next headline. */
const TICKER_INTERVAL_MS = 1_000;

function useRelativeTime(t: ReturnType<typeof useTranslations>) {
  return useCallback(
    (iso: string | null, nowMs: number): string => {
      if (!iso) return "";
      const then = new Date(iso).getTime();
      if (Number.isNaN(then)) return "";
      const diffSec = Math.max(0, Math.floor((nowMs - then) / 1000));
      if (diffSec < 60) return t("justNow");
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return t("minutesAgo", { count: diffMin });
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return t("hoursAgo", { count: diffHr });
      const diffDay = Math.floor(diffHr / 24);
      return t("daysAgo", { count: diffDay });
    },
    [t]
  );
}

export function NewsroomView() {
  const t = useTranslations("newsroom");
  const relativeTime = useRelativeTime(t);

  const [data, setData] = useState<NewsroomResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [tickerIndex, setTickerIndex] = useState(0);
  const lastUpdatedRef = useRef<number>(Date.now());

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch("/api/newsroom", { cache: "no-store" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = (await res.json()) as NewsroomResponse;
      setData(json);
      setLoadError(false);
      lastUpdatedRef.current = Date.now();
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNews();
    const id = window.setInterval(() => void fetchNews(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [fetchNews]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
      setTickerIndex((prev) => prev + 1);
    }, TICKER_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const items: NewsroomItem[] = useMemo(() => data?.items ?? [], [data]);
  const sourceLabel = data?.sourceLabel ?? "UN News";
  const tickerItem = items.length > 0 ? items[tickerIndex % items.length] : null;
  const secondsSinceUpdate = Math.max(0, Math.floor((nowMs - lastUpdatedRef.current) / 1000));

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-white/15 bg-black/25 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/10 px-3 py-2.5 sm:px-4">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[color:color-mix(in_srgb,var(--accent)_20%,transparent)] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--accent)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
            </span>
            {t("liveBadge")}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-brand-muted">
            {t("sourceLine", { source: sourceLabel })}
          </span>
          <span className="shrink-0 font-mono text-xs tabular-nums text-brand-muted">
            {new Date(nowMs).toLocaleTimeString()}
          </span>
        </div>
        <div className="flex min-h-[3.25rem] items-center px-3 py-3 sm:px-4">
          {tickerItem ? (
            <a
              key={tickerItem.id}
              href={tickerItem.link || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 items-start gap-2 text-sm font-medium text-brand-navy transition-opacity [-webkit-tap-highlight-color:transparent] touch-manipulation hover:underline"
            >
              <span className="mt-px shrink-0 text-[var(--accent)]" aria-hidden>
                ›
              </span>
              <span className="line-clamp-2 break-words">{tickerItem.title}</span>
            </a>
          ) : (
            <span className="text-sm text-brand-muted">
              {loading ? t("loading") : loadError ? t("error") : t("empty")}
            </span>
          )}
        </div>
      </div>

      <div className="w-full min-w-0 rounded-2xl border border-white/15 bg-black/25 p-4 shadow-sm backdrop-blur-sm sm:p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h3 className="font-display text-lg font-semibold text-brand-navy">{t("headlinesTitle")}</h3>
          <span className="shrink-0 font-mono text-xs tabular-nums text-brand-muted">
            {loadError ? t("reconnecting") : t("updatedAgo", { count: secondsSinceUpdate })}
          </span>
        </div>

        {items.length === 0 ? (
          <p className="mt-4 text-sm text-brand-muted">
            {loading ? t("loading") : loadError ? t("error") : t("empty")}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-white/10">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={item.link || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block min-w-0 py-3 [-webkit-tap-highlight-color:transparent] touch-manipulation active:opacity-70"
                >
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                    <p className="min-w-0 break-words text-sm font-semibold text-brand-navy group-hover:underline">
                      {item.title}
                    </p>
                    {item.publishedAt ? (
                      <span className="shrink-0 font-mono text-[0.7rem] tabular-nums text-brand-muted">
                        {relativeTime(item.publishedAt, nowMs)}
                      </span>
                    ) : null}
                  </div>
                  {item.summary ? (
                    <p className="mt-1 line-clamp-2 break-words text-xs text-brand-muted">{item.summary}</p>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 break-words text-xs text-brand-muted">{t("attribution", { source: sourceLabel })}</p>
      </div>
    </div>
  );
}
