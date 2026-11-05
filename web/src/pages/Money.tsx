import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ClaimCard } from "../components/ClaimCard";
import { TxBox } from "../components/DetailPanel";
import { useData } from "../lib/data";
import { topLevel, totalsByCategory } from "../lib/filters";
import { money, moneyRange } from "../lib/format";
import type { Transaction } from "../lib/types";
import { ADDITIVE, BENEFIT, CATEGORY } from "../lib/vocab";

// Amounts shown as "confirmed" have appeared in a filing or credible report as having moved
// or been disclosed; everything else is a commitment, announcement, proposal or estimate.
const CONFIRMED = new Set(["paid", "disclosed", "reported"]);
type GroupBy = "item" | "year" | "recipient" | "payer";

interface Row {
  key: string;
  label: string;
  low: number;
  high: number;
  confirmed: boolean;
  items: Transaction[];
}

function group(txs: Transaction[], by: GroupBy, name: (id?: string) => string): Row[] {
  if (by === "item")
    return txs.map((t) => ({ key: t.id, label: t.title, low: t.amount_low, high: t.amount_high, confirmed: CONFIRMED.has(t.status), items: [t] }));
  const m = new Map<string, Row>();
  for (const t of txs) {
    // Multi-year periods ("2017–2021") stay their own bucket rather than being assigned to one year.
    const k = by === "year" ? (t.value_date.includes("–") ? t.value_date : t.value_date.slice(0, 4))
      : by === "recipient" ? t.to : t.from ?? "unattributed";
    const label = by === "year" ? k : name(k === "unattributed" ? undefined : k);
    const r = m.get(k) ?? { key: k, label, low: 0, high: 0, confirmed: true, items: [] };
    r.low += t.amount_low;
    r.high += t.amount_high;
    r.confirmed &&= CONFIRMED.has(t.status);
    r.items.push(t);
    m.set(k, r);
  }
  const rows = [...m.values()];
  return by === "year" ? rows.sort((a, b) => a.key.localeCompare(b.key)) : rows.sort((a, b) => b.high - a.high);
}

