import type { Metadata } from "next";
import Link from "next/link";
import { MarketingDocumentPage } from "@/components/marketing/MarketingDocumentPage";
import { getAppName } from "@/lib/branding";

export const metadata: Metadata = {
  title: "About InterMUN",
  description: "Learn why InterMUN exists and how it supports Model United Nations conferences.",
};

export default function AboutPage() {
  const appName = getAppName();

  return (
    <MarketingDocumentPage
      eyebrow={`About ${appName}`}
      title="Built for the whole conference team."
      intro={`${appName} brings delegates, chairs, advisors, and secretariat teams into one shared conference workspace—from preparation through the final gavel.`}
      sections={[
        {
          title: "Our purpose",
          content: (
            <>
              <p>
                Model United Nations is at its best when participants can focus on diplomacy, procedure,
                research, and collaboration. We built {appName} to reduce the administrative friction around
                those moments.
              </p>
              <p>
                The platform connects committee preparation, live session tools, documents, voting,
                communication, and conference oversight without replacing the people who make a conference
                meaningful.
              </p>
            </>
          ),
        },
        {
          title: "Designed around every role",
          content: (
            <ul className="list-disc space-y-2 pl-5">
              <li>Delegates can research, draft, collaborate, and follow committee activity.</li>
              <li>Chairs can run roll call, speakers lists, motions, timers, and votes.</li>
              <li>Advisors can support their delegations with appropriate visibility.</li>
              <li>Secretariat teams can coordinate committees and understand conference-wide progress.</li>
            </ul>
          ),
        },
        {
          title: "Conference-first technology",
          content: (
            <>
              <p>
                Every feature is shaped around real conference workflows, role boundaries, and the need for
                a calm interface during fast-moving sessions. Accessibility, privacy, and secure
                role-based access are part of that design—not afterthoughts.
              </p>
              <p>
                Interested in using {appName} at your conference?{" "}
                <Link href="/#contact" className="font-semibold text-[var(--accent)] hover:underline">
                  Get in touch with us
                </Link>
                .
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
