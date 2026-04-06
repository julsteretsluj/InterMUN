"use client";

import { promoteNominationToAwardAction } from "@/app/actions/awards";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  nominationId: string;
  category: string;
  label: string;
  buttonClassName: string;
};

export function PromoteNominationForm({ nominationId, category, label, buttonClassName }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-1"
      action={async (formData) => {
        setError(null);
        const res = await promoteNominationToAwardAction(formData);
        if (!res.success) {
          setError(res.error ?? "Could not save award.");
          return;
        }
        await router.refresh();
      }}
    >
      <input type="hidden" name="nomination_id" value={nominationId} />
      <input type="hidden" name="category" value={category} />
      <button type="submit" className={buttonClassName}>
        {label}
      </button>
      {error ? <span className="text-[10px] text-red-700 max-w-[12rem]">{error}</span> : null}
    </form>
  );
}
