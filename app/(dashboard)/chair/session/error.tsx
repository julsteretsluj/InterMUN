"use client";

import Link from "next/link";

export default function ChairSessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mun-shell rounded-xl border border-rose-500/35 bg-rose-950/15 p-6 text-brand-navy dark:text-zinc-100">
      <p className="font-display text-lg font-semibold">Session floor failed to load</p>
      <p className="mt-2 text-sm text-brand-muted dark:text-zinc-400">
        {error.message || "An unexpected error occurred while loading chair session controls."}
      </p>
      {error.digest ? (
        <p className="mt-1 font-mono text-xs text-brand-muted/80">Reference: {error.digest}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Reload
        </button>
        <Link
          href="/chair"
          className="rounded-lg border border-white/20 bg-black/20 px-4 py-2 text-sm font-medium hover:bg-black/30"
        >
          Back to chair dashboard
        </Link>
      </div>
    </div>
  );
}
