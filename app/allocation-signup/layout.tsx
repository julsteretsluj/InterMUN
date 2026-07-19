import Link from "next/link";
import { AppleAppFrame } from "@/components/ui/AppleAppShell";
import { AppleProductPage } from "@/components/ui/AppleProductPage";
import { AppleWindow } from "@/components/ui/AppleWindow";
import { getAppName } from "@/lib/branding";

export default function AllocationSignupLayout({ children }: { children: React.ReactNode }) {
  const appName = getAppName();

  return (
    <AppleAppFrame appName={appName}>
      <AppleProductPage width="narrow" className="min-h-screen py-8 md:py-12">
        <AppleWindow
          title={
            <Link href="/" className="text-inherit no-underline transition-opacity hover:opacity-75">
              {appName}
            </Link>
          }
          showControls
          resizable={false}
          contentClassName="mun-apple-page-body p-4 md:p-6"
        >
          {children}
        </AppleWindow>
      </AppleProductPage>
    </AppleAppFrame>
  );
}
