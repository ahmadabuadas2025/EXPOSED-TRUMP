import { useData } from "../lib/data";
import { PageTitle } from "../components/Sticker";

const FILES: [string, string][] = [
  ["bundle.json", "Everything the website shows, as one JSON document"],
  ["exports/claims.csv", "Every finding with its classification, connection level, limitations and responses"],
  ["exports/citations.csv", "One row per citation: finding, source, locator and verbatim quote where read"],
  ["exports/sources.csv", "Every source, with publisher, date, access status and what it restates"],
  ["exports/transactions.csv", "Every typed amount, with status, personal-benefit assessment and method notes"],
  ["exports/entities.csv", "People, organisations, governments and policies"],
  ["exports/relationships.csv", "Non-monetary links and the findings that support them"],
  ["exports/gephi-nodes.csv", "Nodes for Gephi or Cytoscape desktop"],
  ["exports/gephi-edges.csv", "Edges (Source, Target, Label, kind, evidence) for Gephi or Cytoscape"],
  ["exports/exposed_trump.sqlite", "All tables in one SQLite database"],
  ["exports/seed.sql", "INSERT statements for the PostgreSQL schema (migrations/001_schema.sql in the repository)"],
];

export function DataPage() {
  const { bundle } = useData();
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle sticker="data">Take the data</PageTitle>
      <p className="mt-2 text-ink2">
        The files below are the map itself, not a summary of it: the same findings, sources, amounts and links the site draws,
        each row carrying its citations. Built {bundle.generated}. Licensed CC BY 4.0. Use them with attribution, check our work,
        and tell us where it's wrong.
      </p>
      <ul className="mt-6 divide-y divide-line rounded-lg border border-line bg-surface">
        {FILES.map(([f, d]) => (
          <li key={f} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 p-3">
            <a className="link font-mono text-sm text-ink" href={`${import.meta.env.BASE_URL}data/${f}`} download>{f.replace("exports/", "")}</a>
            <span className="text-sm text-ink2">{d}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-ink2">
        To add or correct evidence, edit the YAML files in <code className="font-mono">data/</code> and run{" "}
        <code className="font-mono">python pipeline/build.py</code>. The build refuses data that breaks the evidence rules.
      </p>
    </div>
  );
}
