"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StanceHeatmap } from "./StanceHeatmap";

interface Allocation {
  id: string;
  country: string;
  conference_id: string;
  notes?: { id: string; content: string | null }[];
}

export function StancesView({
  allocations,
  stanceOverview,
}: {
  allocations: Allocation[];
  stanceOverview: Record<string, number>;
}) {
  const [selectedAllocation, setSelectedAllocation] =
    useState<Allocation | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [stanceForm, setStanceForm] = useState({ topic: "", extent: 5 });
  const [stanceData, setStanceData] = useState<Record<string, number>>(
    stanceOverview || {}
  );
  const supabase = createClient();

  async function saveStanceNote() {
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
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          To what extent does your allocation support ___? (1–5 scale)
        </p>
        <div className="flex gap-4 flex-wrap items-end mb-4">
          <input
            type="text"
            value={stanceForm.topic}
            onChange={(e) =>
              setStanceForm({ ...stanceForm, topic: e.target.value })
            }
            placeholder="e.g. climate action"
            className="px-3 py-2 border rounded dark:bg-slate-700 w-48"
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
        </div>
        <StanceHeatmap data={stanceData} />
      </div>
      <div>
        <h3 className="font-semibold mb-4">Notes per Allocation</h3>
        <div className="flex gap-6">
          <div className="w-48 space-y-2">
            {allocations.length === 0 ? (
              <p className="text-sm text-slate-500">No allocations yet</p>
            ) : (
              allocations.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setSelectedAllocation(a);
                    setNoteContent(a.notes?.[0]?.content || "");
                  }}
                  className={`block w-full text-left px-3 py-2 rounded ${
                    selectedAllocation?.id === a.id
                      ? "bg-blue-600 text-white"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
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
                className="w-full h-40 px-3 py-2 border rounded dark:bg-slate-700"
                placeholder="Stance notes for this allocation..."
              />
              <button
                onClick={saveStanceNote}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
