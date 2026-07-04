"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, ExternalLink, Play } from "lucide-react";
import type { PressCorpsItem, PressCorpsResponse } from "@/app/api/press-corps/route";

/** How often (ms) the client re-checks the proxy for fresh posts (10 minutes). */
const REFRESH_INTERVAL_MS = 600_000;
/** How often (ms) the "updated Xs ago" counter ticks. */
const TICK_INTERVAL_MS = 1_000;

/** Cached @seamunth_press profile picture (always available even when feed is empty). */
const AVATAR_SRC = "/api/press-corps/avatar";

function proxied(url: string | null): string | undefined {
  if (!url) return undefined;
  return `/api/press-corps/image?u=${encodeURIComponent(url)}`;
}

function formatCount(n: number | null): string | null {
  if (n == null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

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

export function PressCorpsView() {
  const t = useTranslations("pressCorps");
  const relativeTime = useRelativeTime(t);

  const [data, setData] = useState<PressCorpsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState(AVATAR_SRC);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const lastUpdatedRef = useRef<number>(Date.now());

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/press-corps", { cache: "no-store" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = (await res.json()) as PressCorpsResponse;
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
    void fetchFeed();
    const id = window.setInterval(() => void fetchFeed(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [fetchFeed]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), TICK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const items: PressCorpsItem[] = useMemo(() => data?.items ?? [], [data]);
  const handle = data?.handle ?? "seamunth_press";
  const profileUrl = data?.profileUrl ?? "https://www.instagram.com/seamunth_press/";
  const secondsSinceUpdate = Math.max(0, Math.floor((nowMs - lastUpdatedRef.current) / 1000));
  const followers = formatCount(data?.followers ?? null);
  const posts = formatCount(data?.postCount ?? null);
  const showAvatarImage = avatarSrc.length > 0;

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      {/* Profile header */}
      <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-white/15 bg-black/25 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white ring-2 ring-white/20">
            {showAvatarImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt={`@${handle} profile`}
                className="h-full w-full object-cover"
                onError={() => {
                  const fallback = proxied(data?.avatarUrl ?? null);
                  if (fallback && avatarSrc !== fallback) {
                    setAvatarSrc(fallback);
                    return;
                  }
                  setAvatarSrc("");
                }}
              />
            ) : (
              <Camera className="h-6 w-6" aria-hidden />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:color-mix(in_srgb,var(--accent)_20%,transparent)] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--accent)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
                </span>
                {t("liveBadge")}
              </span>
              <p className="min-w-0 break-words font-display text-lg font-semibold text-brand-navy">
                {data?.fullName || t("title")}
              </p>
            </div>
            <p className="mt-0.5 truncate text-sm text-brand-muted">@{handle}</p>
            {followers || posts ? (
              <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-brand-muted">
                {posts ? <span>{t("postsCount", { count: posts })}</span> : null}
                {followers ? <span>{t("followersCount", { count: followers })}</span> : null}
              </p>
            ) : null}
          </div>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition [-webkit-tap-highlight-color:transparent] touch-manipulation hover:opacity-90 active:opacity-80"
          >
            <Camera className="h-4 w-4" aria-hidden />
            {t("follow")}
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-white/10 px-4 py-2 sm:px-5">
          <span className="min-w-0 flex-1 truncate text-xs text-brand-muted">{t("description")}</span>
          <span className="shrink-0 font-mono text-xs tabular-nums text-brand-muted">
            {loadError ? t("reconnecting") : t("updatedAgo", { count: secondsSinceUpdate })}
          </span>
        </div>
      </div>

      {/* Feed grid */}
      {items.length === 0 ? (
        <div className="w-full min-w-0 rounded-2xl border border-white/15 bg-black/25 p-6 text-center shadow-sm backdrop-blur-sm">
          <Camera className="mx-auto h-8 w-8 text-brand-muted" aria-hidden />
          <p className="mt-3 text-sm text-brand-muted">
            {loading ? t("loading") : loadError ? t("error") : t("empty")}
          </p>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-brand-navy transition hover:bg-white/10 [-webkit-tap-highlight-color:transparent] touch-manipulation active:opacity-80"
          >
            {t("openOnInstagram")}
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
          {items.map((item) => (
            <a
              key={item.id}
              href={item.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block aspect-square min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/30 [-webkit-tap-highlight-color:transparent] touch-manipulation active:opacity-80"
            >
              {item.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proxied(item.thumbnailUrl)}
                  alt={item.caption || handle}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-brand-muted">
                  {item.caption || t("viewPost")}
                </span>
              )}
              {item.isVideo ? (
                <span className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white backdrop-blur-sm">
                  <Play className="h-3.5 w-3.5" aria-hidden />
                </span>
              ) : null}
              <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <span className="line-clamp-2 break-words text-[0.7rem] leading-snug text-white">
                  {item.caption}
                </span>
              </span>
              {item.takenAt ? (
                <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/45 px-1.5 py-0.5 font-mono text-[0.6rem] text-white/90 backdrop-blur-sm">
                  {relativeTime(item.takenAt, nowMs)}
                </span>
              ) : null}
            </a>
          ))}
        </div>
      )}

      <p className="break-words text-xs text-brand-muted">{t("attribution")}</p>
    </div>
  );
}
