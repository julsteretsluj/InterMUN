"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateConferenceEventAction,
  updateChamberCommitteeProfileAction,
  addChamberSecondTopicAction,
  type SmtFormState,
} from "@/app/actions/smtConference";
import { generateSixCharCommitteeCode } from "@/lib/committee-join-code";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { committeeSessionGroupKey } from "@/lib/committee-session-group";

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
  room_code: string | null;
  rop_document_url: string | null;
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
  const committeeGroups = useMemo(() => {
    const m = new Map<string, CommitteeRow[]>();
    for (const c of committees) {
      const k = committeeSessionGroupKey(c.committee) ?? `__id:${c.id}`;
      const list = m.get(k) ?? [];
      list.push(c);
      m.set(k, list);
    }
    for (const list of m.values()) {
      list.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
      );
    }
    return Array.from(m.entries()).sort(([ka], [kb]) => {
      const aUng = ka.startsWith("__id:");
      const bUng = kb.startsWith("__id:");
      if (aUng !== bUng) return aUng ? 1 : -1;
      return ka.localeCompare(kb);
    });
  }, [committees]);

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
            committeeGroups.map(([, rows]) => (
              <ChamberCommitteeCard key={rows.map((r) => r.id).join("-")} rows={rows} t={t} />
            ))
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

function ChamberCommitteeCard({
  rows,
  t,
}: {
  rows: CommitteeRow[];
  t: ReturnType<typeof useTranslations>;
}) {
  const anchor = rows[0]!;
  const second = rows[1];
  const router = useRouter();
  const [state, action, pending] = useActionState(updateChamberCommitteeProfileAction, null as SmtFormState | null);
  const [addPending, startAdd] = useTransition();
  const suggestedCode = generateSixCharCommitteeCode(anchor.committee ?? "", anchor.id);
  const supabase = createClient();

  const [uploadPending, setUploadPending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [addTopicError, setAddTopicError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState(anchor.committee_logo_url ?? "");

  const roomCodeDefault = (anchor.room_code ?? anchor.committee_code ?? "").trim();
  const ropDefault = (anchor.rop_document_url ?? "").trim();

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
    if (!anchor.committee_code) {
      setUploadError(t("errorCommitteeCodeMissing"));
      return;
    }

    setUploadPending(true);
    try {
      const bucketName = "committee-logos";
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "png";

      const objectPath = `committees/${anchor.event_id}/${anchor.committee_code}/${Date.now()}.${safeExt}`;

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

      const { error: updateErr } = await supabase
        .from("conferences")
        .update({ committee_logo_url: publicUrlData.publicUrl })
        .eq("event_id", anchor.event_id)
        .eq("committee_code", anchor.committee_code);

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

  function handleAddTopic() {
    setAddTopicError(null);
    startAdd(async () => {
      const res = await addChamberSecondTopicAction(anchor.id);
      if (res.error) {
        setAddTopicError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={action} className="border border-brand-navy/10 rounded-xl p-4 space-y-3 bg-brand-cream/20 dark:bg-white/5">
      <input type="hidden" name="anchor_conference_id" value={anchor.id} />

      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">{t("committeeLabelShort")}</label>
        <input
          name="committee"
          required
          defaultValue={anchor.committee ?? ""}
          placeholder={t("committeeLabelPlaceholder")}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">{t("officialCommitteeNameGrid")}</label>
        <input
          name="committee_full_name"
          defaultValue={anchor.committee_full_name ?? ""}
          placeholder={t("officialCommitteeNamePlaceholder")}
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
        <label className="block text-xs font-medium text-brand-muted mb-1">{t("topic1Label")}</label>
        <input
          name="topic_1"
          required
          minLength={2}
          defaultValue={anchor.name}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">{t("topic2Label")}</label>
        <input
          name="topic_2"
          minLength={2}
          defaultValue={second?.name ?? ""}
          disabled={!second}
          placeholder={second ? t("topic2Placeholder") : t("topic2DisabledHint")}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm disabled:opacity-60"
        />
        {!second ? (
          <div className="mt-2 space-y-1">
            <button
              type="button"
              disabled={addPending}
              onClick={() => handleAddTopic()}
              className="text-sm px-3 py-1.5 rounded-lg border border-brand-navy/20 text-brand-navy hover:bg-brand-cream disabled:opacity-50"
            >
              {addPending ? t("addingTopic") : t("addSecondTopic")}
            </button>
            {addTopicError ? (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1">{addTopicError}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">{t("ropDocumentLink")}</label>
        <input
          name="rop_document_url"
          type="url"
          defaultValue={ropDefault}
          placeholder={t("ropDocumentPlaceholder")}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm font-mono"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">{t("roomCodeLabel")}</label>
        <input
          name="room_code"
          required
          minLength={6}
          maxLength={6}
          pattern="[A-Za-z0-9]{6}"
          title={t("exactlySixLettersDigits")}
          defaultValue={roomCodeDefault}
          placeholder={t("committeeCodePlaceholder")}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 font-mono text-sm tracking-widest"
        />
        <p className="text-xs text-brand-muted mt-1">
          {t("roomCodeHelpPrefix")} <span className="font-mono text-brand-navy">{suggestedCode}</span>
          {t("roomCodeHelpSuffix")}
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">{t("procedureProfile")}</label>
        <select
          name="procedure_profile"
          defaultValue={anchor.procedure_profile ?? "default"}
          className="w-full rounded-lg border border-brand-navy/15 bg-white px-3 py-2 text-sm text-brand-navy dark:bg-zinc-950 dark:text-zinc-100"
        >
          <option value="default">{t("procedureDefault")}</option>
          <option value="eu_parliament">{t("procedureEuParliament")}</option>
        </select>
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
