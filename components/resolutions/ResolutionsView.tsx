"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileCheck, Plus, Users } from "lucide-react";

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

export function ResolutionsView({
  resolutions,
  blocs,
}: {
  resolutions: Resolution[];
  blocs: Bloc[];
}) {
  const [res, setRes] = useState(resolutions);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    google_docs_url: "",
    main_submitters: "",
    co_submitters: "",
    conference_id: "00000000-0000-0000-0000-000000000001",
  });
  const [selectedBloc, setSelectedBloc] = useState<Record<string, string>>({});
  const supabase = createClient();

  async function createResolution() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const mainSubs = form.main_submitters
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!mainSubs.includes(user.id)) mainSubs.push(user.id);
    const { data: newRes } = await supabase
      .from("resolutions")
      .insert({
        conference_id: form.conference_id,
        google_docs_url: form.google_docs_url || null,
        main_submitters: mainSubs,
        co_submitters: form.co_submitters
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        signatories: [],
      })
      .select("id")
      .single();

    if (newRes?.id) {
      await supabase.from("blocs").insert([
        { resolution_id: newRes.id, name: "A", stance: "for" },
        { resolution_id: newRes.id, name: "B", stance: "against" },
      ]);
    }
    setShowForm(false);
    setForm({
      google_docs_url: "",
      main_submitters: "",
      co_submitters: "",
      conference_id: "00000000-0000-0000-0000-000000000001",
    });
    const { data } = await supabase
      .from("resolutions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setRes(data);
  }

  async function signResolution(resolutionId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("signatory_requests").insert({
      resolution_id: resolutionId,
      user_id: user.id,
      status: "pending",
    });
  }

  async function joinBloc(resolutionId: string, blocId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const resolutionBlocs = blocs.filter((b) => b.resolution_id === resolutionId);
    for (const b of resolutionBlocs) {
      await supabase
        .from("bloc_memberships")
        .delete()
        .eq("bloc_id", b.id)
        .eq("user_id", user.id);
    }
    await supabase.from("bloc_memberships").insert({
      bloc_id: blocId,
      user_id: user.id,
    });
    setSelectedBloc((s) => ({ ...s, [resolutionId]: blocId }));
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        <Plus className="w-4 h-4" />
        New Resolution
      </button>
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
      <div className="space-y-4">
        {res.map((r) => {
          const resolutionBlocs = blocs.filter((b) => b.resolution_id === r.id);
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
