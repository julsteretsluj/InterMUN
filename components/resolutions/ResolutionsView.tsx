"use client";

import { useState } from "react";
import { FileCheck, Plus, Users } from "lucide-react";
import {
  addClauseAction,
  createResolutionAction,
  deleteClauseAction,
  joinBlocAction,
  signResolutionAction,
  updateClauseAction,
} from "@/app/actions/resolutions";

interface Resolution {
  id: string;
  google_docs_url: string | null;
  main_submitters: string[];
  co_submitters: string[];
  signatories: string[];
  visible_to_other_bloc: boolean;
}

interface Bloc {
  id: string;
  resolution_id: string;
  name: string;
  stance: string;
  bloc_memberships?: { user_id: string }[];
}

interface Clause {
  id: string;
  resolution_id: string;
  clause_number: number;
  clause_text: string;
  updated_at: string;
}

interface ClauseOutcome {
  id: string;
  vote_item_id: string;
  resolution_id: string;
  clause_id: string;
  passed: boolean;
  applied_at: string;
}

export function ResolutionsView({
  resolutions,
  blocs,
  clauses,
  clauseOutcomes,
  conferenceId,
  canCreate,
}: {
  resolutions: Resolution[];
  blocs: Bloc[];
  clauses: Clause[];
  clauseOutcomes: ClauseOutcome[];
  conferenceId: string;
  canCreate: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    google_docs_url: "",
    main_submitters: "",
    co_submitters: "",
    conference_id: conferenceId,
  });
  const [selectedBloc, setSelectedBloc] = useState<Record<string, string>>({});
  const [newClause, setNewClause] = useState<Record<string, string>>({});
  const [editingClause, setEditingClause] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  async function createResolution() {
    if (!canCreate) return;
    setActionError(null);
    const mainSubs = form.main_submitters
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const coSubs = form.co_submitters
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const result = await createResolutionAction({
      conferenceId,
      googleDocsUrl: form.google_docs_url || undefined,
      mainSubmitterIds: mainSubs,
      coSubmitterIds: coSubs,
    });
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setShowForm(false);
    setForm({
      google_docs_url: "",
      main_submitters: "",
      co_submitters: "",
      conference_id: conferenceId,
    });
    location.reload();
  }

  async function signResolution(resolutionId: string) {
    setActionError(null);
    const result = await signResolutionAction({ resolutionId });
    if (!result.ok) setActionError(result.error);
  }

  async function joinBloc(resolutionId: string, blocId: string) {
    setActionError(null);
    const result = await joinBlocAction({ resolutionId, blocId });
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setSelectedBloc((s) => ({ ...s, [resolutionId]: blocId }));
  }

  async function addClause(resolutionId: string) {
    if (!canCreate) return;
    setActionError(null);
    const text = (newClause[resolutionId] ?? "").trim();
    if (!text) return;

    const result = await addClauseAction({
      conferenceId,
      resolutionId,
      clauseText: text,
    });
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setNewClause((prev) => ({ ...prev, [resolutionId]: "" }));
    location.reload();
  }

  async function saveClause(clauseId: string) {
    if (!canCreate) return;
    setActionError(null);
    const text = (editingClause[clauseId] ?? "").trim();
    if (!text) return;
    const result = await updateClauseAction({ clauseId, clauseText: text });
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setEditingClause((prev) => ({ ...prev, [clauseId]: text }));
    location.reload();
  }

  async function deleteClause(clauseId: string) {
    if (!canCreate) return;
    setActionError(null);
    const result = await deleteClauseAction({ clauseId });
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    location.reload();
  }

  return (
    <div className="space-y-4">
      {canCreate ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Resolution
        </button>
      ) : null}
      {showForm && (
        <div className="p-4 border rounded-lg dark:border-slate-700 space-y-3">
          <input
            type="url"
            value={form.google_docs_url}
            onChange={(e) =>
              setForm({ ...form, google_docs_url: e.target.value })
            }
            placeholder="Google Docs URL"
            className="w-full px-3 py-2 border rounded dark:bg-slate-700"
          />
          <input
            value={form.main_submitters}
            onChange={(e) =>
              setForm({ ...form, main_submitters: e.target.value })
            }
            placeholder="Main submitters (user IDs, comma-separated)"
            className="w-full px-3 py-2 border rounded dark:bg-slate-700"
          />
          <input
            value={form.co_submitters}
            onChange={(e) =>
              setForm({ ...form, co_submitters: e.target.value })
            }
            placeholder="Co-submitters (user IDs, comma-separated)"
            className="w-full px-3 py-2 border rounded dark:bg-slate-700"
          />
          <div className="flex gap-2">
            <button
              onClick={createResolution}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {actionError ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">
          {actionError}
        </p>
      ) : null}
      <div className="space-y-4">
        {resolutions.map((r) => {
          const resolutionBlocs = blocs.filter((b) => b.resolution_id === r.id);
          const resolutionClauses = clauses.filter((c) => c.resolution_id === r.id);
          const outcomesForResolution = clauseOutcomes.filter((o) => o.resolution_id === r.id);
          const clauseIdToLabel = new Map(
            resolutionClauses.map((c) => [c.id, `Clause ${c.clause_number}`] as const)
          );
          return (
            <div
              key={r.id}
              className="p-4 border rounded-lg dark:border-slate-700 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  {r.google_docs_url ? (
                    <a
                      href={r.google_docs_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-2"
                    >
                      <FileCheck className="w-4 h-4" />
                      View Resolution
                    </a>
                  ) : (
                    <span className="text-slate-500">No link</span>
                  )}
                </div>
                {r.visible_to_other_bloc && (
                  <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                    Visible to other bloc
                  </span>
                )}
              </div>
              <div className="text-sm">
                Main subs: {r.main_submitters.length} | Co-subs:{" "}
                {r.co_submitters.length} | Signatories: {r.signatories.length}
              </div>
              {resolutionBlocs.length > 0 && (
                <div className="flex gap-2 items-center">
                  <Users className="w-4 h-4" />
                  {resolutionBlocs.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => joinBloc(r.id, b.id)}
                      className={`px-3 py-1 rounded text-sm ${
                        selectedBloc[r.id] === b.id
                          ? "bg-blue-600 text-white"
                          : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      Bloc {b.name} ({b.stance})
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => signResolution(r.id)}
                className="text-sm text-blue-600 hover:underline"
              >
                Sign virtually (main subs notified)
              </button>

              <div className="border-t pt-3 mt-2 space-y-2">
                <p className="text-sm font-medium">Clause editor</p>
                {resolutionClauses.length === 0 ? (
                  <p className="text-xs text-slate-500">No clauses yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {resolutionClauses.map((c) => {
                      const draft = editingClause[c.id] ?? c.clause_text;
                      return (
                        <li key={c.id} className="border rounded p-2 space-y-2">
                          <p className="text-xs text-slate-500">Clause {c.clause_number}</p>
                          <textarea
                            className="w-full px-2 py-1 border rounded dark:bg-slate-700"
                            value={draft}
                            onChange={(e) =>
                              setEditingClause((prev) => ({ ...prev, [c.id]: e.target.value }))
                            }
                            disabled={!canCreate}
                          />
                          {canCreate ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="px-2 py-1 rounded bg-blue-600 text-white text-xs"
                                onClick={() => void saveClause(c.id)}
                              >
                                Save clause
                              </button>
                              <button
                                type="button"
                                className="px-2 py-1 rounded border border-red-400/40 text-red-700 text-xs"
                                onClick={() => void deleteClause(c.id)}
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {canCreate ? (
                  <div className="space-y-2">
                    <textarea
                      className="w-full px-2 py-1 border rounded dark:bg-slate-700"
                      value={newClause[r.id] ?? ""}
                      onChange={(e) =>
                        setNewClause((prev) => ({ ...prev, [r.id]: e.target.value }))
                      }
                      placeholder="Add a new clause..."
                    />
                    <button
                      type="button"
                      className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
                      onClick={() => void addClause(r.id)}
                    >
                      Add clause
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="border-t pt-3 mt-2 space-y-2">
                <p className="text-sm font-medium">Clause vote history</p>
                {outcomesForResolution.length === 0 ? (
                  <p className="text-xs text-slate-500">No recorded clause vote outcomes yet.</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {outcomesForResolution.map((o) => (
                      <li
                        key={o.id}
                        className={[
                          "flex flex-wrap items-center gap-2 rounded border px-2 py-1",
                          o.passed ? "border-green-200 bg-green-50/60" : "border-red-200 bg-red-50/60",
                        ].join(" ")}
                      >
                        <span className="font-medium">{clauseIdToLabel.get(o.clause_id) ?? "Clause"}</span>
                        <span className={o.passed ? "text-green-700" : "text-red-700"}>
                          {o.passed ? "PASSED" : "FAILED"}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-600">Motion {o.vote_item_id.slice(0, 8)}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-500">{new Date(o.applied_at).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
