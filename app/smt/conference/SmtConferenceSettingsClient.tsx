"use client";

import { useActionState, useState } from "react";
import {
  updateConferenceEventAction,
  updateCommitteeSessionAction,
  type SmtFormState,
} from "@/app/actions/smtConference";
import { generateSixCharCommitteeCode } from "@/lib/committee-join-code";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

type EventRow = { id: string; name: string; tagline: string | null; event_code: string };
type CommitteeRow = {
  id: string;
  event_id: string;
  name: string;
  committee: string | null;
  tagline: string | null;
  committee_code: string | null;
  committee_full_name: string | null;
  chair_names: string | null;
  committee_logo_url: string | null;
  crisis_slides_url: string | null;
  consultation_before_moderated_caucus?: boolean | null;
  procedure_profile?: "default" | "eu_parliament" | null;
  eu_guided_workflow_enabled?: boolean | null;
};

export function SmtConferenceSettingsClient({
  eventRow,
  committees,
}: {
  eventRow: EventRow | null;
  committees: CommitteeRow[];
}) {
  const t = useTranslations("smtConferenceSettings");
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 md:p-8 shadow-sm">
        <h2 className="font-display text-xl font-semibold text-brand-navy mb-4">{t("eventDetails")}</h2>
        {!eventRow ? (
          <p className="text-sm text-brand-muted">
            {t("selectConferenceFirst")}
          </p>
        ) : (
          <EventForm eventRow={eventRow} t={t} />
        )}
      </section>

      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 md:p-8 shadow-sm">
        <h2 className="font-display text-xl font-semibold text-brand-navy mb-2">
          {t("committeeSessionsTitle")}
        </h2>
        <p className="text-sm text-brand-muted mb-6">
          {t("committeeSessionsBody")}
        </p>
        <div className="space-y-8">
          {committees.length === 0 ? (
            <p className="text-sm text-brand-muted">{t("noCommitteeSessions")}</p>
          ) : (
            committees.map((c) => <CommitteeForm key={c.id} row={c} t={t} />)
          )}
        </div>
      </section>
    </div>
  );
}

function EventForm({ eventRow, t }: { eventRow: EventRow; t: ReturnType<typeof useTranslations> }) {
  const [state, action, pending] = useActionState(updateConferenceEventAction, null as SmtFormState | null);

  return (
    <form action={action} className="max-w-xl space-y-4">
      <input type="hidden" name="event_id" value={eventRow.id} />
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1">
          {t("eventName")}
        </label>
        <input
          name="name"
          required
          minLength={2}
          defaultValue={eventRow.name}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15"
        />
      </div>
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1">
          {t("tagline")}
        </label>
        <input
          name="tagline"
          defaultValue={eventRow.tagline ?? ""}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15"
        />
      </div>
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1">
          {t("conferenceCodeFirstGate")}
        </label>
        <input
          name="event_code"
          required
          minLength={4}
          defaultValue={eventRow.event_code}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 font-mono"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{state.error}</p>
      )}
      {state?.success && <p className="text-sm text-brand-navy">{t("saved")}</p>}
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded-lg bg-brand-paper text-brand-navy font-medium disabled:opacity-50"
      >
        {pending ? t("saving") : t("saveConferenceEvent")}
      </button>
    </form>
  );
}

