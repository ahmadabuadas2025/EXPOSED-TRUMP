import { useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../lib/data";
import { date, moneyRange } from "../lib/format";
import type { Claim } from "../lib/types";
import { CATEGORY } from "../lib/vocab";
import { AccessBadge, CLASS_RULE, ClassBadge, ConnBadge, LinkBadge } from "./Badges";

export function SourceList({ claim }: { claim: Claim }) {
  const { source } = useData();
  return (
    <ol className="space-y-2.5">
      {claim.sources.map((ref) => {
        const s = source.get(ref.id)!;
        return (
          <li key={ref.id} className="text-sm">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-mono text-[11px] text-muted">{s.id}</span>
              <a href={s.url} target="_blank" rel="noreferrer" className="link font-medium text-ink">
                {s.title}
              </a>
            </div>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink2">
              <span>
                {s.publisher} · {date(s.published)}
              </span>
              <AccessBadge source={s} />
              <LinkBadge link={s.link} />
            </div>
            <div className="mt-0.5 text-xs text-muted">
              Where: {ref.locator}
              {s.repeats && <> · restates {s.repeats} (not independent)</>}
            </div>
            {ref.quote && (
              <blockquote className="mt-1.5 border-l-2 border-ink2 pl-3 font-serif text-[15px] italic text-ink">
                “{ref.quote}”
              </blockquote>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function ClaimCard({ claim, open: initiallyOpen = false, compact = false }: { claim: Claim; open?: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const { entity, bundle } = useData();
  const txs = bundle.transactions.filter((t) => t.claims.includes(claim.id) && !t.part_of);
  return (
    <article id={claim.id} className={`card scroll-mt-24 border-l-[3px] p-4 ${CLASS_RULE[claim.classification]}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] text-muted">{claim.id}</span>
        <ClassBadge value={claim.classification} />
        <ConnBadge value={claim.connection} />
        <span className="ml-auto text-xs text-muted">{date(claim.event_date)}</span>
      </div>
      <h3 className={`mt-2 font-serif ${compact ? "text-base" : "text-lg"} font-semibold leading-snug text-ink`}>{claim.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink2">{claim.statement}</p>

      {txs.length > 0 && !compact && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {txs.map((t) => (
            <li key={t.id}>
              <Link to={`/money?tx=${t.id}`} className="chip" title={t.title}>
                <span className="font-semibold text-ink">{moneyRange(t.amount_low, t.amount_high, t.currency)}</span>
                <span>{CATEGORY[t.category]?.label}</span>
                <span className="text-muted">· {t.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <button
        className="mt-3 text-[13px] font-medium text-ink2 underline-offset-2 hover:underline"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? "▾ Hide" : "▸ Show"} evidence, limits & responses ({claim.sources.length} source{claim.sources.length > 1 ? "s" : ""})
      </button>
      {open && (
        <div className="mt-3 space-y-4 border-t border-line pt-3">
          <div>
            <div className="eyebrow mb-1">What this does not show</div>
            <p className="text-sm text-ink2">{claim.limitations}</p>
          </div>
          {claim.responses && (
            <div>
              <div className="eyebrow mb-1">Responses, denials & exculpatory evidence</div>
              <p className="text-sm text-ink2">{claim.responses}</p>
            </div>
          )}
          <div>
            <div className="eyebrow mb-1.5">
              Sources: {claim.origins} independent origin{claim.origins === 1 ? "" : "s"}
            </div>
            <SourceList claim={claim} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {claim.entities.map((id) => (
              <Link key={id} to={`/entity/${id}`} className="chip">
                {entity.get(id)?.name ?? id}
              </Link>
            ))}
            {claim.related?.map((id) => (
              <Link key={id} to={`/evidence?claim=${id}`} className="chip font-mono">
                ↗ {id}
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
