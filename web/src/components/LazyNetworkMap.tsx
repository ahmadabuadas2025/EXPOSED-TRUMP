import { lazy, Suspense, type ComponentProps } from "react";

// Cytoscape is the largest dependency by far, so it loads only on pages that draw a map.
const NetworkMap = lazy(() => import("./NetworkMap").then((m) => ({ default: m.NetworkMap })));

export function LazyNetworkMap(props: ComponentProps<typeof NetworkMap>) {
  return (
    <Suspense
      fallback={
        <div style={{ height: props.height ?? 640 }} className="grid place-items-center rounded-lg border border-line bg-surface text-sm text-muted">
          Loading the map…
        </div>
      }
    >
      <NetworkMap {...props} />
    </Suspense>
  );
}
