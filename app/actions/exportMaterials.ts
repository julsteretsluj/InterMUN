"use server";

import { createClient } from "@/lib/supabase/server";
import type { ExportMaterialsRange } from "@/components/materials/DelegateMaterialsExportCard";
import nodemailer from "nodemailer";
import { getTranslations } from "next-intl/server";

export type ExportMaterialsActionState = { error?: string; success?: string };

function startEndForRange(range: ExportMaterialsRange): { start: Date | null; end: Date | null } {
  if (range === "all") return { start: null, end: null };

  // Export “today” using UTC boundaries to keep server logic deterministic.
  const now = new Date();
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function formatDateTime(d: Date): string {
  return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "Z");
}

function buildMaterialsMarkdown(args: {
  rangeLabel: string;
  exportedAt: Date;
  delegate: {
    id: string;
    name: string | null;
    username: string | null;
    allocation: string | null;
    email: string;
    stanceOverview: Record<string, number> | null;
  };
  data: {
    documents: Array<{
      id: string;
      doc_type: string;
      title: string | null;
      content: string | null;
      file_url: string | null;
      google_docs_url?: string | null;
      created_at: string;
      updated_at: string;
    }>;
    notes: Array<{
      id: string;
      note_type: string;
      content: string | null;
      conference_id: string | null;
      allocation_id: string | null;
      google_docs_url?: string | null;
      created_at: string;
      updated_at: string;
    }>;
    speeches: Array<{
      id: string;
      title: string | null;
      content: string | null;
      conference_id: string | null;
      google_docs_url?: string | null;
      created_at: string;
      updated_at: string;
    }>;
    votes: Array<{ vote_item_id: string; value: string; created_at: string }>;
    voteItems: Array<{
      id: string;
      vote_type: string;
      title: string | null;
      description: string | null;
      must_vote: boolean;
      required_majority: string;
      created_at: string;
      closed_at: string | null;
    }>;
    ideas: Array<{
      id: string;
      content: string | null;
      conference_id: string | null;
      google_docs_url?: string | null;
      created_at: string;
      updated_at: string;
    }>;
    sources: Array<{
      id: string;
      url: string;
      title: string | null;
      created_at: string;
    }>;
    reports: Array<{
      id: string;
      report_type: string;
      description: string | null;
      created_at: string;
    }>;
    allocations: Array<{ id: string; country: string; conference_id: string | null }>;
    conferences: Array<{ id: string; name: string; committee: string | null; tagline: string | null }>;
  };
}): string {
  const confById = Object.fromEntries(
    args.data.conferences.map((c) => [
      c.id,
      {
        name: c.name,
        committee: c.committee,
        tagline: c.tagline,
      },
    ])
  );
  const allocationById = Object.fromEntries(args.data.allocations.map((a) => [a.id, a]));

  const conferenceLabel = (id: string | null | undefined): string => {
    if (!id) return "General";
    const c = confById[id];
    if (!c) return `Conference (${id})`;
    return [c.name, c.committee].filter(Boolean).join(" — ");
  };

  const stanceNotes = args.data.notes.filter((n) => n.note_type === "stance");
  const chatNotes = args.data.notes.filter((n) => n.note_type === "chat");
  const runningNotes = args.data.notes.filter((n) => n.note_type === "running");

  const voteItemById = Object.fromEntries(args.data.voteItems.map((v) => [v.id, v]));

  const documentsSection =
    args.data.documents.length === 0
      ? "- None"
      : args.data.documents
          .map((d) => {
            const name = [d.doc_type.replace("_", " "), d.title].filter(Boolean).join(": ");
            const urlPart = d.file_url ? `\n  File: ${d.file_url}` : "";
            const gDocPart = d.google_docs_url?.trim()
              ? `\n  Google Doc: ${d.google_docs_url.trim()}`
              : "";
            const contentPart = d.content?.trim()
              ? `\n  Content:\n  ${d.content.trim().replace(/\n/g, "\n  ")}`
              : "";
            return `- ${name}\n  Updated: ${d.updated_at}\n  Created: ${d.created_at}${urlPart}${gDocPart}${contentPart}`;
          })
          .join("\n");

  const notesBlock = (label: string, notes: typeof args.data.notes) => {
    if (notes.length === 0) return `## ${label}\n- None\n`;
    const mapped = notes.map((n) => {
      if (n.note_type === "stance" && n.allocation_id) {
        const a = allocationById[n.allocation_id];
        return [
          `- ${a ? a.country : n.allocation_id}`,
          `  Conference: ${conferenceLabel(a?.conference_id ?? null)}`,
          n.content?.trim() ? `  Notes:\n  ${n.content.trim().replace(/\n/g, "\n  ")}` : "  Notes: (empty)",
          `  Updated: ${n.updated_at}`,
        ].join("\n");
      }

      const conf = conferenceLabel(n.conference_id);
      const lines = [
        `- ${conf}`,
        n.content?.trim() ? `  Notes:\n  ${n.content.trim().replace(/\n/g, "\n  ")}` : "  Notes: (empty)",
      ];
      if (n.note_type === "running" && n.google_docs_url?.trim()) {
        lines.push(`  Google Doc: ${n.google_docs_url.trim()}`);
      }
      lines.push(`  Updated: ${n.updated_at}`);
      return lines.join("\n");
    });
    return `## ${label}\n${mapped.join("\n")}\n`;
  };

  const speechesSection =
    args.data.speeches.length === 0
      ? "- None"
      : args.data.speeches
          .map((s) => {
            const where = conferenceLabel(s.conference_id);
            const lines = [
              `- ${s.title?.trim() ? s.title : "Untitled speech"} (${where})`,
            ];
            if (s.google_docs_url?.trim()) {
              lines.push(`  Google Doc: ${s.google_docs_url.trim()}`);
            }
            lines.push(
              s.content?.trim()
                ? `  Content:\n  ${s.content.trim().replace(/\n/g, "\n  ")}`
                : "  Content: (empty)",
              `  Updated: ${s.updated_at}`
            );
            return lines.join("\n");
          })
          .join("\n");

  const votesSection =
    args.data.votes.length === 0
      ? "- None"
      : args.data.votes
          .map((v) => {
            const item = voteItemById[v.vote_item_id];
            const title = item?.title?.trim() ? item.title : item ? `(${item.vote_type})` : v.vote_item_id;
            const desc = item?.description?.trim();
            return [
              `- ${item?.vote_type ? item.vote_type : "Vote"}: ${title}`,
              desc ? `  Description: ${desc}` : null,
              `  Your vote: ${v.value}`,
              `  Cast: ${v.created_at}`,
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n");

  const ideasSection =
    args.data.ideas.length === 0
      ? "- None"
      : args.data.ideas
          .map((i) => {
            const where = conferenceLabel(i.conference_id);
            const content = i.content?.trim();
            const lines = [`- ${where}`];
            if (i.google_docs_url?.trim()) {
              lines.push(`  Google Doc: ${i.google_docs_url.trim()}`);
            }
            lines.push(
              content ? `  Idea:\n  ${content.replace(/\n/g, "\n  ")}` : "  Idea: (empty)",
              `  Updated: ${i.updated_at}`
            );
            return lines.join("\n");
          })
          .join("\n");

  const sourcesSection =
    args.data.sources.length === 0
      ? "- None"
      : args.data.sources
          .map((s) => {
            const title = s.title?.trim() ? s.title : s.url;
            return `- ${title}\n  URL: ${s.url}\n  Added: ${s.created_at}`;
          })
          .join("\n");

  const reportsSection =
    args.data.reports.length === 0
      ? "- None"
      : args.data.reports
          .map((r) => {
            const type = r.report_type.replace("_", " ");
            const desc = r.description?.trim();
            return [
              `- ${type}`,
              desc ? `  Description: ${desc.replace(/\n/g, "\n  ")}` : "  Description: (none)",
              `  Submitted: ${r.created_at}`,
            ].join("\n");
          })
          .join("\n");

  const stanceOverview = args.delegate.stanceOverview && Object.keys(args.delegate.stanceOverview).length
    ? Object.entries(args.delegate.stanceOverview)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n")
    : "- None";

  return [
    `# InterMUN Delegate Materials Export`,
    ``,
    `Delegate: ${args.delegate.name ?? args.delegate.username ?? args.delegate.id}`,
    `Email: ${args.delegate.email}`,
    `Allocation: ${args.delegate.allocation ?? "—"}`,
    `Range: ${args.rangeLabel}`,
    `Exported at: ${formatDateTime(args.exportedAt)}`,
    ``,
    `## Stance overview (heatmap)`,
    stanceOverview,
    ``,
    `## Documents`,
    documentsSection,
    ``,
    notesBlock("Notes — Chat", chatNotes),
    notesBlock("Notes — Running", runningNotes),
    notesBlock("Notes — Stance", stanceNotes),
    `## Speeches`,
    speechesSection,
    ``,
    `## Votes`,
    votesSection,
    ``,
    `## Ideas`,
    ideasSection,
    ``,
    `## Sources`,
    sourcesSection,
    ``,
    `## Reports`,
    reportsSection,
    ``,
    `---`,
    `Generated by InterMUN.`,
  ].join("\n");
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function sendMaterialsEmail(args: {
  to: string;
  subject: string;
  markdownBody: string;
  filename: string;
}): Promise<{ mailId?: string } | { error: string }> {
  try {
    const host = requireEnv("SMTP_HOST");
    const port = Number(process.env.SMTP_PORT ?? "587");
    const user = requireEnv("SMTP_USER");
    const pass = requireEnv("SMTP_PASS");
    const from = process.env.MATERIALS_EXPORT_FROM || process.env.SMTP_FROM || user;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const message = {
      from,
      to: args.to,
      subject: args.subject,
      text: args.markdownBody,
      attachments: [
        {
          filename: args.filename,
          content: args.markdownBody,
          contentType: "text/markdown",
        },
      ],
    };

    const info = await transporter.sendMail(message);
    return { mailId: info.messageId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown email sending error";
    return { error: msg };
  }
}

export async function exportDelegateMaterialsAction(
  _prev: ExportMaterialsActionState | null,
  formData: FormData
): Promise<ExportMaterialsActionState> {
  const t = await getTranslations("serverActions.exportMaterials");
  const range = (String(formData.get("range") ?? "today") as ExportMaterialsRange) || "today";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) return { error: t("pleaseSignInFirst") };

  const profile = await supabase
    .from("profiles")
    .select("role, name, username, allocation, stance_overview")
    .eq("id", user.id)
    .maybeSingle();

  if (profile.error) {
    return { error: profile.error.message };
  }

  if (profile.data?.role !== "delegate") {
    return { error: t("onlyDelegatesCanExport") };
  }

  const email = user.email;
  if (!email) return { error: t("accountHasNoEmail") };

  const { start, end } = startEndForRange(range);
  const rangeLabel = range === "today" ? t("rangeTodayUtc") : t("rangeAllTime");
  const exportedAt = new Date();

  // Delegate-owned content
  let documentsQuery = supabase
    .from("documents")
    .select(
      "id, user_id, doc_type, title, content, file_url, google_docs_url, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  let notesQuery = supabase
    .from("notes")
    .select(
      "id, user_id, note_type, content, conference_id, allocation_id, google_docs_url, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .in("note_type", ["chat", "running", "stance"])
    .order("updated_at", { ascending: false });
  let speechesQuery = supabase
    .from("speeches")
    .select("id, user_id, title, content, conference_id, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  let ideasQuery = supabase
    .from("ideas")
    .select("id, user_id, content, conference_id, google_docs_url, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  let sourcesQuery = supabase
    .from("sources")
    .select("id, user_id, url, title, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  let reportsQuery = supabase
    .from("reports")
    .select("id, user_id, report_type, description, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  let votesQuery = supabase
    .from("votes")
    .select("id, user_id, vote_item_id, value, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (start && end) {
    const startIso = start.toISOString();
    const endIso = end.toISOString();
    documentsQuery = documentsQuery.gte("updated_at", startIso).lt("updated_at", endIso);
    notesQuery = notesQuery.gte("updated_at", startIso).lt("updated_at", endIso);
    speechesQuery = speechesQuery.gte("updated_at", startIso).lt("updated_at", endIso);
    ideasQuery = ideasQuery.gte("updated_at", startIso).lt("updated_at", endIso);
    sourcesQuery = sourcesQuery.gte("created_at", startIso).lt("created_at", endIso);
    reportsQuery = reportsQuery.gte("created_at", startIso).lt("created_at", endIso);
    votesQuery = votesQuery.gte("created_at", startIso).lt("created_at", endIso);
  }

  const [
    { data: documents, error: documentsErr },
    { data: notes, error: notesErr },
    { data: speeches, error: speechesErr },
    { data: ideas, error: ideasErr },
    { data: sources, error: sourcesErr },
    { data: reports, error: reportsErr },
    { data: votes, error: votesErr },
    { data: allocations, error: allocationsErr },
  ] = await Promise.all([
    documentsQuery,
    notesQuery,
    speechesQuery,
    ideasQuery,
    sourcesQuery,
    reportsQuery,
    votesQuery,
    supabase
      .from("allocations")
      .select("id, user_id, country, conference_id")
      .eq("user_id", user.id),
  ]);

  if (documentsErr) return { error: documentsErr.message };
  if (notesErr) return { error: notesErr.message };
  if (speechesErr) return { error: speechesErr.message };
  if (ideasErr) return { error: ideasErr.message };
  if (sourcesErr) return { error: sourcesErr.message };
  if (reportsErr) return { error: reportsErr.message };
  if (votesErr) return { error: votesErr.message };
  if (allocationsErr) return { error: allocationsErr.message };

  const delegateAllocations = allocations || [];
  const allocationConferenceIds = new Set(
    delegateAllocations.map((a) => a.conference_id).filter((x): x is string => Boolean(x))
  );
  const noteConferenceIds = new Set(
    (notes || []).map((n) => n.conference_id).filter((x): x is string => Boolean(x))
  );
  const speechConferenceIds = new Set(
    (speeches || []).map((s) => s.conference_id).filter((x): x is string => Boolean(x))
  );
  const ideaConferenceIds = new Set(
    (ideas || []).map((i) => i.conference_id).filter((x): x is string => Boolean(x))
  );

  const conferenceIds = new Set<string>([
    ...allocationConferenceIds,
    ...noteConferenceIds,
    ...speechConferenceIds,
    ...ideaConferenceIds,
  ]);

  const { data: conferences, error: confErr } = conferenceIds.size
    ? await supabase
        .from("conferences")
        .select("id, name, committee, tagline")
        .in("id", Array.from(conferenceIds))
    : { data: [], error: null };

  if (confErr) return { error: confErr.message };

  const delegateVotes = votes || [];
  const voteItemIds = Array.from(new Set(delegateVotes.map((v) => v.vote_item_id)));

  const { data: voteItems, error: voteItemsErr } = voteItemIds.length
    ? await supabase
        .from("vote_items")
        .select(
          "id, vote_type, title, description, must_vote, required_majority, created_at, closed_at"
        )
        .in("id", voteItemIds)
    : { data: [], error: null };

  if (voteItemsErr) return { error: voteItemsErr.message };

  const stanceOverview = (profile.data?.stance_overview ??
    {}) as unknown as Record<string, number>;

  const markdownBody = buildMaterialsMarkdown({
    rangeLabel,
    exportedAt,
    delegate: {
      id: user.id,
      name: profile.data?.name ?? null,
      username: profile.data?.username ?? null,
      allocation: profile.data?.allocation ?? null,
      email,
      stanceOverview: stanceOverview && Object.keys(stanceOverview).length ? stanceOverview : null,
    },
    data: {
      documents: documents || [],
      notes: notes || [],
      speeches: speeches || [],
      votes: delegateVotes.map((v) => ({
        vote_item_id: v.vote_item_id,
        value: v.value,
        created_at: v.created_at,
      })),
      voteItems: voteItems || [],
      ideas: ideas || [],
      sources: sources || [],
      reports: reports || [],
      allocations: delegateAllocations.map((a) => ({
        id: a.id,
        country: a.country,
        conference_id: a.conference_id,
      })),
      conferences: conferences || [],
    },
  });

  const filename = `materials-${range}-${exportedAt.toISOString().slice(0, 10)}.md`;
  const subject = t("emailSubject", { range: rangeLabel });

  const emailResult = await sendMaterialsEmail({
    to: email,
    subject,
    markdownBody,
    filename,
  });

  if ("error" in emailResult) {
    return {
      error:
        `Could not send email: ${emailResult.error}. ` +
        t("emailSendConfigHint"),
    };
  }

  return {
    success:
      t("exportEmailedTo", { email }),
  };
}

