"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StanceHeatmap } from "./StanceHeatmap";
import { detectInappropriateTerms } from "@/lib/note-moderation";

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
  const supabase = createClient();
  const stanceNoteFlaggedTerms = detectInappropriateTerms(noteContent);

  useEffect(() => {
    if (!selectedAllocation) return;
    const uid = selectedAllocation.user_id;
    if (uid && stanceOverviewByUser[uid]) setStanceData(stanceOverviewByUser[uid]);
  }, [selectedAllocation, stanceOverviewByUser]);

  async function saveStanceNote() {
    if (!canEdit) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !selectedAllocation) return;
    const existingNote = selectedAllocation.notes?.[0];
    if (existingNote) {
      await supabase
        .from("notes")
        .update({
          content: noteContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingNote.id);
    } else {
      await supabase.from("notes").insert({
        user_id: user.id,
        allocation_id: selectedAllocation.id,
        note_type: "stance",
        content: noteContent,
      });
    }
    const { data } = await supabase
      .from("allocations")
      .select("*, notes(*)")
      .eq("user_id", user.id);
    if (data) {
      const a = data.find((x) => x.id === selectedAllocation.id);
      if (a) setSelectedAllocation(a);
    }
  }

  async function addStanceToHeatmap() {
    if (!canEdit) return;
    if (!stanceForm.topic.trim()) return;
    const updated = {
      ...stanceData,
      [stanceForm.topic]: stanceForm.extent,
    };
    setStanceData(updated);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("profiles")
      .update({
        stance_overview: updated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setStanceForm({ topic: "", extent: 5 });
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold mb-4">Brief Stance Overview (Heatmap)</h3>
        <p className="text-sm text-brand-muted text-brand-muted mb-3">
          To what extent does your allocation support ___? (1–5 scale)
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
                placeholder="e.g. climate action"
                className="px-3 py-2 border rounded bg-black/30 w-48"
              />
              <div className="flex items-center gap-2">
                <label className="text-sm">Extent (1–5):</label>
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
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
            </>
          ) : (
            <p className="text-sm text-brand-muted/70">
              View-only heatmap for staff.
            </p>
          )}
        </div>
        <StanceHeatmap data={stanceData} />
      </div>
      <div>
        <h3 className="font-semibold mb-4">Notes per Allocation</h3>
        <div className="flex gap-6">
          <div className="w-48 space-y-2">
            {allocations.length === 0 ? (
              <p className="text-sm text-brand-muted/70">No allocations yet</p>
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
                      ? "bg-blue-600 text-white"
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
                placeholder="Stance notes for this allocation..."
                disabled={!canEdit}
              />
              {stanceNoteFlaggedTerms.length > 0 ? (
                <p className="mt-2 rounded-md border border-amber-300/50 bg-amber-50/70 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-400/35 dark:bg-amber-500/10 dark:text-amber-200">
                  Reader warning: this note may contain inappropriate language.
                </p>
              ) : null}
              <button
                onClick={saveStanceNote}
                disabled={!canEdit}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
