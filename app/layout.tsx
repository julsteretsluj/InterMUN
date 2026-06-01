import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import Script from "next/script";
import { getLocale, getMessages } from "next-intl/server";
import { getAppMetaDescription, getAppName } from "@/lib/branding";
import {
  DYSLEXIC_FONT_STORAGE_KEY,
  COLORBLIND_MODE_STORAGE_KEY,
  DEFAULT_THEME_HUE,
  DEFAULT_TEXT_SIZE_STEP,
  LEGACY_THEME_HUE_CLEANUP,
  TEXT_SIZE_STEP_MAX,
  TEXT_SIZE_STEP_MIN,
  TEXT_SIZE_STORAGE_KEY,
  THEME_HUE_STORAGE_KEY,
  THEME_HUES,
  THEME_STORAGE_KEY,
} from "@/lib/theme-storage";
import { localeDirection } from "@/lib/i18n/locales";
import { IntlProvider } from "@/components/i18n/IntlProvider";
import "@fontsource/atkinson-hyperlegible/latin-400.css";
import "@fontsource/atkinson-hyperlegible/latin-700.css";
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
  /** Favicons: `app/icon.png` + `app/apple-icon.png` (generated from `public/intermun-emblem.png`, square crop). */
};

// Avoid static prerender during build when Supabase env is only set at deploy/runtime.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const themeInit = `(function(){try{var mk=${JSON.stringify(THEME_STORAGE_KEY)};var hk=${JSON.stringify(THEME_HUE_STORAGE_KEY)};var dk=${JSON.stringify(DYSLEXIC_FONT_STORAGE_KEY)};var cbk=${JSON.stringify(COLORBLIND_MODE_STORAGE_KEY)};var tsk=${JSON.stringify(TEXT_SIZE_STORAGE_KEY)};var min=${JSON.stringify(TEXT_SIZE_STEP_MIN)};var max=${JSON.stringify(TEXT_SIZE_STEP_MAX)};var defStep=${JSON.stringify(DEFAULT_TEXT_SIZE_STEP)};var hues=${JSON.stringify([...THEME_HUES])};var leg=${JSON.stringify([...LEGACY_THEME_HUE_CLEANUP])};var def=${JSON.stringify(DEFAULT_THEME_HUE)};var r=document.documentElement;var mode=localStorage.getItem(mk);var raw=localStorage.getItem(hk);if(mode==="dark")r.classList.add("dark");else r.classList.remove("dark");var h=raw&&hues.indexOf(raw)>=0?raw:def;for(var i=0;i<hues.length;i++)r.classList.remove("theme-"+hues[i]);for(var j=0;j<leg.length;j++)r.classList.remove("theme-"+leg[j]);r.classList.add("theme-"+h);if(localStorage.getItem(dk)==="1")r.classList.add("dyslexic-font");else r.classList.remove("dyslexic-font");if(localStorage.getItem(cbk)==="1")r.classList.add("colorblind-mode");else r.classList.remove("colorblind-mode");r.classList.remove("text-size-small","text-size-large");var ts=localStorage.getItem(tsk);var st=defStep;if(ts==="small")st=-6;else if(ts==="medium")st=0;else if(ts==="large")st=13;else if(ts==="0")st=-6;else if(ts==="1")st=-4;else if(ts==="2")st=-2;else if(ts==="3")st=0;else if(ts==="4")st=4;else if(ts==="5")st=8;else if(ts==="6")st=13;else{var tn=parseInt(ts,10);if(!isNaN(tn))st=tn;}if(st<min)st=min;if(st>max)st=max;r.style.setProperty("--text-scale-step",String(st));}catch(e){}})();`;
  const mazeInit = `(function (m, a, z, e) {
  var s, t, u, v;
  try {
    t = m.sessionStorage.getItem("maze-us");
  } catch (err) {}

  if (!t) {
    t = new Date().getTime();
    try {
      m.sessionStorage.setItem("maze-us", t);
    } catch (err) {}
  }

  u = document.currentScript || (function () {
    var w = document.getElementsByTagName("script");
    return w[w.length - 1];
  })();
  v = u && u.nonce;

  s = a.createElement("script");
  s.src = z + "?apiKey=" + e;
  s.async = true;
  if (v) s.setAttribute("nonce", v);
  a.getElementsByTagName("head")[0].appendChild(s);
  m.mazeUniversalSnippetApiKey = e;
})(window, document, "https://snippet.maze.co/maze-universal-loader.js", "0fe5ce1b-25bb-4e97-8a3a-9bf0a1c1405e");`;

  return (
    <html
      lang={locale}
      dir={localeDirection(locale)}
      suppressHydrationWarning
      className={`${sans.variable} ${documentSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans text-brand-navy">
        <Script id="intermun-theme-init" strategy="beforeInteractive">
          {themeInit}
        </Script>
        <Script id="maze-universal-loader" strategy="afterInteractive">
          {mazeInit}
        </Script>
        <IntlProvider locale={locale} messages={messages}>
          {children}
        </IntlProvider>
      </body>
    </html>
  );
}

