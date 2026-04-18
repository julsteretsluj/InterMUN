import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import Script from "next/script";
import { getAppMetaDescription, getAppName } from "@/lib/branding";
import {
  DYSLEXIC_FONT_STORAGE_KEY,
  DEFAULT_THEME_HUE,
  LEGACY_THEME_HUE_CLEANUP,
  THEME_HUE_STORAGE_KEY,
  THEME_HUES,
  THEME_STORAGE_KEY,
} from "@/lib/theme-storage";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["400", "500", "600", "700", "800"],
});

/** Document surfaces only (resolutions, papers) — Coursera-style specialization pairing. */
const documentSerif = Merriweather({
  subsets: ["latin"],
  variable: "--font-document",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: getAppName(),
  description: getAppMetaDescription(),
  /** Same asset as `public/intermun-emblem.png` / `<InterMunEmblem />`; file convention adds `<link rel="icon">`. */
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
};

// Avoid static prerender during build when Supabase env is only set at deploy/runtime.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInit = `(function(){try{var mk=${JSON.stringify(THEME_STORAGE_KEY)};var hk=${JSON.stringify(THEME_HUE_STORAGE_KEY)};var dk=${JSON.stringify(DYSLEXIC_FONT_STORAGE_KEY)};var hues=${JSON.stringify([...THEME_HUES])};var leg=${JSON.stringify([...LEGACY_THEME_HUE_CLEANUP])};var def=${JSON.stringify(DEFAULT_THEME_HUE)};var r=document.documentElement;var mode=localStorage.getItem(mk);var raw=localStorage.getItem(hk);if(mode==="dark")r.classList.add("dark");else r.classList.remove("dark");var h=raw&&hues.indexOf(raw)>=0?raw:def;for(var i=0;i<hues.length;i++)r.classList.remove("theme-"+hues[i]);for(var j=0;j<leg.length;j++)r.classList.remove("theme-"+leg[j]);r.classList.add("theme-"+h);if(localStorage.getItem(dk)==="1")r.classList.add("dyslexic-font");else r.classList.remove("dyslexic-font");}catch(e){}})();`;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${documentSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans text-brand-navy">
        <Script id="intermun-theme-init" strategy="beforeInteractive">
          {themeInit}
        </Script>
        {children}
      </body>
    </html>
  );
}

