"use client";

import Link from "next/link";

type Props = {
  conferenceId: string;
  title: string;
  subtitle: string | null;
  committeeCode: string | null;
};

export function CommitteeLivePreview({
  conferenceId,
  title,
  subtitle,
  committeeCode,
}: Props) {
  return (
    <div className="rounded-xl border border-brand-navy/15 bg-white shadow-sm overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-brand-navy/10 bg-brand-cream/40 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-brand-navy text-sm truncate">{title}</p>
          {subtitle ? <p className="text-xs text-brand-muted truncate">{subtitle}</p> : null}
          {committeeCode ? (
            <p className="text-[0.65rem] font-mono text-brand-navy/70 mt-0.5">{committeeCode}</p>
          ) : null}
        </div>
        <Link
          href={`/smt/committees/${conferenceId}`}
          className="shrink-0 text-xs font-medium text-brand-gold hover:underline"
        >
          Full view
        </Link>
      </div>
    </div>
  );
}

