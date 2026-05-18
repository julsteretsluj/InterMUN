"use client";

import { useRouter } from "next/navigation";
import type { DelegationNoteBundleItem } from "@/lib/delegation-notes-bundle";
import { SmtNotesCompose } from "./SmtNotesCompose";
import { SmtNotesTabs } from "./SmtNotesTabs";

type CommitteeOpt = { id: string; label: string };

export function SmtNotesPageClient({
  title,
  subtitle,
  initialNotes,
  committees,
  conferenceIdToCanonical,
  myUserId,
  myProfileName,
  myAllocationIds,
  advisorByAllocationId,
  advisorNameByProfileId,
}: {
  title: string;
  subtitle: string;
  initialNotes: DelegationNoteBundleItem[];
  committees: CommitteeOpt[];
  conferenceIdToCanonical: Record<string, string>;
  myUserId: string;
  myProfileName: string;
  myAllocationIds: string[];
  advisorByAllocationId: Record<string, { advisorProfileId: string; name: string }>;
  advisorNameByProfileId: Record<string, string>;
}) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold text-brand-navy md:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-brand-muted">{subtitle}</p>
      </header>

      <SmtNotesCompose
        committees={committees}
        myUserId={myUserId}
        myProfileName={myProfileName}
        onNoteCreated={() => router.refresh()}
      />

      <SmtNotesTabs
        initialNotes={initialNotes}
        committees={committees}
        conferenceIdToCanonical={conferenceIdToCanonical}
        myUserId={myUserId}
        myAllocationIds={myAllocationIds}
        advisorByAllocationId={advisorByAllocationId}
        advisorNameByProfileId={advisorNameByProfileId}
      />
    </div>
  );
}
