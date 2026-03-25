"use client";

import { useEffect, useRef } from "react";
import { implicitJoinSingletonAction } from "@/app/actions/roomGate";

/** Auto-submit when the database has exactly one event and one committee. */
export function AutoJoinSingleton({ nextPath }: { nextPath: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;
    formRef.current?.requestSubmit();
  }, []);

  return (
    <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper/95 shadow-[0_20px_50px_-12px_rgba(10,22,40,0.18)] p-8 md:p-10 text-center text-sm text-brand-muted">
      <p className="mb-4">Only one conference and one committee are set up — signing you in…</p>
      <form ref={formRef} action={implicitJoinSingletonAction}>
        <input type="hidden" name="next" value={nextPath} />
        <button type="submit" className="text-brand-gold font-medium hover:underline">
          Tap here if nothing happens
        </button>
      </form>
    </div>
  );
}
