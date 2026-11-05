// Pure filtering, search and aggregation logic, kept free of React so it can be unit-tested.
import type { Bundle, Claim, Classification, Connection, Transaction } from "./types";

export interface ClaimFilter {
  q?: string;
  entity?: string;
  years?: [number, number];
  topics?: string[];
  regions?: string[];
  classifications?: Classification[];
  connections?: Connection[];
  sourceTypes?: string[];
  txCategories?: string[];
  minAmountUSD?: number;
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

/** Every query term must appear somewhere in the claim's searchable text. */
export function matchesQuery(text: string, q: string | undefined): boolean {
  if (!q?.trim()) return true;
  const hay = norm(text);
  return norm(q).split(/\s+/).filter(Boolean).every((t) => hay.includes(t));
}

export function claimText(c: Claim, b: Bundle): string {
  const names = c.entities.map((id) => b.entities.find((e) => e.id === id)?.name ?? id);
  return [c.id, c.title, c.statement, c.limitations, c.responses ?? "", ...names, ...c.regions].join(" ");
}

/** Transactions supported by each claim, for the amount and category filters. */
export function txByClaim(b: Bundle): Map<string, Transaction[]> {
  const m = new Map<string, Transaction[]>();
  for (const t of b.transactions) for (const c of t.claims) m.set(c, [...(m.get(c) ?? []), t]);
  return m;
}

export function filterClaims(b: Bundle, f: ClaimFilter): Claim[] {
  const txs = txByClaim(b);
  const srcType = new Map(b.sources.map((s) => [s.id, s.type]));
  return b.claims.filter((c) => {
    if (f.entity && !c.entities.includes(f.entity)) return false;
    if (f.years && (c.year < f.years[0] || c.year > f.years[1])) return false;
    if (f.topics?.length && !c.topics.some((t) => f.topics!.includes(t))) return false;
    if (f.regions?.length && !c.regions.some((r) => f.regions!.includes(r))) return false;
    if (f.classifications?.length && !f.classifications.includes(c.classification)) return false;
    if (f.connections?.length && !f.connections.includes(c.connection)) return false;
    if (f.sourceTypes?.length && !c.sources.some((s) => f.sourceTypes!.includes(srcType.get(s.id) ?? ""))) return false;
    const ct = txs.get(c.id) ?? [];
    if (f.txCategories?.length && !ct.some((t) => f.txCategories!.includes(t.category))) return false;
    if (f.minAmountUSD && !ct.some((t) => t.currency === "USD" && t.amount_high >= f.minAmountUSD!)) return false;
    return matchesQuery(claimText(c, b), f.q);
  });
}

export interface SearchHit {
  kind: "entity" | "claim" | "transaction" | "source";
  id: string;
  label: string;
  sub: string;
  href: string;
}

export function globalSearch(b: Bundle, q: string, limit = 12): SearchHit[] {
  if (q.trim().length < 2) return [];
  const hits: SearchHit[] = [];
  for (const e of b.entities)
    if (matchesQuery(`${e.name} ${e.role} ${e.summary}`, q))
      hits.push({ kind: "entity", id: e.id, label: e.name, sub: e.role, href: `/entity/${e.id}` });
  for (const c of b.claims)
    if (matchesQuery(claimText(c, b), q))
      hits.push({ kind: "claim", id: c.id, label: c.title, sub: `${c.id} · ${c.event_date}`, href: `/evidence?claim=${c.id}` });
  for (const t of b.transactions)
    if (matchesQuery(`${t.id} ${t.title} ${t.category}`, q))
      hits.push({ kind: "transaction", id: t.id, label: t.title, sub: `${t.id} · ${t.category}`, href: `/money?tx=${t.id}` });
  for (const s of b.sources)
    if (matchesQuery(`${s.id} ${s.title} ${s.publisher}`, q))
      hits.push({ kind: "source", id: s.id, label: s.title, sub: `${s.publisher} · ${s.published}`, href: `/sources?s=${s.id}` });
  return hits.slice(0, limit);
}

/** Top-level amounts only — components (part_of) are excluded so nothing is counted twice. */
export function topLevel(txs: Transaction[]): Transaction[] {
  return txs.filter((t) => !t.part_of);
}

export interface Total {
  category: string;
  currency: string;
  n: number;
  low: number;
  high: number;
}

/**
 * Totals per (category, currency). Never sums across categories or currencies, and
 * excludes components — the only aggregation the dashboard is allowed to show.
 */
export function totalsByCategory(txs: Transaction[]): Total[] {
  const m = new Map<string, Total>();
  for (const t of topLevel(txs)) {
    const k = `${t.category}|${t.currency}`;
    const cur = m.get(k) ?? { category: t.category, currency: t.currency, n: 0, low: 0, high: 0 };
    cur.n += 1;
    cur.low += t.amount_low;
    cur.high += t.amount_high;
    m.set(k, cur);
  }
  return [...m.values()].sort((a, b) => b.high - a.high);
}

export function yearOf(date: string): number {
  return parseInt(date.slice(0, 4), 10);
}

/** Edges touching an entity, plus the neighbouring entity ids. */
export function neighbourhood(b: Bundle, id: string) {
  const edges = b.edges.filter((e) => e.source === id || e.target === id);
  const ids = new Set<string>([id]);
  for (const e of edges) ids.add(e.source).add(e.target);
  return { edges, ids };
}

export interface EdgeFilter {
  hiddenKinds?: Set<string>;
  years?: [number, number];
  classifications?: Classification[];
  topics?: string[];
  entityTypes?: string[];
  q?: string;
}

/**
 * Map edges pass when at least one supporting claim matches the claim-level filters,
 * so the map and the evidence explorer always agree about what is in scope.
 */
export function filterEdges(b: Bundle, f: EdgeFilter) {
  const claims = new Map(b.claims.map((c) => [c.id, c]));
  const etype = new Map(b.entities.map((e) => [e.id, e.type]));
  const ename = new Map(b.entities.map((e) => [e.id, e.name]));
  return b.edges.filter((e) => {
    if (f.hiddenKinds?.has(e.kind)) return false;
    if (f.entityTypes?.length && !(f.entityTypes.includes(etype.get(e.source)!) && f.entityTypes.includes(etype.get(e.target)!)))
      return false;
    if (f.q?.trim() && !matchesQuery(`${ename.get(e.source)} ${ename.get(e.target)} ${e.label}`, f.q)) return false;
    return e.claims.some((id) => {
      const c = claims.get(id);
      if (!c) return false;
      if (f.years && (c.year < f.years[0] || c.year > f.years[1])) return false;
      if (f.classifications?.length && !f.classifications.includes(c.classification)) return false;
      if (f.topics?.length && !c.topics.some((t) => f.topics!.includes(t))) return false;
      return true;
    });
  });
}
