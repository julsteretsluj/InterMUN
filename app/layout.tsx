import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { getAppMetaDescription, getAppName } from "@/lib/branding";
import "./globals.css";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: getAppName(),
  description: getAppMetaDescription(),
};

// Avoid static prerender during build when Supabase env is only set at deploy/runtime.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-brand-cream text-brand-navy">
        {children}
      </body>
    </html>
  );
}

