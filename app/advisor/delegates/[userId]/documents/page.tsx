import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentsView } from "@/components/documents/DocumentsView";
import { MunPageShell } from "@/components/MunPageShell";
import { requireAdvisorDelegateContext } from "@/lib/advisor-delegate-page";
import { getTranslations } from "next-intl/server";

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function AdvisorDelegateDocumentsPage({ params }: PageProps) {
  const { userId } = await params;
  const t = await getTranslations("pageTitles");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const assignment = await requireAdvisorDelegateContext(supabase, user.id, userId);

  const [{ data: docs }, { data: globalDocs }] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("documents")
      .select("*")
      .in("doc_type", ["rop", "award_criteria"])
      .order("updated_at", { ascending: false }),
  ]);

  const mergedDocs = [
    ...(docs ?? []),
    ...((globalDocs ?? []).filter((r) => !(docs ?? []).some((d) => d.id === r.id))),
  ];

  return (
    <MunPageShell title={t("advisorDelegateDocuments")}>
      <DocumentsView
        documents={mergedDocs}
        currentUserId={userId}
        canViewAll={false}
        canEditAll={false}
        myRole="advisor"
        readOnlyViewer
        delegateOptions={[]}
        chairOptions={[]}
      />
    </MunPageShell>
  );
}
