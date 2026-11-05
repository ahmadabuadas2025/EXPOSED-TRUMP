import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ClassBadge } from "../components/Badges";
import { Chips } from "../components/Chips";
import { useData } from "../lib/data";
import { date } from "../lib/format";
import type { Claim, Track } from "../lib/types";
import { TOPIC } from "../lib/vocab";

// Political and financial events sit in separate columns. Sharing a row means sharing a year,
// nothing more: no line is drawn between columns because no causal link is established.
const COLUMNS: { key: string; tracks: Track[] }[] = [
  { key: "Policy & presidential decisions", tracks: ["policy"] },
  { key: "Business & financial events", tracks: ["financial"] },
  { key: "Investigations, oversight & diplomacy", tracks: ["oversight", "diplomacy"] },
];

function Item({ c }: { c: Claim }) {
  return (
    <li>
      <Link to={`/evidence?claim=${c.id}`} className="card block p-3 transition-colors hover:border-ink2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-muted">{date(c.event_date)}</span>
          <span className="ml-auto"><ClassBadge value={c.classification} /></span>
        </div>
        <div className="mt-1 text-sm font-medium leading-snug text-ink">{c.title}</div>
      </Link>
    </li>
  );
}

export function Timeline() {
  const { bundle } = useData();
  const [topics, setTopics] = useState<string[]>([]);
  const [term, setTerm] = useState<"all" | "first" | "between" | "second">("all");
  const inTerm = (y: number) =>
    term === "all" || (term === "first" ? y >= 2017 && y <= 2020 : term === "between" ? y >= 2021 && y <= 2024 : y >= 2025);

  const rows = useMemo(() => {
    const claims = bundle.claims.filter(
      (c) => c.track !== "analysis" && inTerm(c.year) && (!topics.length || c.topics.some((t) => topics.includes(t))),
    );
    const years = [...new Set(claims.map((c) => c.year))].sort((a, b) => b - a);
    return years.map((y) => ({
      year: y,
      cols: COLUMNS.map((col) =>
        claims.filter((c) => c.year === y && col.tracks.includes(c.track)).sort((a, b) => b.event_date.localeCompare(a.event_date)),
      ),
    }));
  }, [bundle, topics, term]);

  const termLabel = (y: number) => (y >= 2025 ? "Second term" : y >= 2021 ? "Out of office" : y >= 2017 ? "First term" : "Before office");

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold text-ink">Timeline</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink2">
        Decisions and money, side by side but kept apart. Events in the same row happened in the same year. That's all the layout
        says. Where evidence links a decision to a financial event, the finding itself says so.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-6">
        <fieldset>
          <legend className="eyebrow mb-1.5">Period</legend>
          <div className="flex flex-wrap gap-1.5">
            {([["all", "All"], ["first", "First term 2017–20"], ["between", "2021–24"], ["second", "Second term 2025–"]] as const).map(([k, l]) => (
              <button key={k} type="button" className="chip" aria-pressed={term === k} onClick={() => setTerm(k)}>{l}</button>
            ))}
          </div>
        </fieldset>
        <Chips label="Topic" options={Object.keys(TOPIC)} value={topics} onChange={setTopics} render={(t) => TOPIC[t]} />
      </div>

      <div className="mt-6">
        <div className="sticky top-[57px] z-10 hidden grid-cols-[80px_repeat(3,minmax(0,1fr))] gap-3 border-b border-line bg-page py-2 md:grid">
          <div />
          {COLUMNS.map((c) => <div key={c.key} className="eyebrow">{c.key}</div>)}
        </div>
        <ol>
          {rows.map((r) => (
            <li key={r.year} className="grid gap-3 border-b border-line py-4 md:grid-cols-[80px_repeat(3,minmax(0,1fr))]">
              <div>
                <div className="font-serif text-2xl font-semibold text-ink">{r.year}</div>
                <div className="font-mono text-[10px] uppercase text-muted">{termLabel(r.year)}</div>
              </div>
              {r.cols.map((items, i) => (
                <div key={i}>
                  {items.length > 0 && <div className="eyebrow mb-1.5 md:hidden">{COLUMNS[i].key}</div>}
                  <ul className="space-y-2">{items.map((c) => <Item key={c.id} c={c} />)}</ul>
                </div>
              ))}
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-4 text-xs text-muted">Analytical inferences aren't events, so they're left off the timeline. See the evidence explorer.</p>
    </div>
  );
}