function Bars({ rows, currency, onPick, picked }: { rows: Row[]; currency: string; onPick: (r: Row) => void; picked?: string }) {
  const max = Math.max(...rows.map((r) => r.high), 1);
  return (
    <ul className="space-y-1.5" aria-label="Amounts">
      {rows.map((r) => {
        const lo = (r.low / max) * 100;
        const hi = (r.high / max) * 100;
        const val = moneyRange(r.low, r.high, currency);
        const tip = `${r.label}: ${val} · ${r.confirmed ? "confirmed" : "estimate or commitment"}`;
        return (
          <li key={r.key}>
            <button type="button" onClick={() => onPick(r)} title={tip} aria-label={tip} aria-pressed={picked === r.key}
              className={`grid w-full grid-cols-[minmax(0,38%)_minmax(0,1fr)] items-center gap-3 rounded px-1.5 py-1 text-left hover:bg-raised ${picked === r.key ? "bg-raised" : ""}`}>
              <span className="truncate text-sm text-ink">{r.label}</span>
              <span className="flex items-center gap-2">
                <span className="relative h-4 flex-1">
                  {r.confirmed ? (
                    <span className="absolute inset-y-0 left-0 rounded-r-[4px] bg-[color:var(--k-business)]" style={{ width: `${Math.max(lo, 0.6)}%` }} />
                  ) : (
                    <span className="absolute inset-y-0 left-0 rounded-r-[4px] border-2 border-[color:var(--k-business)]"
                      style={{ width: `${Math.max(lo, 0.6)}%`, backgroundImage: "repeating-linear-gradient(45deg, var(--k-business) 0 1.5px, transparent 1.5px 6px)" }} />
                  )}
                  {hi > lo && (
                    <span className="absolute inset-y-0 rounded-r-[4px] border-2 border-l-0 border-dashed border-[color:var(--k-business)] opacity-70"
                      style={{ left: `calc(${lo}% + 2px)`, width: `calc(${hi - lo}% - 2px)` }} />
                  )}
                </span>
                <span className="w-28 shrink-0 text-right font-mono text-xs tabular-nums text-ink">{val}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function Money() {
  const { bundle, entity, claim } = useData();
  const [params, setParams] = useSearchParams();
  const totals = useMemo(() => totalsByCategory(bundle.transactions), [bundle]);
  const initialTx = params.get("tx");
  const initial = initialTx ? bundle.transactions.find((t) => t.id === initialTx) : undefined;
  const [pair, setPair] = useState(initial ? `${initial.category}|${initial.currency}` : "revenue|USD");
  const [by, setBy] = useState<GroupBy>("item");
  const [benefit, setBenefit] = useState<string>("");
  const [table, setTable] = useState(false);
  const [picked, setPicked] = useState<Row | null>(null);
  const [category, currency] = pair.split("|");
  const additive = ADDITIVE.has(category);
  const groupBy: GroupBy = additive ? by : "item";

  const txs = useMemo(
    () => topLevel(bundle.transactions).filter((t) => t.category === category && t.currency === currency && (!benefit || t.personal_benefit === benefit)),
    [bundle, category, currency, benefit],
  );
  const rows = useMemo(() => group(txs, groupBy, (id) => (id ? entity.get(id)?.name ?? id : "Payer not modelled")), [txs, groupBy, entity]);

  useEffect(() => {
    if (initial) {
      const t = initial.part_of ? bundle.transactions.find((x) => x.id === initial.part_of)! : initial;
      setPicked({ key: t.id, label: t.title, low: t.amount_low, high: t.amount_high, confirmed: CONFIRMED.has(t.status), items: [t] });
    }
  }, [initialTx]);

  const components = (t: Transaction) => bundle.transactions.filter((x) => x.part_of === t.id);
  const proven = topLevel(bundle.transactions).filter((t) => t.personal_benefit === "proven");

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-serif text-3xl font-semibold text-ink">Follow the money</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink2">
          Every amount in the register, typed by what it actually is. A $2 billion investment commitment isn't $2 billion of income, a
          company's valuation isn't its owner's profit, and a donation to a super PAC isn't money in a candidate's pocket. So amounts
          are shown one type and one currency at a time, and never added across types.
        </p>
      </header>

      <section aria-labelledby="tot-h">
        <h2 id="tot-h" className="eyebrow mb-2">Amount types · pick one to chart it</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {totals.map((t) => {
            const k = `${t.category}|${t.currency}`;
            const largest = topLevel(bundle.transactions)
              .filter((x) => x.category === t.category && x.currency === t.currency)
              .sort((a, b) => b.amount_high - a.amount_high)[0];
            return (
              <button key={k} type="button" onClick={() => { setPair(k); setPicked(null); }} aria-pressed={pair === k}
                className={`card p-3 text-left transition-colors hover:border-ink2 ${pair === k ? "border-ink ring-1 ring-ink" : ""}`}>
                <div className="text-xs text-ink2">{CATEGORY[t.category]?.label} · {t.currency}</div>
                <div className="font-serif text-xl font-semibold text-ink">{moneyRange(largest.amount_low, largest.amount_high, t.currency)}</div>
                <div className="truncate text-[11px] text-ink2" title={largest.title}>{t.n > 1 ? "largest: " : ""}{largest.title}</div>
                <div className="font-mono text-[11px] text-muted">{t.n} item{t.n > 1 ? "s" : ""}{!ADDITIVE.has(t.category) && " · not additive"}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="chart-h" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className="flex flex-wrap items-end gap-3">
            <h2 id="chart-h" className="font-serif text-2xl font-semibold text-ink">{CATEGORY[category]?.label} · {currency}</h2>
            <span className="text-sm text-ink2">{CATEGORY[category]?.desc}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            {additive ? (
              <div role="group" aria-label="Group by" className="inline-flex overflow-hidden rounded-md border border-line">
                {(["item", "year", "recipient", "payer"] as GroupBy[]).map((g) => (
                  <button key={g} type="button" aria-pressed={groupBy === g} onClick={() => { setBy(g); setPicked(null); }}
                    className={`px-3 py-1.5 ${groupBy === g ? "bg-ink text-page" : "bg-raised text-ink2"}`}>{g === "item" ? "Each amount" : `By ${g}`}</button>
                ))}
              </div>
            ) : (
              <span className="rounded-md border border-dashed border-line px-3 py-1.5 text-xs text-ink2">
                Shown item by item. Amounts of this type can't be added together.
              </span>
            )}
            <label className="flex items-center gap-2 text-ink2">
              Personal benefit
              <select className="input w-auto py-1" value={benefit} onChange={(e) => setBenefit(e.target.value)}>
                <option value="">Any</option>
                {Object.entries(BENEFIT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <button type="button" className="btn" onClick={() => setTable(!table)}>{table ? "Chart view" : "Table view"}</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink2" aria-label="Chart key">
            <span className="flex items-center gap-1.5"><span className="h-3 w-6 rounded-r bg-[color:var(--k-business)]" />Confirmed: paid, disclosed or reported</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-6 rounded-r border-2 border-[color:var(--k-business)]" style={{ backgroundImage: "repeating-linear-gradient(45deg, var(--k-business) 0 1.5px, transparent 1.5px 6px)" }} />Committed, announced, proposed or estimated</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-6 rounded-r border-2 border-dashed border-[color:var(--k-business)]" />Upper end of a reported range</span>
          </div>
          <div className="card mt-3 p-3">
            {rows.length === 0 ? (
              <p className="p-4 text-sm text-ink2">No amounts of this type match.</p>
            ) : table ? (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted"><tr><th className="p-1.5">{groupBy === "item" ? "Amount" : groupBy}</th><th className="p-1.5 text-right">Low</th><th className="p-1.5 text-right">High</th><th className="p-1.5">Status</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r) => (
                    <tr key={r.key}>
                      <td className="p-1.5"><button className="link text-left" onClick={() => setPicked(r)}>{r.label}</button></td>
                      <td className="p-1.5 text-right font-mono tabular-nums">{money(r.low, currency)}</td>
                      <td className="p-1.5 text-right font-mono tabular-nums">{money(r.high, currency)}</td>
                      <td className="p-1.5 text-ink2">{r.confirmed ? "confirmed" : "estimate / commitment"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Bars rows={rows} currency={currency} onPick={setPicked} picked={picked?.key} />
            )}
          </div>
          {groupBy !== "item" && <p className="mt-2 text-xs text-muted">Grouped totals add only amounts of the same type and currency, excluding components already counted in a parent amount.</p>}
        </div>

        <aside aria-live="polite">
          {picked ? (
            <div className="space-y-3">
              <button type="button" className="font-mono text-xs text-muted hover:text-ink" onClick={() => { setPicked(null); setParams({}); }}>✕ close</button>
              {picked.items.map((t) => (
                <div key={t.id} className="space-y-2">
                  <div className="eyebrow">{t.id} · {t.value_date}</div>
                  <h3 className="font-serif text-lg font-semibold text-ink">{t.title}</h3>
                  <div className="text-sm text-ink2">
                    {t.from ? <Link className="link" to={`/entity/${t.from}`}>{entity.get(t.from)?.name}</Link> : "Payer not modelled"} →{" "}
                    <Link className="link" to={`/entity/${t.to}`}>{entity.get(t.to)?.name}</Link>
                  </div>
                  <TxBox id={t.id} />
                  {components(t).length > 0 && (
                    <div className="text-sm">
                      <div className="eyebrow mb-1">Includes (not added again)</div>
                      <ul className="space-y-0.5">
                        {components(t).map((c) => <li key={c.id} className="text-ink2">{moneyRange(c.amount_low, c.amount_high, c.currency)} · {c.title}</li>)}
                      </ul>
                    </div>
                  )}
                  {t.claims.map((c) => <ClaimCard key={c} claim={claim.get(c)!} compact />)}
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-4 text-sm text-ink2">Select a bar to see what the amount is, who received it, and the evidence behind it.</div>
          )}
        </aside>
      </section>

      <section aria-labelledby="pb-h">
        <h2 id="pb-h" className="font-serif text-2xl font-semibold text-ink">Money shown to have reached Trump or his family</h2>
        <p className="mt-1 max-w-3xl text-sm text-ink2">
          These are the amounts an official filing, or a primary record as reported, shows were income to Donald Trump, Jared Kushner
          or Ivanka Trump. They're listed separately because they're different kinds of income from different years, so no total is
          given. Most aren't connected to Israel policy.
        </p>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {proven.map((t) => (
            <li key={t.id} className="card flex items-baseline gap-3 p-3">
              <span className="w-32 shrink-0 font-serif text-lg font-semibold tabular-nums text-ink">{moneyRange(t.amount_low, t.amount_high, t.currency)}</span>
              <span className="text-sm">
                <button className="link text-left text-ink" onClick={() => { setPair(`${t.category}|${t.currency}`); setPicked({ key: t.id, label: t.title, low: t.amount_low, high: t.amount_high, confirmed: CONFIRMED.has(t.status), items: [t] }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{t.title}</button>
                <span className="block text-xs text-ink2">{CATEGORY[t.category]?.label} · {t.value_date} · {t.status}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
