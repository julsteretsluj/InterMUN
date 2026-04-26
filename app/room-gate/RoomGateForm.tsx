"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { joinRoomByCode } from "@/app/actions/roomGate";

type Props = {
  nextPath: string;
  showStaffTools: boolean;
};

export function RoomGateForm({ nextPath, showStaffTools }: Props) {
  const tCommon = useTranslations("common");
  const tTab = useTranslations("tabNav");
  const tRoom = useTranslations("roomGate");
  const tSetup = useTranslations("conferenceSetupForm");
  const tForm = useTranslations("roomGateForm");
  const [state, formAction, pending] = useActionState(joinRoomByCode, null);

  useEffect(() => {
    if (state?.error) {
      document.getElementById("room-gate-error")?.focus();
    }
  }, [state?.error]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={nextPath} />

      <div>
        <label
          htmlFor="code"
          className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
        >
          {tTab("committeeCode")}
        </label>
        <input
          id="code"
          name="code"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          required
          minLength={6}
          maxLength={6}
          pattern="[A-Za-z0-9]{6}"
          title={tSetup("committeeCodeTitle")}
          className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-black/25 text-brand-navy font-mono tracking-widest text-center text-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
          placeholder={tSetup("committeeCodePlaceholder")}
        />
        <p className="text-xs text-brand-muted mt-1.5">{tSetup("committeeCodeHelp")}</p>
      </div>

      {state?.error && (
        <p
          id="room-gate-error"
          tabIndex={-1}
          className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
          role="alert"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 rounded-lg bg-brand-paper text-brand-navy font-medium hover:bg-brand-navy-soft transition-colors disabled:opacity-50"
      >
        {pending ? tForm("joining") : tRoom("joinCommittee")}
      </button>

      {showStaffTools && (
        <p className="text-center text-sm text-brand-muted">
          {tForm("chairOrSmt")}{" "}
          <Link href="/chair/room-code" className="text-brand-accent font-medium hover:underline">
            {tForm("setCommitteeCode")}
          </Link>
        </p>
      )}

      <p className="text-center text-sm text-brand-muted">
        <Link href="/login" className="text-brand-accent hover:underline">
          {tCommon("useDifferentAccount")}
        </Link>
      </p>
    </form>
  );
}
