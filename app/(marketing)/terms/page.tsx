import type { Metadata } from "next";
import Link from "next/link";
import { MarketingDocumentPage } from "@/components/marketing/MarketingDocumentPage";
import { getAppName, getPartnershipContactEmail } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Terms of Service | InterMUN",
  description: "The terms governing access to and use of InterMUN.",
};

export default function TermsPage() {
  const appName = getAppName();
  const contactEmail = getPartnershipContactEmail();
  const contact = contactEmail ? (
    <a href={`mailto:${contactEmail}`} className="font-semibold text-[var(--accent)] hover:underline">
      {contactEmail}
    </a>
  ) : (
    "the contact form on our website"
  );

  return (
    <MarketingDocumentPage
      eyebrow="Legal"
      title="Terms of Service"
      intro={`These terms govern your access to and use of ${appName}. By using the service, you agree to these terms.`}
      updated="25 July 2026"
      sections={[
        {
          title: "Using the service",
          content: (
            <>
              <p>
                You must provide accurate information, use the service only for lawful conference and
                educational purposes, and follow reasonable instructions from your conference organiser.
              </p>
              <p>
                If you are not legally able to accept these terms yourself, a parent, guardian, school, or
                conference organiser must authorise your use. Organisers are responsible for ensuring that
                their participants are appropriately authorised.
              </p>
            </>
          ),
        },
        {
          title: "Accounts and access",
          content: (
            <ul className="list-disc space-y-2 pl-5">
              <li>Keep your credentials and conference access codes confidential.</li>
              <li>Do not impersonate another person or misrepresent your role.</li>
              <li>Do not access data, committees, or administrative tools you are not authorised to use.</li>
              <li>Tell us or your organiser promptly if you suspect unauthorised account use.</li>
            </ul>
          ),
        },
        {
          title: "Your content",
          content: (
            <>
              <p>
                You retain ownership of content you create. You grant us a limited licence to host, process,
                reproduce, and display that content only as needed to operate, secure, and improve the
                service and support your conference.
              </p>
              <p>
                You are responsible for ensuring that your content is lawful and that you have permission to
                share it. Do not upload confidential material unless it is appropriate for the intended
                conference audience.
              </p>
            </>
          ),
        },
        {
          title: "Acceptable use",
          content: (
            <p>
              You may not disrupt the service, bypass access controls, probe for vulnerabilities, scrape
              data without permission, distribute malware, harass others, infringe intellectual property,
              or use the platform for fraud or unlawful activity. We may investigate and restrict activity
              that threatens participants, conferences, or the service.
            </p>
          ),
        },
        {
          title: "Conference organisers",
          content: (
            <p>
              Organisers control conference configuration, role assignments, participation rules, and much
              of the content within their workspace. They are responsible for their conference operations,
              participant notices and consents, and lawful use of information exported from the service.
            </p>
          ),
        },
        {
          title: "Availability and changes",
          content: (
            <p>
              We may update, suspend, or discontinue parts of the service. We aim to provide a reliable
              platform but do not guarantee uninterrupted or error-free operation. We may update these
              terms, and continued use after an update takes effect constitutes acceptance of the revised
              terms.
            </p>
          ),
        },
        {
          title: "Suspension and termination",
          content: (
            <p>
              We may suspend or terminate access where reasonably necessary to protect the service or its
              users, respond to unlawful conduct, enforce these terms, or comply with legal obligations. You
              may stop using the service at any time.
            </p>
          ),
        },
        {
          title: "Disclaimers and liability",
          content: (
            <>
              <p>
                To the extent permitted by law, the service is provided “as is” and “as available,” without
                warranties that are not expressly stated in these terms. {appName} is a conference tool and
                does not control participant conduct or guarantee conference outcomes.
              </p>
              <p>
                To the extent permitted by law, we will not be liable for indirect, incidental, special,
                consequential, or punitive damages, or for loss of data, revenue, or opportunity arising
                from use of the service. Rights that cannot legally be excluded remain unaffected.
              </p>
            </>
          ),
        },
        {
          title: "Privacy and contact",
          content: (
            <>
              <p>
                Our{" "}
                <Link href="/privacy" className="font-semibold text-[var(--accent)] hover:underline">
                  Privacy Policy
                </Link>{" "}
                explains how we handle personal information.
              </p>
              <p>Questions about these terms can be sent to {contact}.</p>
            </>
          ),
        },
      ]}
    />
  );
}
