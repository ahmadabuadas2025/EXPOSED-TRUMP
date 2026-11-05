// Labels and explanations for every controlled value. Single place the UI reads wording from,
// so the site, the methodology page and the legend can never disagree.
import type { Classification, Connection, EdgeKind, Track } from "./types";

export const CLASSIFICATION: Record<Classification, { label: string; desc: string }> = {
  verified: { label: "Verified", desc: "Supported directly by a primary document we retrieved and quote." },
  corroborated: { label: "Corroborated", desc: "Supported by at least two credible, independent sources." },
  reported: { label: "Reported", desc: "Published by a credible source but not independently confirmed here." },
  disputed: { label: "Disputed", desc: "Subject to material disagreement or conflicting evidence." },
  unverified: { label: "Unverified", desc: "Insufficient reliable evidence to establish the claim." },
  inference: { label: "Analytical inference", desc: "Our reasoned interpretation of documented facts; not itself established by evidence." },
};
export const CLASSIFICATION_ORDER: Classification[] = ["verified", "corroborated", "reported", "disputed", "unverified", "inference"];

export const CONNECTION: Record<Connection, { n: number; label: string; desc: string }> = {
  "policy-decision": { n: 1, label: "Policy decision", desc: "A documented policy decision." },
  "financial-relationship": { n: 2, label: "Financial relationship", desc: "A documented financial relationship." },
  "economic-benefit": { n: 3, label: "Economic benefit", desc: "A documented direct or indirect economic benefit." },
  "plausible-unproven": { n: 4, label: "Plausible, unproven", desc: "A plausible but unproven connection." },
  "no-connection": { n: 5, label: "No financial link found", desc: "No established financial connection." },
};
export const CONNECTION_ORDER: Connection[] = [
  "policy-decision",
  "financial-relationship",
  "economic-benefit",
  "plausible-unproven",
  "no-connection",
];

export const TRACK: Record<Track, string> = {
  policy: "Policy & presidential decisions",
  financial: "Business & financial events",
  oversight: "Investigations & oversight",
  diplomacy: "Diplomacy",
  analysis: "Analysis",
};

export const TOPIC: Record<string, string> = {
  "israel-policy": "US policy toward Israel",
  gaza: "Gaza",
  "gulf-business": "Gulf business",
  "israel-business": "Israeli business ties",
  "family-finance": "Family finances",
  "trump-finance": "Trump's finances",
  crypto: "Crypto",
  oversight: "Oversight",
  "political-money": "Political money",
};

// Edge styling: colour = kind (fixed categorical order from the dataviz palette),
// line style = evidentiary status, so identity never rests on colour alone.
export const EDGE: Record<EdgeKind, { label: string; desc: string; color: string; style: "solid" | "dashed" | "dotted" }> = {
  money: { label: "Money the record says moved", desc: "Paid, disclosed or reported transfer.", color: "--k-money", style: "solid" },
  "money-proposed": { label: "Committed, announced or estimated", desc: "Pledged, proposed or valued — not shown to be paid.", color: "--k-money", style: "dashed" },
  business: { label: "Business agreement", desc: "Licence or partnership; amount not on the edge.", color: "--k-business", style: "solid" },
  ownership: { label: "Ownership / control", desc: "Equity, sovereign ownership or controlling interest.", color: "--k-ownership", style: "solid" },
  role: { label: "Role or office", desc: "Founder, executive, envoy or official role.", color: "--k-ownership", style: "dashed" },
  policy: { label: "Policy action", desc: "A documented decision or proposal.", color: "--k-policy", style: "solid" },
  political: { label: "Political support", desc: "Campaign or super PAC relationship.", color: "--k-political", style: "solid" },
  oversight: { label: "Investigation / oversight", desc: "Congressional letter, inquiry or report.", color: "--k-oversight", style: "dotted" },
  reported: { label: "Reported, not confirmed", desc: "Asserted by credible reporting only.", color: "--k-reported", style: "dashed" },
  inference: { label: "Analytical inference", desc: "Our interpretation — not a documented link.", color: "--k-inference", style: "dotted" },
  family: { label: "Family tie", desc: "Context only; implies no benefit.", color: "--k-family", style: "solid" },
};
export const EDGE_ORDER: EdgeKind[] = [
  "money", "money-proposed", "business", "ownership", "role", "policy", "political", "oversight", "reported", "inference", "family",
];

export const ENTITY_TYPE: Record<string, string> = {
  person: "Person",
  company: "Company",
  fund: "Fund / investor",
  government: "Government",
  agency: "US agency",
  legislature: "Congress",
  nonprofit: "Nonprofit",
  pac: "Political committee",
  policy: "Policy decision",
};

export const LANES = ["Foreign states & funds", "Companies & vehicles", "Trump family & associates", "US government & policy", "Israel & outcomes"];

export const CATEGORY: Record<string, { label: string; desc: string }> = {
  revenue: { label: "Revenue / income", desc: "Money received by a business or person, before costs." },
  profit: { label: "Profit", desc: "Revenue minus costs." },
  "investment-capital": { label: "Investment capital", desc: "Money invested or committed to a fund or company — not income to its managers." },
  "asset-value": { label: "Asset value", desc: "Purchase price or book value of an asset." },
  "net-worth-estimate": { label: "Net worth estimate", desc: "A third party's estimate of total wealth." },
  "loan-principal": { label: "Loan principal", desc: "Amount borrowed." },
  "contract-value": { label: "Contract / deal value", desc: "Headline value of a contract, lease, sale or acquisition." },
  "government-expenditure": { label: "Government expenditure", desc: "Public money appropriated or committed." },
  "market-valuation": { label: "Market valuation", desc: "Current market value of a holding — unrealized." },
  "realized-gain": { label: "Realized gain", desc: "Profit locked in by a sale." },
  "unrealized-appreciation": { label: "Unrealized appreciation", desc: "Paper gain on a holding not yet sold." },
  "potential-benefit": { label: "Potential benefit", desc: "Estimated or possible benefit, not shown to have occurred." },
  "sale-proceeds": { label: "Sale proceeds", desc: "Cash received from a sale — not the same as profit." },
  "political-contribution": { label: "Political contribution", desc: "Money to a campaign or PAC — not personal income." },
  "charitable-donation": { label: "Charitable donation", desc: "Gift to a nonprofit." },
  "in-kind-gift": { label: "In-kind gift", desc: "A gift of property, valued by estimate." },
  "proposed-funding": { label: "Proposed funding", desc: "A proposal or threshold — no money moved." },
};

export const BENEFIT: Record<string, { label: string; desc: string }> = {
  proven: { label: "Personal benefit shown", desc: "An official filing or primary record shows the money reached Trump or a family member." },
  partial: { label: "Partly shown", desc: "Money reached a business they own or control; the personal share is not established." },
  unproven: { label: "Not shown", desc: "No evidence reviewed shows a personal benefit." },
  none: { label: "No personal benefit", desc: "The amount is not income to Trump or his family (e.g. donations, government spending)." },
};

/**
 * Types whose amounts can be meaningfully added together (within one currency). Estimates of
 * the same person's net worth in different years, point-in-time valuations, paper gains and
 * proposals are not additive, so the dashboard refuses to total them.
 */
export const ADDITIVE = new Set([
  "revenue", "profit", "investment-capital", "loan-principal", "contract-value", "government-expenditure",
  "realized-gain", "sale-proceeds", "political-contribution", "charitable-donation", "in-kind-gift", "asset-value",
]);
