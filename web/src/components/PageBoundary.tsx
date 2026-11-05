import { Component, Suspense, type ReactNode } from "react";

/** Shows a way forward when a page's code fails to download, e.g. after a new deploy or on a dropped connection. */
class LoadErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="text-ink2" role="alert">
        <p>This page didn't load. Check your connection, then reload.</p>
        <button type="button" className="btn mt-3" onClick={() => window.location.reload()}>Reload the page</button>
      </div>
    );
  }
}

export function PageBoundary({ children }: { children: ReactNode }) {
  return (
    <LoadErrorBoundary>
      <Suspense fallback={<p className="min-h-[60vh] text-sm text-muted">Loading…</p>}>{children}</Suspense>
    </LoadErrorBoundary>
  );
}