function CommitteeForm({ row, t }: { row: CommitteeRow; t: ReturnType<typeof useTranslations> }) {
  const [state, action, pending] = useActionState(updateCommitteeSessionAction, null as SmtFormState | null);
  const suggestedCode = generateSixCharCommitteeCode(row.committee ?? "", row.id);
  const supabase = createClient();

  const [uploadPending, setUploadPending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState(row.committee_logo_url ?? "");

  async function uploadCommitteeLogo(file: File) {
    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError(t("errorImageFile"));
      return;
    }
    if (file.size && file.size > 6 * 1024 * 1024) {
      setUploadError(t("errorImageTooLarge"));
      return;
    }
    if (!row.committee_code) {
      setUploadError(t("errorCommitteeCodeMissing"));
      return;
    }

    setUploadPending(true);
    try {
      const bucketName = "committee-logos";
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "png";

      const objectPath = `committees/${row.event_id}/${row.committee_code}/${Date.now()}.${safeExt}`;

      const { error: uploadErr } = await supabase.storage
        .from(bucketName)
        .upload(objectPath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadErr) {
        throw new Error(uploadErr.message);
      }

      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(objectPath);
      if (!publicUrlData?.publicUrl) {
        throw new Error(t("errorPublicUrl"));
      }

      // Persist immediately; apply to all topic rows for this committee in this event.
      const { error: updateErr } = await supabase
        .from("conferences")
        .update({ committee_logo_url: publicUrlData.publicUrl })
        .eq("event_id", row.event_id)
        .eq("committee_code", row.committee_code);

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      setLogoUrl(publicUrlData.publicUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("errorUploadFailed");
      setUploadError(msg);
    } finally {
      setUploadPending(false);
    }
  }

  return (
    <form action={action} className="border border-brand-navy/10 rounded-xl p-4 space-y-3 bg-brand-cream/20">
      <input type="hidden" name="conference_id" value={row.id} />
      <p className="text-xs font-mono text-brand-muted">{row.id.slice(0, 8)}…</p>
      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">{t("sessionTitle")}</label>
        <input
          name="name"
          required
          minLength={2}
          defaultValue={row.name}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">{t("chamberLabel")}</label>
        <input
          name="committee"
          defaultValue={row.committee ?? ""}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">{t("tagline")}</label>
        <input
          name="tagline"
          defaultValue={row.tagline ?? ""}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">
          {t("officialCommitteeName")}
        </label>
        <input
          name="committee_full_name"
          defaultValue={row.committee_full_name ?? ""}
          placeholder={t("officialCommitteeNamePlaceholder")}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">{t("chairNames")}</label>
        <input
          name="chair_names"
          defaultValue={row.chair_names ?? ""}
          placeholder={t("chairNamesPlaceholder")}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm"
        />
      </div>

      <div className="pt-1">
        <label className="block text-xs font-medium text-brand-muted mb-1">{t("committeeLogo")}</label>

        {logoUrl ? (
          <img
            src={logoUrl}
            alt={t("committeeLogo")}
            className="h-16 w-16 rounded-md object-contain bg-white/70 border border-brand-navy/10 mb-2"
          />
        ) : (
          <div className="h-16 w-16 rounded-md object-contain bg-white/30 border border-brand-navy/10 mb-2 text-center text-[0.65rem] leading-[4rem] text-brand-muted">
            —
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          disabled={uploadPending}
          className="w-full"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void uploadCommitteeLogo(file);
          }}
        />
        {uploadPending ? (
          <p className="text-xs text-brand-muted mt-1">{t("uploading")}</p>
        ) : null}
        {uploadError ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1 mt-2">
            {uploadError}
          </p>
        ) : null}
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">
          {t("crisisSlidesUrl")}
        </label>
        <input
          name="crisis_slides_url"
          type="url"
          defaultValue={row.crisis_slides_url ?? ""}
          placeholder={t("crisisSlidesPlaceholder")}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm font-mono"
        />
        <p className="text-xs text-brand-muted mt-1">
          {t("crisisSlidesHelpPrefix")} <span className="font-medium">{t("crisisSlidesLabel")}</span>{" "}
          {t("crisisSlidesHelpSuffix")}
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-brand-navy/15 bg-white/60 px-3 py-2.5 text-sm text-brand-navy">
        <input
          type="checkbox"
          name="consultation_before_moderated_caucus"
          value="on"
          defaultChecked={row.consultation_before_moderated_caucus !== false}
          className="mt-0.5 size-4 rounded border-brand-navy/25 text-brand-accent focus:ring-brand-accent"
        />
        <span>
          <span className="font-medium">{t("competingMotionsTitle")}</span>
          <span className="block text-xs text-brand-muted mt-1">
            {t("competingMotionsHelpPrefix")} <span className="font-medium">{t("moderatedCaucus")}</span>{" "}
            {t("competingMotionsHelpMiddle")} <span className="font-medium">{t("consultation")}</span>{" "}
            {t("competingMotionsHelpSuffix")}
          </span>
        </span>
      </label>

      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">{t("procedureProfile")}</label>
        <select
          name="procedure_profile"
          defaultValue={row.procedure_profile ?? "default"}
          className="w-full rounded-lg border border-brand-navy/15 bg-white px-3 py-2 text-sm text-brand-navy"
        >
          <option value="default">{t("procedureDefault")}</option>
          <option value="eu_parliament">{t("procedureEuParliament")}</option>
        </select>
      </div>

      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-brand-navy/15 bg-white/60 px-3 py-2.5 text-sm text-brand-navy">
        <input
          type="checkbox"
          name="eu_guided_workflow_enabled"
          value="on"
          defaultChecked={row.eu_guided_workflow_enabled ?? false}
          className="mt-0.5 size-4 rounded border-brand-navy/25 text-brand-accent focus:ring-brand-accent"
        />
        <span>
          <span className="font-medium">{t("euGuidedWorkflowChecks")}</span>
          <span className="block text-xs text-brand-muted mt-1">
            {t("euGuidedWorkflowHelp")}
          </span>
        </span>
      </label>

      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">
          {t("committeeRoomCodeSecondGate")}
        </label>
        <input
          name="committee_code"
          required
          minLength={6}
          maxLength={6}
          pattern="[A-Za-z0-9]{6}"
          title={t("exactlySixLettersDigits")}
          defaultValue={row.committee_code ?? ""}
          placeholder={t("committeeCodePlaceholder")}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 font-mono text-sm tracking-widest"
        />
        <p className="text-xs text-brand-muted mt-1">
          {t("committeeCodeHelpPrefix")}{" "}
          <span className="font-mono text-brand-navy">{suggestedCode}</span>).
        </p>
      </div>
      {state?.error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1">{state.error}</p>
      )}
      {state?.success && <p className="text-xs text-brand-navy">{t("saved")}</p>}
      <button
        type="submit"
        disabled={pending}
        className="text-sm px-3 py-1.5 rounded-lg bg-brand-accent text-white font-medium disabled:opacity-50"
      >
        {pending ? t("saving") : t("saveCommittee")}
      </button>
    </form>
  );
}
