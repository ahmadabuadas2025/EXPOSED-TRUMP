// Mirrors the bundle written by pipeline/build.py.

export type Classification = "verified" | "corroborated" | "reported" | "disputed" | "unverified" | "inference";
export type Connection =
  | "policy-decision"
  | "financial-relationship"
  | "economic-benefit"
  | "plausible-unproven"
  | "no-connection";
export type Track = "policy" | "financial" | "oversight" | "diplomacy" | "analysis";
export type EdgeKind =
  | "money"
  | "money-proposed"
  | "family"
  | "role"
  | "ownership"
  | "business"
  | "policy"
  | "oversight"
  | "reported"
  | "inference"
  | "political";

export interface LinkStatus {
  status: "ok" | "blocked" | "dead" | "error";
  http: number | null;
  checked: string;
  detail?: string;
}

export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  published: string;
  type: string;
  access: "reviewed" | "located" | "blocked";
  accessed: string;
  repeats?: string;
  note?: string;
  link?: LinkStatus;
}

export interface Entity {
  id: string;
  name: string;
  type: string;
  lane: 1 | 2 | 3 | 4 | 5;
  country?: string;
  role: string;
  summary: string;
  degree: number;
}

export interface Citation {
  id: string;
  locator: string;
  quote?: string;
}

export interface Claim {
  id: string;
  title: string;
  statement: string;
  topics: string[];
  regions: string[];
  entities: string[];
  event_date: string;
  year: number;
  track: Track;
  classification: Classification;
  connection: Connection;
  confidence: "high" | "medium" | "low";
  limitations: string;
  responses?: string;
  sources: Citation[];
  related?: string[];
  origins: number;
  reviewed: boolean;
}

export interface Transaction {
  id: string;
  title: string;
  from?: string;
  to: string;
  category: string;
  amount_low: number;
  amount_high: number;
  currency: "USD" | "ILS";
  value_date: string;
  status: string;
  beneficiary?: string;
  personal_benefit: "proven" | "partial" | "unproven" | "none";
  benefit_note?: string;
  claims: string[];
  part_of?: string;
  dedupe_key: string;
  methodology?: string;
  hide_edge?: boolean;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  label: string;
  claims: string[];
  transaction?: string;
  amount_low?: number;
  amount_high?: number;
  currency?: "USD" | "ILS";
}

export interface Bundle {
  generated: string;
  stats: {
    entities: number;
    claims: number;
    sources: number;
    edges: number;
    transactions: number;
    reviewed_sources: number;
    by_classification: Record<string, number>;
  };
  entities: Entity[];
  claims: Claim[];
  sources: Source[];
  transactions: Transaction[];
  edges: Edge[];
}
