import { redirect } from "next/navigation";

/** Awards are chair/admin surfaces — SMT does not manage awards in-app. */
export default function SmtAwardsPage() {
  redirect("/smt");
}
