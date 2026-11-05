import { Link } from "react-router-dom";
import { ClaimCard } from "../components/ClaimCard";
import { MapExplorer } from "../components/MapExplorer";
import { useData } from "../lib/data";
import { CLASSIFICATION, CLASSIFICATION_ORDER } from "../lib/vocab";

// "Strongest" = best-documented findings of money or benefit, chosen editorially and listed
// here so the choice is reviewable in code. Each must be verified or corroborated, or carry a
// primary congressional document.
const FEATURED = ["C-020", "C-021", "C-025", "C-026", "C-041", "C-043", "C-040", "C-034"];
// What the evidence does not show is as important as what it does.
const NOT_FOUND = ["C-061", "C-009", "C-005"];

export function Home() {
  const { bundle, claim } = useData();
  const s = bundle.stats;
  return (
    <div className="space-y-14">
      <section className="pt-2">
        <h1 className="max-w-4xl font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl">
          Did US policy on Israel and the Gulf pay off for Donald Trump and his family?
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink2">
          This map traces documented money, business ties and presidential decisions. It doesn't assume wrongdoing. Each finding is
          labelled by how well it's established and records what the evidence does not show.
        </p>
        <p className="mt-3 max-w-3xl text-sm text-muted">
          {s.claims} findings from {s.sources} sources. We read {s.reviewed_sources} of those documents in full; the rest are summarised
          from excerpts and flagged that way.
        </p>
      </section>

      <section aria-labelledby="map-h">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-4">
          <h2 id="map-h" className="font-serif text-2xl font-semibold text-ink">The network</h2>
          <Link to="/map" className="link text-sm text-ink2">Open the full map</Link>
        </div>
        <MapExplorer height={640} wheelZoom={false} />
      </section>

      <section aria-labelledby="strong-h">
        <h2 id="strong-h" className="font-serif text-2xl font-semibold text-ink">The strongest documented findings</h2>
        <p className="mt-1 max-w-3xl text-sm text-ink2">
          These are the money and business ties with the best documentation. A documented relationship isn't proof that a policy was
          changed to produce it, and each card says what remains unproven.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {FEATURED.map((id) => <ClaimCard key={id} claim={claim.get(id)!} />)}
        </div>
        <Link to="/evidence" className="btn mt-4">See all {s.claims} findings</Link>
      </section>

      <section aria-labelledby="nf-h">
        <h2 id="nf-h" className="font-serif text-2xl font-semibold text-ink">What the evidence does not show</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {NOT_FOUND.map((id) => <ClaimCard key={id} claim={claim.get(id)!} compact />)}
        </div>
      </section>

      <section aria-labelledby="method-h" className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 id="method-h" className="font-serif text-2xl font-semibold text-ink">How findings are graded</h2>
          <p className="mt-2 text-sm text-ink2">
            Facts, allegations, estimates and our own inferences are kept apart. A finding is <strong>verified</strong> only if we
            retrieved a primary document and quote the passage. It's <strong>corroborated</strong> only if at least two independent
            outlets support it, and outlets that restate the same original report count once.{" "}
            <Link to="/method" className="link">Read the full methodology</Link>
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CLASSIFICATION_ORDER.map((c) => (
            <li key={c} className="card p-3">
              <div className="font-mono text-2xl text-ink">{s.by_classification[c] ?? 0}</div>
              <div className="text-sm font-medium text-ink">{CLASSIFICATION[c].label}</div>
              <div className="text-xs text-ink2">{CLASSIFICATION[c].desc}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
