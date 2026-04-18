"use client";

import ReactMarkdown from "react-markdown";

export function DaisAnnouncementBody({
  body,
  format,
}: {
  body: string;
  format: "plain" | "markdown";
}) {
  if (format === "markdown") {
    return (
      <div className="text-inherit [&_a]:text-brand-diplomatic [&_a]:underline dark:[&_a]:text-brand-accent-bright [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold">
        <ReactMarkdown
          components={{
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
          }}
        >
          {body}
        </ReactMarkdown>
      </div>
    );
  }
  return <span className="whitespace-pre-wrap">{body}</span>;
}
