import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ClassBadge } from "../components/Badges";
import { ClaimCard } from "../components/ClaimCard";
import { EdgeSwatch } from "../components/Legend";
import { LazyNetworkMap } from "../components/LazyNetworkMap";
import type { Selection } from "../components/NetworkMap";
import { useData } from "../lib/data";
import { neighbourhood } from "../lib/filters";
import { date, moneyRange } from "../lib/format";
import type { Edge } from "../lib/types";
import { BENEFIT, CATEGORY, EDGE, ENTITY_TYPE, LANES } from "../lib/vocab";

export function Profiles() {
  const { bundle } = useData();
  const [q, setQ] = useState("");
  const list = bundle.entities.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold text-ink">Profiles</h1>
      <p className="mt-1 text-sm text-ink2">Every person, organisation and policy decision on the map.</p>
      <label htmlFor="pf-q" className="sr-only">Filter profiles</label>
      <input id="pf-q" className="input mt-4 max-w-sm" placeholder="Filter by name" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-6 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {LANES.map((lane, i) => {
          const items = list.filter((e) => e.lane === i + 1).sort((a, b) => b.degree - a.degree);
          if (!items.length) return null;
          return (
            <section key={lane}>
              <h2 className="eyebrow mb-2">{lane}</h2>
              <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                {items.map((e) => (
                  <li key={e.id}>
                    <Link to={`/entity/${e.id}`} className="flex items-baseline gap-2 px-3 py-2 hover:bg-raised">
                      <span className="flex-1 text-sm font-medium text-ink">{e.name}</span>
                      <span className="text-xs text-muted">{ENTITY_TYPE[e.type]}</span>
                      <span className="font-mono text-xs tabular-nums text-ink2">{e.degree}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

const GROUPS: { title: string; kinds: Edge["kind"][] }[] = [
  { title: "Business interests & ownership", kinds: ["ownership", "business", "role"] },
  { title: "Money", kinds: ["money", "money-proposed"] },
  { title: "Policy connections", kinds: ["policy", "political"] },
  { title: "Investigations & reporting", kinds: ["oversight", "reported", "inference"] },
  { title: "Family", kinds: ["family"] },
];

export function Profile() {
  const { id = "" } = useParams();
  const { bundle, entity } = useData();
  const e = entity.get(id);
  const [sel, setSel] = useState<Selection>(null);
  const { edges, ids } = useMemo(() => neighbourhood(bundle, id), [bundle, id]);
  const claims = useMemo(
    () => bundle.claims.filter((c) => c.entities.includes(id)).sort((a, b) => b.event_date.localeCompare(a.event_date)),
    [bundle, id],
  );
  const txs = bundle.transactions.filter((t) => t.from === id || t.to === id || t.beneficiary === id);
  const sources = [...new Set(claims.flatMap((c) => c.sources.map((s) => s.id)))].map((s) => bundle.sources.find((x) => x.id === s)!);
  // Where the record is contested or thin: disputed, unproven or inferential findings, and any with a response on file.
  const open = claims.filter(
    (c) => c.classification === "disputed" || c.connection === "plausible-unproven" || c.classification === "inference" || c.responses,
  );

  if (!e) return <p className="text-ink2">No profile with id “{id}”. <Link to="/profiles" className="link">All profiles</Link></p>;

  return (
    <div className="space-y-10">
      <header>
        <Link to="/profiles" className="font-mono text-xs text-muted hover:text-ink">← Profiles</Link>
        <div className="eyebrow mt-3">{ENTITY_TYPE[e.type]}{e.country ? ` · ${e.country}` : ""} · {LANES[e.lane - 1]}</div>
        <h1 className="mt-1 font-serif text-4xl font-semibold text-ink">{e.name}</h1>
        <p className="mt-2 max-w-3xl text-lg text-ink">{e.role}</p>
        <p className="mt-1 max-w-3xl text-ink2">{e.summary}</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <h2 className="eyebrow mb-2">Direct connections</h2>
          <LazyNetworkMap entities={bundle.entities.filter((x) => ids.has(x.id))} edges={edges} selected={sel} onSelect={setSel}
            layout="ego" height={440} focus={id} />
        </div>
        <div className="space-y-5">
          {GROUPS.map((g) => {
            const list = edges.filter((x) => g.kinds.includes(x.kind));
            if (!list.length) return null;
            return (
              <div key={g.title}>
                <h2 className="eyebrow mb-1.5">{g.title}</h2>
                <ul className="space-y-1">
                  {list.map((x) => {
                    const other = entity.get(x.source === id ? x.target : x.source)!;
                    return (
                      <li key={x.id} className="flex items-start gap-2 text-sm">
                        <span className="mt-1.5" title={EDGE[x.kind].label}><EdgeSwatch kind={x.kind} /></span>
                        <span>
                          <span className="text-muted">{x.source === id ? "→ " : "← "}</span>
                          <Link to={`/entity/${other.id}`} className="link text-ink">{other.name}</Link>
                          <span className="block text-xs text-ink2">
                            {x.label} · {x.claims.map((c) => <Link key={c} to={`/evidence?claim=${c}`} className="link mr-1 font-mono">{c}</Link>)}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {txs.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl font-semibold text-ink">Reported financial figures</h2>
          <p className="mt-1 text-sm text-ink2">Each row is a different kind of amount. They aren't added together.</p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-surface text-xs text-muted">
                <tr><th className="p-2">Amount</th><th className="p-2">What it is</th><th className="p-2">Type</th><th className="p-2">Status</th><th className="p-2">Personal benefit</th><th className="p-2">Date</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {txs.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap p-2 font-semibold tabular-nums text-ink">{moneyRange(t.amount_low, t.amount_high, t.currency)}</td>
                    <td className="p-2"><Link to={`/money?tx=${t.id}`} className="link">{t.title}</Link>{t.part_of && <span className="text-xs text-muted"> (part of {t.part_of})</span>}</td>
                    <td className="p-2 text-ink2">{CATEGORY[t.category]?.label}</td>
                    <td className="p-2 text-ink2">{t.status}</td>
                    <td className="p-2 text-ink2">{BENEFIT[t.personal_benefit].label}</td>
                    <td className="p-2 font-mono text-xs text-muted">{t.value_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="font-serif text-2xl font-semibold text-ink">Timeline of findings</h2>
        <ol className="mt-3 border-l border-line pl-4">
          {claims.map((c) => (
            <li key={c.id} className="relative mb-3">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-page bg-ink2" aria-hidden />
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted">{date(c.event_date)}</span>
                <ClassBadge value={c.classification} />
              </div>
              <Link to={`/evidence?claim=${c.id}`} className="link text-sm text-ink">{c.title}</Link>
            </li>
          ))}
        </ol>
      </section>

      {open.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl font-semibold text-ink">Contradictory evidence & unresolved questions</h2>
          <p className="mt-1 text-sm text-ink2">Findings where the record is disputed or unproven, or where the people involved have responded.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {open.map((c) => <ClaimCard key={c.id} claim={c} compact />)}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-serif text-2xl font-semibold text-ink">Source documents ({sources.length})</h2>
        <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm md:grid-cols-2">
          {sources.map((s) => (
            <li key={s.id}>
              <span className="font-mono text-[11px] text-muted">{s.id}</span>{" "}
              <a className="link text-ink" href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
              <span className="text-xs text-ink2"> — {s.publisher}, {date(s.published)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
