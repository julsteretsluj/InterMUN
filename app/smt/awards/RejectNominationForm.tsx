"use client";

import { rejectNominationAction } from "@/app/actions/awards";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  nominationId: string;
};

export function RejectNominationForm({ nominationId }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-1"
      action={async (formData) => {
        setError(null);
        const res = await rejectNominationAction(formData);
        if (res.error) {
          setError(res.error);
          return;
        }
        router.refresh();
      }}
    >
      <input type="hidden" name="nomination_id" value={nominationId} />
      <button
        type="submit"
        className="text-xs px-2 py-1 rounded border border-red-200 bg-red-50 text-red-900 font-medium hover:bg-red-100 disabled:opacity-60"
      >
        Reject — show backup
      </button>
      {error ? <span className="text-[10px] text-red-700 max-w-[12rem]">{error}</span> : null}
    </form>
  );
}
