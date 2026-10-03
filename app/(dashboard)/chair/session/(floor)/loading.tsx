/**
 * Floor soft-nav stays on the persistent shell; pages are URL anchors only.
 * An empty local fallback keeps Suspense from bubbling a dashboard skeleton
 * that would unmount the live floor UI.
 */
export default function ChairSessionFloorLoading() {
  return null;
}
