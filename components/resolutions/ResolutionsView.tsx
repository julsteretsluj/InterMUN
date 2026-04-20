"use client";

import { useState } from "react";
import { FileCheck, Plus, Users } from "lucide-react";
import {
  addClauseAction,
  createResolutionAction,
  deleteClauseAction,
  emailResolutionToDelegateAction,
  joinBlocAction,
  signResolutionAction,
  updateClauseAction,
} from "@/app/actions/resolutions";
import { OpenNewGoogleDocButton } from "@/components/google-docs/OpenNewGoogleDocButton";
import { GoogleDocsEmbed } from "@/components/resolutions/GoogleDocsEmbed";
import { DelegateResolutionBuilder } from "@/components/resolutions/DelegateResolutionBuilder";

interface Resolution {
  id: string;
  conference_id: string;
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
  const [shareEmailByResolution, setShareEmailByResolution] = useState<Record<string, string>>({});
  const [shareStatusByResolution, setShareStatusByResolution] = useState<Record<string, string>>({});
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

  async function emailResolutionToDelegate(resolutionId: string) {
    setActionError(null);
    setShareStatusByResolution((prev) => ({ ...prev, [resolutionId]: "" }));
    const targetEmail = (shareEmailByResolution[resolutionId] ?? "").trim();
    if (!targetEmail) {
      setActionError("Enter a delegate email first.");
      return;
    }

    const result = await emailResolutionToDelegateAction({
      conferenceId,
      resolutionId,
      targetEmail,
    });
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setShareStatusByResolution((prev) => ({ ...prev, [resolutionId]: `Sent to ${result.data.targetEmail}.` }));
  }

  return (
    <div className="space-y-4">
      {canCreate ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-white rounded hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          New Resolution
        </button>
      ) : null}
      {showForm && (
        <div className="p-4 border rounded-lg border-white/15 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-brand-navy">Google Doc link</span>
            <OpenNewGoogleDocButton className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-medium text-brand-navy hover:bg-white/15" />
          </div>
          <input
            type="url"
            value={form.google_docs_url}
            onChange={(e) =>
              setForm({ ...form, google_docs_url: e.target.value })
            }
            placeholder="Google Docs URL (docs.google.com/document/d/… — used for embed + editing)"
            className="w-full px-3 py-2 border rounded bg-black/30"
          />
          <p className="text-xs text-brand-muted">
            New Google Doc opens in another tab; copy the URL from the address bar and paste it here.
          </p>
          <input
            value={form.main_submitters}
            onChange={(e) =>
              setForm({ ...form, main_submitters: e.target.value })
            }
            placeholder="Main submitters (user IDs, comma-separated)"
            className="w-full px-3 py-2 border rounded bg-black/30"
          />
          <input
            value={form.co_submitters}
            onChange={(e) =>
              setForm({ ...form, co_submitters: e.target.value })
            }
            placeholder="Co-submitters (user IDs, comma-separated)"
            className="w-full px-3 py-2 border rounded bg-black/30"
          />
          <div className="flex gap-2">
            <button
              onClick={createResolution}
              className="px-4 py-2 bg-brand-accent text-white rounded hover:opacity-90"
            >
              Create
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border rounded hover:bg-white/10"
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
      {!canCreate ? (
        <DelegateResolutionBuilder
          resolutions={resolutions.map((r) => ({
            id: r.id,
            conference_id: r.conference_id,
            google_docs_url: r.google_docs_url,
          }))}
        />
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
              className="p-4 border rounded-lg border-white/15 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-3">
                  {r.google_docs_url ? (
                    <>
                      <a
                        href={r.google_docs_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-diplomatic dark:text-brand-accent-bright hover:underline inline-flex items-center gap-2 text-sm font-medium"
                      >
                        <FileCheck className="w-4 h-4 shrink-0" />
                        Open in new tab
                      </a>
                      <GoogleDocsEmbed googleDocsUrl={r.google_docs_url} />
                    </>
                  ) : (
                    <span className="text-brand-muted/70 text-brand-muted text-sm">No Google Doc link</span>
                  )}
                </div>
                {r.visible_to_other_bloc && (
                  <span className="text-xs shrink-0 bg-brand-accent/15 dark:bg-brand-accent/20 text-brand-navy dark:text-brand-accent-bright px-2 py-1 rounded">
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
                          ? "bg-brand-accent text-white"
                          : "bg-black/30 hover:bg-white/10"
                      }`}
                    >
                      Bloc {b.name} ({b.stance})
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => signResolution(r.id)}
                className="text-sm text-brand-diplomatic hover:underline"
              >
                Sign virtually (main subs notified)
              </button>
              <div className="rounded border border-white/10 bg-black/15 p-2 space-y-2">
                <p className="text-xs font-medium text-brand-navy">Share resolution by email</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="email"
                    value={shareEmailByResolution[r.id] ?? ""}
                    onChange={(e) =>
                      setShareEmailByResolution((prev) => ({ ...prev, [r.id]: e.target.value }))
                    }
                    placeholder="delegate@email.com"
                    className="min-w-[220px] flex-1 px-2 py-1.5 border rounded bg-black/30 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void emailResolutionToDelegate(r.id)}
                    className="px-3 py-1.5 rounded bg-brand-accent text-white text-sm hover:opacity-90"
                  >
                    Send to delegate
                  </button>
                </div>
                {shareStatusByResolution[r.id] ? (
                  <p className="text-xs text-brand-diplomatic">{shareStatusByResolution[r.id]}</p>
                ) : null}
              </div>

              <div className="border-t pt-3 mt-2 space-y-2">
                <p className="text-sm font-medium">Clause editor</p>
                {resolutionClauses.length === 0 ? (
                  <p className="text-xs text-brand-muted/70">No clauses yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {resolutionClauses.map((c) => {
                      const draft = editingClause[c.id] ?? c.clause_text;
                      return (
                        <li key={c.id} className="border rounded p-2 space-y-2">
                          <p className="text-xs text-brand-muted/70">Clause {c.clause_number}</p>
                          <textarea
                            className="w-full px-2 py-1 border rounded bg-black/30"
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
                                className="px-2 py-1 rounded bg-brand-accent text-white text-xs"
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
                      className="w-full px-2 py-1 border rounded bg-black/30"
                      value={newClause[r.id] ?? ""}
                      onChange={(e) =>
                        setNewClause((prev) => ({ ...prev, [r.id]: e.target.value }))
                      }
                      placeholder="Add a new clause..."
                    />
                    <button
                      type="button"
                      className="px-3 py-1 rounded bg-brand-accent text-white text-sm"
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
                  <p className="text-xs text-brand-muted/70">No recorded clause vote outcomes yet.</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {outcomesForResolution.map((o) => (
                      <li
                        key={o.id}
                        className={[
                          "flex flex-wrap items-center gap-2 rounded border px-2 py-1",
                          o.passed ? "border-brand-accent/25 bg-brand-accent/10" : "border-red-200 bg-red-50/60",
                        ].join(" ")}
                      >
                        <span className="font-medium">{clauseIdToLabel.get(o.clause_id) ?? "Clause"}</span>
                        <span className={o.passed ? "text-brand-diplomatic" : "text-red-700"}>
                          {o.passed ? "PASSED" : "FAILED"}
                        </span>
                        <span className="text-brand-muted/70">•</span>
                        <span className="text-brand-muted">Motion {o.vote_item_id.slice(0, 8)}</span>
                        <span className="text-brand-muted/70">•</span>
                        <span className="text-brand-muted/70">{new Date(o.applied_at).toLocaleString()}</span>
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
