"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText } from "lucide-react";
import Link from "next/link";

interface SavedPaper {
  id: string;
  title: string;
  type: "position_paper" | "prep_doc";
  href: string;
}

export function PaperSavedWidget() {
  const [papers, setPapers] = useState<SavedPaper[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("documents")
        .select("id, title, doc_type")
        .eq("user_id", user.id)
        .limit(5)
        .order("updated_at", { ascending: false });
      if (data) {
        setPapers(
          data.map((d) => ({
            id: d.id,
            title: d.title || "Untitled",
            type: d.doc_type as "position_paper" | "prep_doc",
            href: "/documents",
          }))
        );
      }
    }
    load();
  }, [supabase]);

  if (papers.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-3 z-50">
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Paper Saved
      </h3>
      <ul className="space-y-1 text-sm">
        {papers.map((p) => (
          <li key={p.id}>
            <Link
              href={p.href}
              className="block truncate text-blue-600 hover:underline dark:text-blue-400"
            >
              {p.title}
            </Link>
            <span className="text-xs text-slate-500 capitalize">
              {p.type.replace("_", " ")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
