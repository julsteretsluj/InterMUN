import { PublicPageControls } from "@/components/PublicPageControls";
import { AppleAppFrame } from "@/components/ui/AppleAppShell";
import { AppleProductPage } from "@/components/ui/AppleProductPage";
import { AppleWindow } from "@/components/ui/AppleWindow";
import { getAppName } from "@/lib/branding";

type AppleGateLayoutProps = {
  children: React.ReactNode;
  title?: string;
};

export function AppleGateLayout({ children, title }: AppleGateLayoutProps) {
  const appName = getAppName();

  return (
    <AppleAppFrame appName={appName}>
      <AppleProductPage width="narrow" className="min-h-screen py-6 md:py-10">
        <div className="mb-4 flex justify-end">
          <PublicPageControls compact />
        </div>
        <AppleWindow
          title={title ?? appName}
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
