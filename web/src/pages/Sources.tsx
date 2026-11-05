import { useMemo, useState } from "react";
import { PageTitle } from "../components/Sticker";
import { Link, useSearchParams } from "react-router-dom";
import { AccessBadge, LinkBadge } from "../components/Badges";
import { Chips } from "../components/Chips";
import { useData } from "../lib/data";
import { matchesQuery } from "../lib/filters";
import { date } from "../lib/format";

export function Sources() {
  const { bundle } = useData();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("s") ?? "");
  const [types, setTypes] = useState<string[]>([]);
  const [access, setAccess] = useState<string[]>([]);
  const [linkIssues, setLinkIssues] = useState(false);
  const citedBy = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const c of bundle.claims) for (const s of c.sources) m.set(s.id, [...(m.get(s.id) ?? []), c.id]);
    return m;
  }, [bundle]);
  const list = bundle.sources.filter(
    (s) =>
      matchesQuery(`${s.id} ${s.title} ${s.publisher} ${s.repeats ?? ""}`, q) &&
      (!types.length || types.includes(s.type)) &&
      (!access.length || access.includes(s.access)) &&
      (!linkIssues || (s.link && s.link.status !== "ok")),
  );
  const checked = bundle.sources.find((s) => s.link)?.link?.checked;
  const issues = bundle.sources.filter((s) => s.link && s.link.status !== "ok").length;

  return (
    <div>
      <PageTitle sticker="sources">Sources</PageTitle>
      <p className="mt-1 max-w-3xl text-sm text-ink2">
        Every document the findings rest on. <strong>Read in full</strong> means we retrieved the document and quote it.{" "}
        <strong>Located</strong> means we found it and know its content from excerpts, so treat it as a lead to check. Sources that
        restate another outlet's reporting are marked, and they don't count as independent corroboration.
      </p>
      <p className="mt-2 text-xs text-muted">
        Link check {checked ? `run ${checked}` : "not yet run"}: {issues} of {bundle.sources.length} links refused or failed an
        automated request. Those are flagged for manual review. A refusal usually means bot protection, not a dead page.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-5">
        <div className="w-full max-w-xs">
          <label htmlFor="src-q" className="eyebrow mb-1.5 block">Search</label>
          <input id="src-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Chips label="Type" options={[...new Set(bundle.sources.map((s) => s.type))].sort()} value={types} onChange={setTypes} />
        <Chips label="Access" options={["reviewed", "located", "blocked"]} value={access} onChange={setAccess} />
        <button type="button" className="chip" aria-pressed={linkIssues} onClick={() => setLinkIssues(!linkIssues)}>⚠ link issues only</button>
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-surface text-xs text-muted">
            <tr><th className="p-2">ID</th><th className="p-2">Source</th><th className="p-2">Type</th><th className="p-2">Status</th><th className="p-2">Cited by</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((s) => (
              <tr key={s.id} className="align-top">
                <td className="p-2 font-mono text-xs text-muted">{s.id}</td>
                <td className="p-2">
                  <a href={s.url} target="_blank" rel="noreferrer" className="link text-ink">{s.title}</a>
                  <div className="text-xs text-ink2">{s.publisher} · {date(s.published)}</div>
                  {s.repeats && <div className="text-xs text-muted">Restates {s.repeats}</div>}
                  {s.note && <div className="text-xs text-muted">{s.note}</div>}
                </td>
                <td className="p-2 text-xs text-ink2">{s.type}</td>
                <td className="space-y-0.5 p-2"><div><AccessBadge source={s} /></div><LinkBadge link={s.link} /></td>
                <td className="p-2 font-mono text-xs">
                  {(citedBy.get(s.id) ?? []).map((c) => <Link key={c} className="link mr-1" to={`/evidence?claim=${c}`}>{c}</Link>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
