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
      eyebrow={`about ${appName.toLowerCase()}`}
      title="built for the whole conference team."
      intro={`${appName} brings delegates, chairs, advisors, and secretariat into one shared workspace—from prep through the final gavel. we think the hard part is the interface, not the diplomacy.`}
      sections={[
        {
          title: "our purpose",
          content: (
            <>
              <p>
                Model United Nations is at its best when people can focus on diplomacy, procedure,
                research, and collaboration. {appName} exists to cut the admin friction around those
                moments.
              </p>
              <p>
                The platform connects preparation, live session tools, documents, voting, notes, and
                oversight—without replacing the humans who make a conference matter.
              </p>
            </>
          ),
        },
        {
          title: "designed around every role",
          content: (
            <ul className="list-disc space-y-2 pl-5">
              <li>Delegates research, draft, collaborate, and follow the floor.</li>
              <li>Chairs run roll call, speakers, motions, timers, and votes.</li>
              <li>Advisors support their delegations with the right visibility.</li>
              <li>Secretariat coordinates chambers and sees conference-wide progress.</li>
            </ul>
          ),
        },
        {
          title: "conference-first technology",
          content: (
            <>
              <p>
                Features are shaped around real weekend workflows, role boundaries, and calm UI when
                the room is moving fast. Accessibility and secure role access are part of the design.
              </p>
              <p>
                Want {appName} at your conference?{" "}
                <Link href="/#contact" className="font-semibold text-[var(--clicky-blue)] hover:underline">
                  say hello
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
