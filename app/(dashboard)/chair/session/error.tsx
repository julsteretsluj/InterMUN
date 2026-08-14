"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function ChairSessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("chairSessionError");
  const tCommon = useTranslations("common");
  return (
    <div className="mun-shell rounded-xl border border-rose-500/35 bg-rose-950/15 p-6 text-brand-navy dark:text-zinc-100">
      <p className="font-sans text-lg font-semibold">{t("title")}</p>
      <p className="mt-2 text-sm text-brand-muted dark:text-zinc-400">
        {error.message || t("fallback")}
      </p>
      {error.digest ? (
        <p className="mt-1 font-mono text-xs text-brand-muted/80">{t("reference", { digest: error.digest })}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {tCommon("reload")}
        </button>
        <Link
          href="/chair"
          className="rounded-lg border border-white/20 bg-black/20 px-4 py-2 text-sm font-medium hover:bg-black/30"
        >
          {t("backToDashboard")}
        </Link>
      </div>
    </div>
  );
}
