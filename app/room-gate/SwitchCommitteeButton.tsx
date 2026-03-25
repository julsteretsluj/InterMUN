"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearRoomAndCommitteeContext } from "@/app/actions/roomGate";

export function SwitchCommitteeButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await clearRoomAndCommitteeContext();
          router.refresh();
        });
      }}
      className="block w-full text-center py-3 rounded-lg border border-brand-navy/20 text-brand-navy font-medium hover:bg-brand-cream disabled:opacity-50"
    >
      {pending ? "…" : "Switch committee (new room code)"}
    </button>
  );
}
