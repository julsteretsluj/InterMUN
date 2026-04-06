"use client";

import { promoteNominationToAwardAction } from "@/app/actions/awards";
import { useRouter } from "next/navigation";

type Props = {
  nominationId: string;
  category: string;
  label: string;
  buttonClassName: string;
};

export function PromoteNominationForm({ nominationId, category, label, buttonClassName }: Props) {
  const router = useRouter();
  return (
    <form
      action={async (formData) => {
        await promoteNominationToAwardAction(formData);
        router.refresh();
      }}
    >
      <input type="hidden" name="nomination_id" value={nominationId} />
      <input type="hidden" name="category" value={category} />
      <button type="submit" className={buttonClassName}>
        {label}
      </button>
    </form>
  );
}
