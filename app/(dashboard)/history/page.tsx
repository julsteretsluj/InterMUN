import { createClient } from "@/lib/supabase/server";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { getResolvedDebateConferenceBundle } from "@/lib/active-debate-topic";
import { SessionHistoryPanel } from "@/components/session/SessionHistoryPanel";
import { MunPageShell } from "@/components/MunPageShell";
import { getTranslations } from "next-intl/server";

export default async function HistoryPage() {
  const t = await getTranslations("pageTitles");
  const supabase = await createClient();
  const activeConferenceId = await requireActiveConferenceId();
  const bundle = await getResolvedDebateConferenceBundle(supabase, activeConferenceId);

  return (
    <MunPageShell title={t("history")}>
      <SessionHistoryPanel
        conferenceId={bundle.debateConferenceId}
        conferenceIds={bundle.siblingConferenceIds}
      />
    </MunPageShell>
  );
}
