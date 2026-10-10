// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RopCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[20px] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

export function RopHeading({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-4 space-y-1">
      <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">{children}</h2>
      {hint ? <p className="text-[13px] leading-relaxed text-[#6E6E73]">{hint}</p> : null}
    </div>
  );
}

type Tone = "primary" | "secondary" | "danger" | "ghost";

export function RopButton({
  tone = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  const base =
    "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[980px] px-4 text-[13px] font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50";
  const tones: Record<Tone, string> = {
    primary: "bg-[#007AFF] text-white hover:bg-[#0077ED]",
    secondary: "border border-[#D1D1D6] bg-[#F2F2F7] text-[#1D1D1F] hover:bg-[#E5E5EA]",
    danger: "border border-[#D1D1D6] bg-white text-[#C62828] hover:bg-[#FFF1F0]",
    ghost: "text-[#007AFF] hover:text-[#0077ED]",
  };
  return <button type="button" {...props} className={`${base} ${tones[tone]} ${className}`} />;
}

const STATUS_TONE: Record<string, string> = {
  draft: "bg-[#F2F2F7] text-[#6E6E73]",
  awaiting_signatures: "bg-[#FFF4E5] text-[#8A4B00]",
  pending: "bg-[#E8F1FF] text-[#0057B8]",
  on_floor: "bg-[#EEE8FF] text-[#5B3CC4]",
  approved: "bg-[#E7F7EC] text-[#1B7F3B]",
  approved_with_conditions: "bg-[#EEF7E3] text-[#4A7A12]",
  rejected: "bg-[#FDECEC] text-[#B3261E]",
  needs_revision: "bg-[#FFF4E5] text-[#8A4B00]",
  withdrawn: "bg-[#F2F2F7] text-[#AEAEB2]",
};

export function RopStatusPill({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-[980px] px-2.5 py-0.5 text-[12px] font-semibold ${STATUS_TONE[status] ?? "bg-[#F2F2F7] text-[#6E6E73]"}`}
    >
      {label}
    </span>
  );
}

export const ropInputClass =
  "w-full rounded-[10px] border border-[#D1D1D6] bg-white px-3 py-2 text-[14px] text-[#1D1D1F] placeholder:text-[#AEAEB2] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20";

export function RopField({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-semibold text-[#1D1D1F]">
        {label}
        {required ? <span className="text-[#007AFF]"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="block text-[12px] text-[#6E6E73]">{hint}</span> : null}
    </label>
  );
}

export function RopNotice({ tone = "info", children }: { tone?: "info" | "error" | "ok"; children: ReactNode }) {
  const tones = {
    info: "border-[#D1D1D6] bg-[#F2F2F7] text-[#1D1D1F]",
    error: "border-[#F5C2C0] bg-[#FDECEC] text-[#B3261E]",
    ok: "border-[#BFE5CB] bg-[#E7F7EC] text-[#1B7F3B]",
  };
  return <p className={`rounded-[12px] border px-4 py-3 text-[13px] leading-relaxed ${tones[tone]}`}>{children}</p>;
}

/** Refresh server data when any of these FWC tables change for the conference. */
export function useFwcRealtimeRefresh(canonicalConferenceId: string, tables: readonly string[], unfiltered: readonly string[] = []) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = [...tables, "|", ...unfiltered].join(",");
  useEffect(() => {
    const supabase = createClient();
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 350);
    };
    let ch = supabase.channel(`fwc-rop-${canonicalConferenceId}-${key}`);
    for (const table of tables) {
      ch = ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `conference_id=eq.${canonicalConferenceId}` },
        refresh
      );
    }
    for (const table of unfiltered) {
      ch = ch.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    }
    ch.subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      void supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures the table lists
  }, [canonicalConferenceId, key, router]);
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
