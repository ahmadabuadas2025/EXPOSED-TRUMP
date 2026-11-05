import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Bundle, Claim, Entity, Source, Transaction } from "./types";

interface Indexed {
  bundle: Bundle;
  entity: Map<string, Entity>;
  claim: Map<string, Claim>;
  source: Map<string, Source>;
  tx: Map<string, Transaction>;
}

const Ctx = createContext<Indexed | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/bundle.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setBundle)
      .catch((e) => setError(String(e)));
  }, []);

  const value = useMemo<Indexed | null>(
    () =>
      bundle && {
        bundle,
        entity: new Map(bundle.entities.map((e) => [e.id, e])),
        claim: new Map(bundle.claims.map((c) => [c.id, c])),
        source: new Map(bundle.sources.map((s) => [s.id, s])),
        tx: new Map(bundle.transactions.map((t) => [t.id, t])),
      },
    [bundle],
  );

  if (error)
    return (
      <div className="p-8 text-ink2">
        Could not load the evidence data ({error}). Run <code>npm run data</code> to build it.
      </div>
    );
  if (!value) return <div className="p-8 font-mono text-sm text-muted">Loading the evidence…</div>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): Indexed {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData outside DataProvider");
  return v;
}
