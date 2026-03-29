import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { getAppMetaDescription, getAppName } from "@/lib/branding";
import { THEME_STORAGE_KEY } from "@/lib/theme-storage";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["400", "500", "600", "700", "800"],
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
  const themeInit = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var v=localStorage.getItem(k);var r=document.documentElement;if(v==="dark"){r.classList.add("dark");}else{r.classList.remove("dark");}}catch(e){}})();`;

  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans text-brand-navy">
        <Script id="intermun-theme-init" strategy="beforeInteractive">
          {themeInit}
        </Script>
        {children}
      </body>
    </html>
  );
}

