import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { filterClaims, filterEdges, globalSearch, matchesQuery, topLevel, totalsByCategory } from "./filters";
import { date, money, moneyRange } from "./format";
import type { Bundle } from "./types";

// Tests run against the real built bundle so they catch data/UI drift too.
const bundle: Bundle = JSON.parse(readFileSync(new URL("../../public/data/bundle.json", import.meta.url), "utf-8"));

describe("search", () => {
  it("requires every term, ignoring case and accents", () => {
    expect(matchesQuery("Qatari Diar signs golf deal", "golf QATARI")).toBe(true);
    expect(matchesQuery("Qatari Diar signs golf deal", "golf Saudi")).toBe(false);
    expect(matchesQuery("Café", "cafe")).toBe(true);
  });
  it("finds people, findings and sources", () => {
    const kinds = new Set(globalSearch(bundle, "Phoenix", 50).map((h) => h.kind));
    expect(kinds.has("entity")).toBe(true);
    expect(kinds.has("claim")).toBe(true);
    expect(kinds.has("source")).toBe(true);
  });
  it("ignores one-character queries", () => {
    expect(globalSearch(bundle, "a")).toEqual([]);
  });
});

describe("claim filters", () => {
  it("filters by entity", () => {
    const r = filterClaims(bundle, { entity: "affinity-partners" });
    expect(r.length).toBeGreaterThan(5);
    expect(r.every((c) => c.entities.includes("affinity-partners"))).toBe(true);
  });
  it("filters by classification and year range", () => {
    const r = filterClaims(bundle, { classifications: ["verified"], years: [2017, 2020] });
    expect(r.map((c) => c.id).sort()).toEqual(["C-001", "C-004"]);
  });
  it("filters by linked transaction amount", () => {
    const r = filterClaims(bundle, { minAmountUSD: 1e10 });
    expect(r.map((c) => c.id)).toEqual(expect.arrayContaining(["C-009", "C-030", "C-007"]));
    expect(r.every((c) => bundle.transactions.some((t) => t.claims.includes(c.id) && t.amount_high >= 1e10))).toBe(true);
  });
});

describe("edge filters", () => {
  it("hides selected kinds", () => {
    const r = filterEdges(bundle, { hiddenKinds: new Set(["family"]) });
    expect(r.some((e) => e.kind === "family")).toBe(false);
    expect(r.length).toBeLessThan(bundle.edges.length);
  });
  it("keeps an edge only if a supporting claim is in the year range", () => {
    const r = filterEdges(bundle, { years: [2017, 2017] });
    const claims = new Map(bundle.claims.map((c) => [c.id, c]));
    expect(r.every((e) => e.claims.some((id) => claims.get(id)!.year === 2017))).toBe(true);
  });
});

describe("money aggregation", () => {
  it("excludes components so nothing is counted twice", () => {
    const top = topLevel(bundle.transactions);
    expect(top.some((t) => t.id === "T-003")).toBe(false); // $87M is inside T-002
    expect(top.some((t) => t.id === "T-002")).toBe(true);
  });
  it("never mixes categories or currencies in a total", () => {
    const totals = totalsByCategory(bundle.transactions);
    const keys = totals.map((t) => `${t.category}|${t.currency}`);
    expect(new Set(keys).size).toBe(keys.length);
    const ils = totals.find((t) => t.category === "investment-capital" && t.currency === "ILS")!;
    expect(ils.high).toBe(940_000_000);
  });
  it("first-term foreign payments total only the parent figure", () => {
    const rev = totalsByCategory(bundle.transactions.filter((t) => ["T-013", "T-014", "T-015"].includes(t.id)));
    expect(rev).toEqual([{ category: "revenue", currency: "USD", n: 1, low: 7_800_000, high: 7_800_000 }]);
  });
});

describe("formatting", () => {
  it("formats money compactly by currency", () => {
    expect(money(2e9, "USD")).toBe("$2B");
    expect(money(1.05e9, "ILS")).toBe("₪1.05B");
    expect(money(157e6, "USD")).toBe("$157M");
    expect(money(615422, "USD")).toBe("$615,422");
  });
  it("shows upper-bound-only ranges as 'up to'", () => {
    expect(moneyRange(0, 157e6, "USD")).toBe("up to $157M");
    expect(moneyRange(172e6, 640e6, "USD")).toBe("$172M–640M");
  });
  it("keeps the source's date precision", () => {
    expect(date("2017-12-06")).toBe("Dec 6, 2017");
    expect(date("2025-01")).toBe("Jan 2025");
    expect(date("2021")).toBe("2021");
    expect(date("2011–2013")).toBe("2011–2013");
  });
});
