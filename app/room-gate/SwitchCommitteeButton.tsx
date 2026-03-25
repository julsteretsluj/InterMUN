"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearCommitteeContextOnly } from "@/app/actions/roomGate";

export function SwitchCommitteeButton({ nextPath = "/profile" }: { nextPath?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await clearCommitteeContextOnly();
          router.push(`/room-gate?next=${encodeURIComponent(nextPath)}`);
        });
      }}
      className="block w-full text-center py-3 rounded-lg border border-brand-navy/20 text-brand-navy font-medium hover:bg-brand-cream disabled:opacity-50"
    >
      {pending ? "…" : "Switch committee (new committee code)"}
    </button>
  );
}
