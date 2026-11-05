import { Link } from "react-router-dom";
import { useData } from "../lib/data";
import { moneyRange } from "../lib/format";
import type { Edge } from "../lib/types";
import { BENEFIT, CATEGORY, EDGE, ENTITY_TYPE } from "../lib/vocab";
import { ClaimCard } from "./ClaimCard";
import { EdgeSwatch } from "./Legend";
import type { Selection } from "./NetworkMap";

export function TxBox({ id }: { id: string }) {
  const { tx } = useData();
  const t = tx.get(id)!;
  return (
    <div className="rounded-md border border-line bg-raised p-3">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-serif text-2xl font-semibold text-ink">{moneyRange(t.amount_low, t.amount_high, t.currency)}</span>
        <span className="font-mono text-[11px] uppercase text-muted">{t.status}</span>
      </div>
      <div className="mt-1 text-sm text-ink">{CATEGORY[t.category]?.label}</div>
      <div className="text-xs text-ink2">{CATEGORY[t.category]?.desc}</div>
      <div className="mt-2 text-xs">
        <span className="font-semibold text-ink">{BENEFIT[t.personal_benefit].label}.</span>{" "}
        <span className="text-ink2">{t.benefit_note ?? BENEFIT[t.personal_benefit].desc}</span>
      </div>
      {t.methodology && <div className="mt-2 font-mono text-[11px] text-muted">Method: {t.methodology}</div>}
    </div>
  );
}

function EdgeDetail({ edge }: { edge: Edge }) {
  const { entity, claim } = useData();
  const s = entity.get(edge.source)!;
  const t = entity.get(edge.target)!;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <EdgeSwatch kind={edge.kind} />
        <span className="eyebrow">{EDGE[edge.kind].label}</span>
      </div>
      <h2 className="font-serif text-xl font-semibold leading-snug text-ink">
        <Link to={`/entity/${s.id}`} className="link">{s.name}</Link> → <Link to={`/entity/${t.id}`} className="link">{t.name}</Link>
      </h2>
      <p className="text-sm text-ink2">{edge.label}</p>
      {edge.transaction && <TxBox id={edge.transaction} />}
      <p className="rounded bg-raised px-2.5 py-2 text-xs text-ink2">
        A line records that the evidence connects these two. It does not by itself show that either caused the other to
        benefit. {edge.kind === "inference" && "This line is our analytical inference, not a documented link."}
      </p>
      <div className="eyebrow">Evidence for this line</div>
      <div className="space-y-2">
        {edge.claims.map((id) => (
          <ClaimCard key={id} claim={claim.get(id)!} compact />
        ))}
      </div>
    </div>
  );
}

function EntityDetail({ id, edges }: { id: string; edges: Edge[] }) {
  const { entity, bundle } = useData();
  const e = entity.get(id)!;
  const mine = edges.filter((x) => x.source === id || x.target === id);
  const nClaims = bundle.claims.filter((c) => c.entities.includes(id)).length;
  return (
    <div className="space-y-3">
      <div className="eyebrow">{ENTITY_TYPE[e.type]}{e.country ? ` · ${e.country}` : ""}</div>
      <h2 className="font-serif text-2xl font-semibold leading-tight text-ink">{e.name}</h2>
      <p className="text-sm text-ink">{e.role}</p>
      <p className="text-sm text-ink2">{e.summary}</p>
      <Link to={`/entity/${id}`} className="btn">Full profile ({nClaims} findings)</Link>
      <div className="eyebrow pt-2">Connections in view ({mine.length})</div>
      <ul className="divide-y divide-line">
        {mine.map((x) => {
          const other = entity.get(x.source === id ? x.target : x.source)!;
          return (
            <li key={x.id} className="flex items-start gap-2 py-1.5 text-sm">
              <span className="mt-1.5"><EdgeSwatch kind={x.kind} /></span>
              <span>
                <span className="text-muted">{x.source === id ? "→" : "←"}</span>{" "}
                <Link to={`/entity/${other.id}`} className="link text-ink">{other.name}</Link>
                <span className="block text-xs text-ink2">{x.label}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DetailPanel({ selection, edges, onClose }: { selection: Selection; edges: Edge[]; onClose: () => void }) {
  const { bundle } = useData();
  if (!selection)
    return (
      <div className="text-sm text-ink2">
        <div className="eyebrow mb-2">How to use the map</div>
        <p className="mb-2">Click a person, company or policy to see its connections. Click a line to see the evidence behind it.</p>
        <p className="mb-2">Each column is a kind of actor. Money mostly flows from the foreign states and funds on the left toward the businesses and people in the middle.</p>
        <p>Solid gold lines are money the record says moved. Dashed gold lines are commitments, announcements or estimates, not proof of payment.</p>
      </div>
    );
  const edge = selection.kind === "edge" ? bundle.edges.find((e) => e.id === selection.id) : undefined;
  return (
    <div>
      <button type="button" onClick={onClose} className="mb-2 text-xs text-muted hover:text-ink">✕ Close</button>
      {edge ? <EdgeDetail edge={edge} /> : <EntityDetail id={selection.id} edges={edges} />}
    </div>
  );
}
