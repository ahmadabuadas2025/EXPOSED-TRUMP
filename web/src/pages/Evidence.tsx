import { useEffect, useMemo, useState } from "react";
import { EmptyState, PageTitle } from "../components/Sticker";
import { useSearchParams } from "react-router-dom";
import { ClaimCard } from "../components/ClaimCard";
import { Chips, YearRange } from "../components/Chips";
import { useData } from "../lib/data";
import { filterClaims } from "../lib/filters";
import type { Classification, Connection } from "../lib/types";
import { CATEGORY, CLASSIFICATION, CLASSIFICATION_ORDER, CONNECTION, CONNECTION_ORDER, TOPIC } from "../lib/vocab";

const AMOUNTS: [string, number][] = [["Any amount", 0], ["≥ $1M", 1e6], ["≥ $100M", 1e8], ["≥ $1B", 1e9]];

export function Evidence() {
  const { bundle } = useData();
  const [params, setParams] = useSearchParams();
  const focusClaim = params.get("claim");
  const years = useMemo(() => {
    const ys = bundle.claims.map((c) => c.year);
    return [Math.min(...ys), Math.max(...ys)] as [number, number];
  }, [bundle]);
  const regions = useMemo(() => [...new Set(bundle.claims.flatMap((c) => c.regions))].sort(), [bundle]);
  const srcTypes = useMemo(() => [...new Set(bundle.sources.map((s) => s.type))].sort(), [bundle]);
  const cats = useMemo(() => [...new Set(bundle.transactions.map((t) => t.category))], [bundle]);
  const people = useMemo(() => [...bundle.entities].sort((a, b) => a.name.localeCompare(b.name)), [bundle]);

  const [q, setQ] = useState("");
  const [entity, setEntity] = useState(params.get("entity") ?? "");
  const [range, setRange] = useState(years);
  const [topics, setTopics] = useState<string[]>([]);
  const [regs, setRegs] = useState<string[]>([]);
  const [classes, setClasses] = useState<Classification[]>([]);
  const [conns, setConns] = useState<Connection[]>([]);
  const [stypes, setStypes] = useState<string[]>([]);
  const [tcats, setTcats] = useState<string[]>([]);
  const [minAmt, setMinAmt] = useState(0);
  const [sort, setSort] = useState<"date" | "strength">("date");
  const [showFilters, setShowFilters] = useState(false);

  const results = useMemo(() => {
    const r = filterClaims(bundle, {
      q, entity: entity || undefined, years: range, topics, regions: regs, classifications: classes,
      connections: conns, sourceTypes: stypes, txCategories: tcats, minAmountUSD: minAmt,
    });
    return sort === "date"
      ? [...r].sort((a, b) => b.event_date.localeCompare(a.event_date))
      : [...r].sort((a, b) => CLASSIFICATION_ORDER.indexOf(a.classification) - CLASSIFICATION_ORDER.indexOf(b.classification));
  }, [bundle, q, entity, range, topics, regs, classes, conns, stypes, tcats, minAmt, sort]);

  useEffect(() => {
    if (focusClaim) document.getElementById(focusClaim)?.scrollIntoView({ block: "start" });
  }, [focusClaim]);

  if (focusClaim && bundle.claims.some((c) => c.id === focusClaim)) {
    const c = bundle.claims.find((x) => x.id === focusClaim)!;
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <button className="btn" onClick={() => setParams({})}>← All findings</button>
        <h1 className="eyebrow">Finding {c.id}</h1>
        <ClaimCard claim={c} open />
      </div>
    );
  }

  const reset = () => {
    setQ(""); setEntity(""); setRange(years); setTopics([]); setRegs([]); setClasses([]);
    setConns([]); setStypes([]); setTcats([]); setMinAmt(0);
  };

  return (
    <div>
      <PageTitle sticker="evidence">Evidence explorer</PageTitle>
      <p className="mt-1 max-w-3xl text-sm text-ink2">
        Every finding in the register, with its sources, where in each source the support sits, its limitations, and responses from
        the people involved.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <button type="button" className="btn lg:hidden" aria-expanded={showFilters} aria-controls="ev-filters"
          onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? "Hide filters" : "Filter findings"}
        </button>
        <aside id="ev-filters" className={`${showFilters ? "block" : "hidden"} space-y-5 lg:sticky lg:top-[72px] lg:block lg:max-h-[calc(100vh-88px)] lg:self-start lg:overflow-y-auto lg:pb-14 lg:pr-2`}>
          <div>
            <label htmlFor="ev-q" className="eyebrow mb-1.5 block">Search findings</label>
            <input id="ev-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Phoenix, fees, Golan" />
          </div>
          <div>
            <label htmlFor="ev-ent" className="eyebrow mb-1.5 block">Person or organisation</label>
            <select id="ev-ent" className="input" value={entity} onChange={(e) => setEntity(e.target.value)}>
              <option value="">Anyone</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <YearRange min={years[0]} max={years[1]} value={range} onChange={setRange} />
          <Chips label="Evidence classification" options={CLASSIFICATION_ORDER.filter((c) => bundle.stats.by_classification[c])}
            value={classes} onChange={setClasses} render={(c) => CLASSIFICATION[c].label} />
          <Chips label="What it establishes" options={CONNECTION_ORDER} value={conns} onChange={setConns}
            render={(c) => `${CONNECTION[c].n}. ${CONNECTION[c].label}`} />
          <Chips label="Policy area / topic" options={Object.keys(TOPIC)} value={topics} onChange={setTopics} render={(t) => TOPIC[t]} />
          <Chips label="Country or region" options={regions} value={regs} onChange={setRegs} />
          <Chips label="Transaction type" options={cats} value={tcats} onChange={setTcats} render={(c) => CATEGORY[c]?.label ?? c} />
          <fieldset>
            <legend className="eyebrow mb-1.5">Financial amount (USD)</legend>
            <div className="flex flex-wrap gap-1.5">
              {AMOUNTS.map(([l, v]) => (
                <button key={l} type="button" className="chip" aria-pressed={minAmt === v} onClick={() => setMinAmt(v)}>{l}</button>
              ))}
            </div>
          </fieldset>
          <Chips label="Source type" options={srcTypes} value={stypes} onChange={setStypes} />
          <button type="button" className="text-sm text-ink2 underline" onClick={reset}>Reset all filters</button>
        </aside>
        <section aria-live="polite">
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-ink2">{results.length} of {bundle.claims.length} findings</span>
            <label className="ml-auto flex items-center gap-2 text-ink2">
              Sort
              <select className="input w-auto py-1" value={sort} onChange={(e) => setSort(e.target.value as "date" | "strength")}>
                <option value="date">Newest event first</option>
                <option value="strength">Strongest evidence first</option>
              </select>
            </label>
          </div>
          <div className="space-y-3">
            {results.map((c) => <ClaimCard key={c.id} claim={c} />)}
            {results.length === 0 && (
              <EmptyState>
                <p className="font-medium text-ink">No findings match these filters.</p>
                <button type="button" className="link mt-1 text-sm" onClick={reset}>Reset all filters</button>
              </EmptyState>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
