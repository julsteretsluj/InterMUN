import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
});

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-ui",
});

export const metadata: Metadata = {
  title: "SEAMUN I 2027",
  description:
    "Southeast Asia Model United Nations — 23–24 January 2027. Policies with a Purpose.",
};

// Avoid static prerender during build when Supabase env is only set at deploy/runtime.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-brand-cream text-brand-navy">
        {children}
      </body>
    </html>
  );
}
