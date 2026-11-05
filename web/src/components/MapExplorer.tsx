import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../lib/data";
import { filterEdges } from "../lib/filters";
import type { Classification, EdgeKind } from "../lib/types";
import { CLASSIFICATION, CLASSIFICATION_ORDER, EDGE, ENTITY_TYPE, TOPIC } from "../lib/vocab";
import { Chips, YearRange } from "./Chips";
import { DetailPanel } from "./DetailPanel";
import { LazyNetworkMap } from "./LazyNetworkMap";
import { EdgeSwatch, Legend } from "./Legend";
import type { LayoutName, Selection } from "./NetworkMap";

const PHONE_MAP_HEIGHT = 460;

export function MapExplorer({
  height = 660,
  initialHidden = ["family"] as EdgeKind[],
  wheelZoom = true,
}: {
  height?: number;
  initialHidden?: EdgeKind[];
  /** Off where the map sits in a longer page, so scrolling past it keeps scrolling the page. */
  wheelZoom?: boolean;
}) {
  const { bundle, entity } = useData();
  const years = useMemo(() => {
    const ys = bundle.claims.map((c) => c.year);
    return [Math.min(...ys), Math.max(...ys)] as [number, number];
  }, [bundle]);
  const [hidden, setHidden] = useState<Set<EdgeKind>>(new Set(initialHidden));
  const [range, setRange] = useState<[number, number]>(years);
  const [classes, setClasses] = useState<Classification[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [layout, setLayout] = useState<LayoutName>("lanes");
  const [sel, setSel] = useState<Selection>(null);
  const [table, setTable] = useState(false);
  const [amounts, setAmounts] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const base = useMemo(
    () => filterEdges(bundle, { years: range, classifications: classes, topics, entityTypes: types, q: deferredQ }),
    [bundle, range, classes, topics, types, deferredQ],
  );
  const edges = useMemo(() => base.filter((e) => !hidden.has(e.kind)), [base, hidden]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of base) c[e.kind] = (c[e.kind] ?? 0) + 1;
    return c;
  }, [base]);

  const toggle = (k: EdgeKind) => {
    const n = new Set(hidden);
    n.has(k) ? n.delete(k) : n.add(k);
    setHidden(n);
  };

  const yearsChanged = range[0] !== years[0] || range[1] !== years[1];
  const activeFilters = classes.length + topics.length + types.length + (yearsChanged ? 1 : 0);
  const stageHeight = window.innerWidth < 640 ? Math.min(height, PHONE_MAP_HEIGHT) : height;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="w-full sm:w-60">
          <label htmlFor="map-q" className="sr-only">Find on the map</label>
          <input id="map-q" className="input py-1.5" placeholder="Find Qatar, Phoenix, Kushner" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div role="group" aria-label="Layout" className="inline-flex overflow-hidden rounded-md border border-line">
          {(["lanes", "force"] as LayoutName[]).map((l) => (
            <button key={l} type="button" aria-pressed={layout === l} onClick={() => setLayout(l)}
              className={`px-3 py-1.5 ${layout === l ? "bg-ink text-page" : "bg-raised text-ink2"}`}>
              {l === "lanes" ? "By role" : "Clustered"}
            </button>
          ))}
        </div>
        <button type="button" className="btn" aria-expanded={showFilters} aria-controls="map-filters" onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? "Hide filters" : "Filters"}{activeFilters > 0 && ` (${activeFilters})`}
        </button>
        <button type="button" className="btn" aria-pressed={amounts} onClick={() => setAmounts(!amounts)} disabled={table}>
          <span className={`inline-block h-3 w-3 rounded-sm border ${amounts ? "border-[color:var(--k-money)] bg-[color:var(--k-money)]" : "border-line"}`} aria-hidden />
          Show amounts
        </button>
        <button type="button" className="btn" aria-pressed={table} onClick={() => setTable(!table)}>
          {table ? "Show map" : "Text table view"}
        </button>
        <span className="text-xs text-muted lg:ml-auto">{edges.length} lines, each citing a finding</span>
      </div>

      {showFilters && (
        <div id="map-filters" className="card grid gap-5 p-4 md:grid-cols-2 xl:grid-cols-4">
          <YearRange min={years[0]} max={years[1]} value={range} onChange={setRange} />
          <Chips label="Evidence strength" options={CLASSIFICATION_ORDER.filter((c) => bundle.stats.by_classification[c])}
            value={classes} onChange={setClasses} render={(c) => CLASSIFICATION[c].label} />
          <Chips label="Topic" options={Object.keys(TOPIC)} value={topics} onChange={setTopics} render={(t) => TOPIC[t]} />
          <Chips label="Only these kinds of actor" options={Object.keys(ENTITY_TYPE)} value={types} onChange={setTypes}
            render={(t) => ENTITY_TYPE[t]} />
        </div>
      )}

      <Legend counts={counts} hidden={hidden} onToggle={toggle} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {table ? (
            <div className="overflow-auto rounded-lg border border-line" style={{ maxHeight: stageHeight }}>
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Connections currently in view</caption>
                <thead className="sticky top-0 bg-surface text-xs text-muted">
                  <tr><th className="p-2">From</th><th className="p-2">Relationship</th><th className="p-2">To</th><th className="p-2">Evidence</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {edges.map((e) => (
                    <tr key={e.id}>
                      <td className="p-2"><Link className="link" to={`/entity/${e.source}`}>{entity.get(e.source)?.name}</Link></td>
                      <td className="p-2">
                        <span className="flex items-center gap-2"><EdgeSwatch kind={e.kind} /><span>{e.label}</span></span>
                        <span className="text-xs text-muted">{EDGE[e.kind].label}</span>
                      </td>
                      <td className="p-2"><Link className="link" to={`/entity/${e.target}`}>{entity.get(e.target)?.name}</Link></td>
                      <td className="p-2 font-mono text-xs">
                        {e.claims.map((c) => <Link key={c} className="link mr-1" to={`/evidence?claim=${c}`}>{c}</Link>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <LazyNetworkMap entities={bundle.entities} edges={edges} selected={sel} onSelect={setSel} layout={layout}
              height={stageHeight} showAmounts={amounts} wheelZoom={wheelZoom} />
          )}
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted">
            Gold particles show the direction money moved. Hollow ones are committed or estimated, not shown paid. Drag to pan and{" "}
            {window.matchMedia("(pointer: coarse)").matches ? "pinch" : wheelZoom ? "scroll" : "hold Ctrl and scroll"} to zoom. Node size reflects how many documented connections an entity has,
            not importance or guilt.
          </p>
        </div>

        <aside className="lg:overflow-y-auto" style={{ maxHeight: window.innerWidth >= 1024 ? stageHeight : undefined }} aria-live="polite">
          <div className="card p-4">
            <DetailPanel selection={sel} edges={edges} onClose={() => setSel(null)} />
          </div>
        </aside>
      </div>
    </div>
  );
}
