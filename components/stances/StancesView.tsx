"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { StanceHeatmap } from "./StanceHeatmap";
import { detectInappropriateTerms } from "@/lib/note-moderation";
import { HelpButton } from "@/components/HelpButton";

interface Allocation {
  id: string;
  country: string;
  user_id: string | null;
  conference_id: string;
  notes?: { id: string; content: string | null }[];
}

export function StancesView({
  allocations,
  stanceOverviewByUser,
  currentUserId,
  canEdit,
}: {
  allocations: Allocation[];
  stanceOverviewByUser: Record<string, Record<string, number>>;
  currentUserId: string;
  canEdit: boolean;
}) {
  const t = useTranslations("views.stances");
  const tc = useTranslations("common");
  const router = useRouter();
  const [selectedAllocation, setSelectedAllocation] =
    useState<Allocation | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [stanceForm, setStanceForm] = useState({ topic: "", extent: 5 });
  const [stanceData, setStanceData] = useState<Record<string, number>>(
    (() => {
      const fallbackUser = currentUserId;
      return stanceOverviewByUser[fallbackUser] || {};
    })()
  );
  const [mutationError, setMutationError] = useState<string | null>(null);
  const supabase = createClient();
  const stanceNoteFlaggedTerms = detectInappropriateTerms(noteContent);

  useEffect(() => {
    setSelectedAllocation((prev) => {
      if (!prev) return prev;
      const next = allocations.find((a) => a.id === prev.id);
      return next ?? prev;
    });
  }, [allocations]);

  useEffect(() => {
    if (!selectedAllocation?.user_id) return;
    const uid = selectedAllocation.user_id;
    const row = stanceOverviewByUser[uid];
    if (row) setStanceData(row);
  }, [selectedAllocation?.user_id, stanceOverviewByUser]);

  useEffect(() => {
    if (!canEdit) return;
    const row = stanceOverviewByUser[currentUserId];
    if (row) setStanceData(row);
  }, [canEdit, stanceOverviewByUser, currentUserId]);

  async function saveStanceNote() {
    setMutationError(null);
    if (!canEdit) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !selectedAllocation) return;
    const existingNote = selectedAllocation.notes?.[0];
    if (existingNote) {
      const { error } = await supabase
        .from("notes")
        .update({
          content: noteContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingNote.id);
      if (error) {
        setMutationError(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("notes").insert({
        user_id: user.id,
        allocation_id: selectedAllocation.id,
        note_type: "stance",
        content: noteContent,
      });
      if (error) {
        setMutationError(error.message);
        return;
      }
    }
    const { data, error: listErr } = await supabase
      .from("allocations")
      .select("*, notes(*)")
      .eq("user_id", user.id);
    if (listErr) {
      setMutationError(listErr.message);
      router.refresh();
      return;
    }
    if (data) {
      const a = data.find((x) => x.id === selectedAllocation.id);
      if (a) setSelectedAllocation(a);
    }
    router.refresh();
  }

  async function addStanceToHeatmap() {
    setMutationError(null);
    if (!canEdit) return;
    if (!stanceForm.topic.trim()) return;
    const updated = {
      ...stanceData,
      [stanceForm.topic]: stanceForm.extent,
    };
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        stance_overview: updated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (error) {
      setMutationError(error.message);
      return;
    }
    setStanceData(updated);
    setStanceForm({ topic: "", extent: 5 });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {mutationError ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100"
          role="alert"
        >
          {mutationError}
        </p>
      ) : null}
      <div>
        <h3 className="font-semibold mb-4">{t("heatmapTitle")}</h3>
        <p className="text-sm text-brand-muted text-brand-muted mb-3">
          {t("heatmapHelp")}
        </p>
        <div className="flex gap-4 flex-wrap items-end mb-4">
          {canEdit ? (
            <>
              <input
                type="text"
                value={stanceForm.topic}
                onChange={(e) =>
                  setStanceForm({ ...stanceForm, topic: e.target.value })
                }
                placeholder={t("topicPlaceholder")}
                className="px-3 py-2 border rounded bg-black/30 w-48"
              />
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm">{t("extentLabel")}</label>
                <HelpButton title={t("extentHelpTitle")}>{t("extentHelpBody")}</HelpButton>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={stanceForm.extent}
                  onChange={(e) =>
                    setStanceForm({ ...stanceForm, extent: +e.target.value })
                  }
                  className="w-24"
                />
                <span>{stanceForm.extent}</span>
              </div>
              <button
                onClick={addStanceToHeatmap}
                className="px-4 py-2 bg-brand-accent text-white rounded hover:opacity-90"
              >
                {t("add")}
              </button>
            </>
          ) : (
            <p className="text-sm text-brand-muted/70">
              {t("viewOnlyHeatmap")}
            </p>
          )}
        </div>
        <StanceHeatmap data={stanceData} />
      </div>
      <div>
        <h3 className="font-semibold mb-4">{t("notesPerAllocation")}</h3>
        <div className="flex gap-6">
          <div className="w-48 space-y-2">
            {allocations.length === 0 ? (
              <p className="text-sm text-brand-muted/70">{t("noAllocationsYet")}</p>
            ) : (
              allocations.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setSelectedAllocation(a);
                    if (a.user_id && stanceOverviewByUser[a.user_id]) {
                      setStanceData(stanceOverviewByUser[a.user_id]);
                    }
                    setNoteContent(a.notes?.[0]?.content || "");
                  }}
                  className={`block w-full text-left px-3 py-2 rounded ${
                    selectedAllocation?.id === a.id
                      ? "bg-brand-accent text-white"
                      : "hover:bg-white/10"
                  }`}
                >
                  {a.country}
                </button>
              ))
            )}
          </div>
          {selectedAllocation && (
            <div className="flex-1">
              <h4 className="font-medium mb-2">{selectedAllocation.country}</h4>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full h-40 px-3 py-2 border rounded bg-black/30"
                placeholder={t("notesPlaceholder")}
                disabled={!canEdit}
              />
              {stanceNoteFlaggedTerms.length > 0 ? (
                <p className="mt-2 rounded-md border border-amber-300/50 bg-amber-50/70 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-400/35 dark:bg-amber-500/10 dark:text-amber-200">
                  {t("noteLanguageWarning")}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={saveStanceNote}
                  disabled={!canEdit}
                  className="mt-2 px-4 py-2 bg-brand-accent text-white rounded hover:opacity-90 disabled:opacity-50"
                >
                  {tc("save")}
                </button>
                <HelpButton title={t("saveHelpTitle")}>{t("saveHelpBody")}</HelpButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
