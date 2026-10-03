import { DelayedRouteLoading } from "@/components/ui/DelayedLoadingOverlay";

/** Auth route Suspense fallback — paints only after ≥1s to avoid flicker. */
export default function AuthLoading() {
  return <DelayedRouteLoading label="Loading" />;
}
