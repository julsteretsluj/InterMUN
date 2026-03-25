"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearRoomAndCommitteeContext } from "@/app/actions/roomGate";

export function SwitchConferenceButton({ nextPath = "/profile" }: { nextPath?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await clearRoomAndCommitteeContext();
          router.push(`/event-gate?next=${encodeURIComponent(nextPath)}`);
        });
      }}
      className="block w-full text-center py-3 rounded-lg border border-brand-navy/20 text-brand-navy text-sm font-medium hover:bg-brand-cream disabled:opacity-50"
    >
      {pending ? "…" : "Switch conference (new conference code)"}
    </button>
  );
}
