import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdvisorDelegateSubnav } from "@/components/advisor/AdvisorDelegateSubnav";
import { requireAdvisorDelegateContext } from "@/lib/advisor-delegate-page";

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function AdvisorDelegateLayout({ children, params }: PageProps & { children: React.ReactNode }) {
  const { userId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const assignment = await requireAdvisorDelegateContext(supabase, user.id, userId);

  return (
    <>
      <AdvisorDelegateSubnav assignment={assignment} delegateUserId={userId} />
      {children}
    </>
  );
}
