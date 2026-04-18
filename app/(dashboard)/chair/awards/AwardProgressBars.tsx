"use client";

import { type NominationRubricType } from "@/lib/seamuns-award-scoring";
import { useEffect, useMemo, useState } from "react";

const SAVED_EVENT = "chair-awards-slot-saved";

export function dispatchChairAwardsSlotSaved(key: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SAVED_EVENT, { detail: { key } }));
}

function mergeKeys(server: string[], optimistic: string[]): Set<string> {
  return new Set([...server, ...optimistic]);
}

type OverallProps = {
  serverCompletedKeys: string[];
  allRequiredKeys: string[];
};

export function OverallAwardsProgress({ serverCompletedKeys, allRequiredKeys }: OverallProps) {
  const [optimisticKeys, setOptimisticKeys] = useState<string[]>([]);

  useEffect(() => {
    const server = new Set(serverCompletedKeys);
    setOptimisticKeys((prev) => prev.filter((k) => !server.has(k)));
  }, [serverCompletedKeys]);

  useEffect(() => {
    const onSaved = (e: Event) => {
      const key = (e as CustomEvent<{ key: string }>).detail?.key;
      if (!key) return;
      setOptimisticKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    };
    window.addEventListener(SAVED_EVENT, onSaved);
    return () => window.removeEventListener(SAVED_EVENT, onSaved);
  }, []);

  const { completed, total, pct } = useMemo(() => {
    const total = allRequiredKeys.length;
    const merged = mergeKeys(serverCompletedKeys, optimisticKeys);
    const completed = allRequiredKeys.filter((k) => merged.has(k)).length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { completed, total, pct };
  }, [allRequiredKeys, serverCompletedKeys, optimisticKeys]);

  return (
    <div className="rounded-xl border border-brand-navy/10 bg-logo-cyan/11 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-brand-navy/85">
        <span className="font-semibold uppercase tracking-wide">Overall awards completion</span>
        <span>
          {completed}/{total} complete
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-brand-navy/10">
        <div className="h-full bg-brand-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

type SectionProps = {
  nominationType: NominationRubricType;
  requiredRanks: number[];
  optionalRanks: number[];
  serverCompletedKeys: string[];
};

export function SectionAwardsProgress({
  nominationType,
  requiredRanks,
  optionalRanks,
  serverCompletedKeys,
}: SectionProps) {
  const [optimisticKeys, setOptimisticKeys] = useState<string[]>([]);
  const prefix = `${nominationType}:`;

  useEffect(() => {
    const server = new Set(serverCompletedKeys.filter((k) => k.startsWith(prefix)));
    setOptimisticKeys((prev) =>
      prev.filter((k) => {
        if (!k.startsWith(prefix)) return true;
        return !server.has(k);
      })
    );
  }, [serverCompletedKeys, prefix]);

  useEffect(() => {
    const onSaved = (e: Event) => {
      const key = (e as CustomEvent<{ key: string }>).detail?.key;
      if (!key || !key.startsWith(prefix)) return;
      setOptimisticKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    };
    window.addEventListener(SAVED_EVENT, onSaved);
    return () => window.removeEventListener(SAVED_EVENT, onSaved);
  }, [prefix]);

  const { requiredCompleted, requiredTotal, optionalCompleted, optionalTotal, pct } = useMemo(() => {
    const merged = mergeKeys(
      serverCompletedKeys.filter((k) => k.startsWith(prefix)),
      optimisticKeys.filter((k) => k.startsWith(prefix))
    );
    const slotKey = (rank: number) => `${nominationType}:${rank}`;
    const requiredTotal = requiredRanks.length;
    const optionalTotal = optionalRanks.length;
    const requiredCompleted = requiredRanks.filter((r) => merged.has(slotKey(r))).length;
    const optionalCompleted = optionalRanks.filter((r) => merged.has(slotKey(r))).length;
    const pct = requiredTotal === 0 ? 100 : Math.round((requiredCompleted / requiredTotal) * 100);
    return { requiredCompleted, requiredTotal, optionalCompleted, optionalTotal, pct };
  }, [nominationType, optimisticKeys, prefix, optionalRanks, requiredRanks, serverCompletedKeys]);

  return (
    <div className="mt-3 rounded-lg border border-brand-navy/10 bg-logo-cyan/9 p-3">
      <div className="flex items-center justify-between text-xs text-brand-navy/85 mb-2">
        <span className="font-semibold">Progress (required)</span>
        <span>
          {requiredCompleted}/{requiredTotal} complete
        </span>
      </div>
      <div className="h-2 rounded-full bg-brand-navy/10 overflow-hidden">
        <div className="h-full bg-brand-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      {optionalTotal > 0 ? (
        <p className="mt-2 text-[0.72rem] text-brand-muted">
          Optional slots: {optionalCompleted}/{optionalTotal} filled
        </p>
      ) : null}
    </div>
  );
}
