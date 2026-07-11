import { AppleLayoutWrapper } from "@/components/ui/AppleAppShell";
import { getAppName } from "@/lib/branding";

export default function AllocationSignupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppleLayoutWrapper appName={getAppName()} mode="chrome" title={getAppName()}>
      {children}
    </AppleLayoutWrapper>
  );
}
