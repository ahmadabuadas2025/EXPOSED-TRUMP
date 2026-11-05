import type { EdgeKind } from "../lib/types";
import { EDGE, EDGE_ORDER } from "../lib/vocab";

export function EdgeSwatch({ kind }: { kind: EdgeKind }) {
  const e = EDGE[kind];
  const dash = e.style === "dashed" ? "6 4" : e.style === "dotted" ? "1.5 3.5" : undefined;
  return (
    <svg width="28" height="10" aria-hidden className="shrink-0">
      <line x1="1" y1="5" x2="27" y2="5" stroke={`var(${e.color})`} strokeWidth={kind === "family" ? 1.5 : 2.5}
        strokeDasharray={dash} strokeLinecap="round" />
    </svg>
  );
}

/** The legend doubles as the edge-kind filter. */
export function Legend({
  counts,
  hidden,
  onToggle,
}: {
  counts: Record<string, number>;
  hidden: Set<EdgeKind>;
  onToggle: (k: EdgeKind) => void;
}) {
  return (
    <fieldset>
      <legend className="eyebrow mb-1">What each line means. Click one to hide or show it.</legend>
      <ul className="-mx-1.5 flex flex-wrap gap-x-1 gap-y-0.5">
        {EDGE_ORDER.filter((k) => counts[k]).map((k) => (
          <li key={k}>
            <button
              type="button"
              onClick={() => onToggle(k)}
              aria-pressed={!hidden.has(k)}
              title={EDGE[k].desc}
              className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-left text-[13px] hover:bg-raised ${hidden.has(k) ? "opacity-40" : ""}`}
            >
              <EdgeSwatch kind={k} />
              <span className="text-ink">{EDGE[k].label}</span>
              <span className="text-[11px] tabular-nums text-muted">{counts[k]}</span>
            </button>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
