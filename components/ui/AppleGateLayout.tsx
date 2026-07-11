import { PublicPageControls } from "@/components/PublicPageControls";
import { AppleLayoutWrapper } from "@/components/ui/AppleAppShell";
import { getAppName } from "@/lib/branding";

type AppleGateLayoutProps = {
  children: React.ReactNode;
  title?: string;
};

export function AppleGateLayout({ children, title }: AppleGateLayoutProps) {
  const appName = getAppName();

  return (
    <>
      <PublicPageControls className="fixed right-4 top-4 z-30" />
      <AppleLayoutWrapper
        appName={appName}
        mode="chrome"
        title={title ?? appName}
        className="min-h-screen p-4 md:p-8"
        contentClassName="p-4 md:p-6"
      >
        {children}
      </AppleLayoutWrapper>
    </>
  );
}
