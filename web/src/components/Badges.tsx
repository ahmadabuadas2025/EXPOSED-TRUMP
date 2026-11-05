import type { Classification, Connection, LinkStatus, Source } from "../lib/types";
import { CLASSIFICATION, CONNECTION } from "../lib/vocab";

// Classification is an evidentiary state, shown with a glyph + label so it never rests on colour.
const CLASS_STYLE: Record<Classification, { glyph: string; cls: string }> = {
  verified: { glyph: "◆", cls: "border-ink bg-ink text-page" },
  corroborated: { glyph: "◈", cls: "border-ink text-ink" },
  reported: { glyph: "◇", cls: "border-line text-ink2" },
  disputed: { glyph: "⇄", cls: "border-dashed border-ink2 text-ink2" },
  unverified: { glyph: "?", cls: "border-dashed border-line text-muted" },
  inference: { glyph: "∴", cls: "border-dotted border-ink2 text-ink2 italic" },
};

/** Left rule on a finding: the stronger the evidence, the brighter the rule, so a list can be scanned by strength. */
export const CLASS_RULE: Record<Classification, string> = {
  verified: "border-l-ink",
  corroborated: "border-l-ink2",
  reported: "border-l-muted",
  disputed: "border-l-line",
  unverified: "border-l-line",
  inference: "border-l-line",
};

export function ClassBadge({ value }: { value: Classification }) {
  const s = CLASS_STYLE[value];
  return (
    <span
      title={CLASSIFICATION[value].desc}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold ${s.cls}`}
    >
      <span aria-hidden>{s.glyph}</span>
      {CLASSIFICATION[value].label}
    </span>
  );
}

export function ConnBadge({ value }: { value: Connection }) {
  const c = CONNECTION[value];
  return (
    <span title={c.desc} className="inline-flex items-center gap-1 text-xs text-ink2">
      <span className="inline-grid h-4 w-4 place-items-center rounded-full border border-line text-[10px]">{c.n}</span>
      {c.label}
    </span>
  );
}

export function AccessBadge({ source }: { source: Source }) {
  const map = {
    reviewed: { t: "read in full", c: "text-ink" },
    located: { t: "located, excerpt only", c: "text-muted" },
    blocked: { t: "retrieval blocked", c: "text-muted line-through" },
  } as const;
  const a = map[source.access];
  return <span className={`text-[11px] font-medium ${a.c}`}>{a.t}</span>;
}

export function LinkBadge({ link }: { link?: LinkStatus }) {
  if (!link) return null;
  if (link.status === "ok") return null;
  const t =
    link.status === "dead"
      ? "dead link"
      : link.status === "blocked"
        ? `refused automated check (${link.http}) — try in browser`
        : `check failed${link.http ? ` (${link.http})` : link.detail ? ` (${link.detail})` : ""}`;
  return (
    <span className="text-[11px] font-medium text-[color:var(--k-reported)]" title={`Checked ${link.checked}`}>
      ⚠ {t}
    </span>
  );
}
