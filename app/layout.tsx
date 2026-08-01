import type { Metadata } from "next";
import { Instrument_Serif, Inter_Tight, Merriweather } from "next/font/google";
import Script from "next/script";
import { getLocale, getMessages } from "next-intl/server";
import { getAppMetaDescription, getAppName } from "@/lib/branding";
import { buildThemeInitScript } from "@/lib/theme-init-script";
import { localeDirection } from "@/lib/i18n/locales";
import { IntlProvider } from "@/components/i18n/IntlProvider";
import { AppleAppProviders } from "@/components/ui/AppleAppShell";
import "@fontsource/opendyslexic/latin-400.css";
import "@fontsource/opendyslexic/latin-700.css";
import "@fontsource/atkinson-hyperlegible/latin-400.css";
import "@fontsource/atkinson-hyperlegible/latin-700.css";
import "./globals.css";

const sans = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["400", "500", "600", "700", "800"],
});

/** Display / headings — SEAMUN Chat–inspired Instrument Serif. */
const display = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-display-serif",
  weight: "400",
  style: ["normal", "italic"],
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
  const themeInit = buildThemeInitScript();
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
      className={`${sans.variable} ${display.variable} ${documentSerif.variable} h-full antialiased`}
    >
      <body className="mun-apple-site flex min-h-full flex-col font-sans text-brand-navy">
        <Script id="intermun-theme-init" strategy="beforeInteractive">
          {themeInit}
        </Script>
        {/* Daltonization (colour-vision correction) filters, referenced by CSS
            when colorblind mode is on. Each filter simulates the deficiency,
            isolates the error, then redistributes it onto perceivable channels. */}
        <svg
          aria-hidden
          focusable="false"
          style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
        >
          <defs>
            <filter id="cb-filter-deuteranopia" colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0"
                result="sim"
              />
              <feComposite in="SourceGraphic" in2="sim" operator="arithmetic" k1="0" k2="1" k3="-1" k4="0" result="err" />
              <feColorMatrix
                in="err"
                type="matrix"
                values="0 0 0 0 0  0.7 1 0 0 0  0.7 0 1 0 0  0 0 0 1 0"
                result="corr"
              />
              <feComposite in="SourceGraphic" in2="corr" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
            </filter>
            <filter id="cb-filter-protanopia" colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0"
                result="sim"
              />
              <feComposite in="SourceGraphic" in2="sim" operator="arithmetic" k1="0" k2="1" k3="-1" k4="0" result="err" />
              <feColorMatrix
                in="err"
                type="matrix"
                values="0 0 0 0 0  0.7 1 0 0 0  0.7 0 1 0 0  0 0 0 1 0"
                result="corr"
              />
              <feComposite in="SourceGraphic" in2="corr" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
            </filter>
            <filter id="cb-filter-tritanopia" colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0"
                result="sim"
              />
              <feComposite in="SourceGraphic" in2="sim" operator="arithmetic" k1="0" k2="1" k3="-1" k4="0" result="err" />
              <feColorMatrix
                in="err"
                type="matrix"
                values="1 0 0.7 0 0  0 1 0.7 0 0  0 0 0 0 0  0 0 0 1 0"
                result="corr"
              />
              <feComposite in="SourceGraphic" in2="corr" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
            </filter>
          </defs>
        </svg>
        <Script id="maze-universal-loader" strategy="afterInteractive">
          {mazeInit}
        </Script>
        <IntlProvider locale={locale} messages={messages}>
          <AppleAppProviders>{children}</AppleAppProviders>
        </IntlProvider>
      </body>
    </html>
  );
}

