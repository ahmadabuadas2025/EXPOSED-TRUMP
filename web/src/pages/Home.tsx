import { Link } from "react-router-dom";
import { ClaimCard } from "../components/ClaimCard";
import { MapExplorer } from "../components/MapExplorer";
import { Sticker, type StickerName } from "../components/Sticker";
import { useData } from "../lib/data";
import { CLASSIFICATION, CLASSIFICATION_ORDER } from "../lib/vocab";

// "Strongest" = best-documented findings of money or benefit, chosen editorially and listed
// here so the choice is reviewable in code. Each must be verified or corroborated, or carry a
// primary congressional document.
const FEATURED = ["C-020", "C-021", "C-025", "C-026", "C-041", "C-043", "C-040", "C-034"];
// What the evidence does not show is as important as what it does.
const NOT_FOUND = ["C-061", "C-009", "C-005"];

const EXPLORE: { to: string; sticker: StickerName; title: string; text: string }[] = [
  { to: "/map", sticker: "map", title: "Map", text: "See who connects to whom, and why." },
  { to: "/evidence", sticker: "evidence", title: "Evidence", text: "Search every finding and its sources." },
  { to: "/timeline", sticker: "timeline", title: "Timeline", text: "Line up decisions and deals by year." },
  { to: "/profiles", sticker: "profiles", title: "Profiles", text: "Look up any person or organisation." },
  { to: "/money", sticker: "money", title: "Money", text: "Compare amounts, one type at a time." },
  { to: "/sources", sticker: "sources", title: "Sources", text: "Check what we read and what we couldn't." },
  { to: "/method", sticker: "method", title: "Method", text: "Learn how findings get graded." },
  { to: "/data", sticker: "data", title: "Data", text: "Download it all and check our work." },
];

// Each line is a rule the site actually follows. See the Method page and the build validator.
const TICKER = [
  "Every line on the map cites a finding",
  "Every finding cites its sources",
  "Denials sit next to the claims they answer",
  "Being on this map is not an accusation",
  "Facts, estimates and inferences stay labelled",
  "Check the sources yourself",
];

function HeroCast() {
  return (
    <div className="relative order-first mx-auto aspect-[5/4] w-full max-w-[230px] sm:max-w-[400px] lg:order-none" aria-hidden>
      <div className="anim-pop absolute left-[26%] top-[4%] w-[52%]" style={{ animationDelay: "60ms" }}>
        <Sticker name="receipt" size={480} eager className="anim-bob h-auto w-full" />
      </div>
      <div className="anim-pop absolute bottom-0 left-0 w-[38%]" style={{ animationDelay: "220ms" }}>
        <Sticker name="lens" size={320} eager className="anim-sway h-auto w-full" />
      </div>
      <div className="anim-pop absolute bottom-[2%] right-0 w-[36%]" style={{ animationDelay: "380ms" }}>
        <Sticker name="coin" size={320} eager className="anim-hop h-auto w-full" />
      </div>
      <p className="anim-pop absolute left-0 top-[2%] -rotate-6 rounded-2xl rounded-br-none border-2 border-black bg-white px-3 py-1.5 text-xs font-bold text-black sm:text-sm" style={{ animationDelay: "520ms" }}>
        Show the receipts
      </p>
    </div>
  );
}

function Ticker() {
  const line = TICKER.map((t) => (
    <span key={t} className="flex items-center gap-6 whitespace-nowrap pr-6">
      {t}
      <span className="text-popPink" aria-hidden>★</span>
    </span>
  ));
  return (
    <div className="ticker -mx-4 overflow-hidden border-y-2 border-black bg-popLime py-2 text-sm font-bold text-black">
      <div className="ticker-track flex w-max">
        <div className="flex">{line}</div>
        <div className="flex" aria-hidden>{line}</div>
      </div>
    </div>
  );
}

export function Home() {
  const { bundle, claim } = useData();
  const s = bundle.stats;
  return (
    <div className="space-y-14">
      <div className="space-y-8">
        <section className="grid items-center gap-6 pt-2 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div>
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
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/evidence" className="btn-pop">See the receipts</Link>
              <Link to="/map" className="btn px-4 py-2">Open the full map</Link>
            </div>
          </div>
          <HeroCast />
        </section>
        <Ticker />
      </div>

      <section aria-labelledby="map-h">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-4">
          <h2 id="map-h" className="font-serif text-2xl font-semibold text-ink">The network</h2>
          <Link to="/map" className="link text-sm text-ink2">Open the full map</Link>
        </div>
        <MapExplorer height={640} wheelZoom={false} />
      </section>

      <section aria-labelledby="explore-h">
        <h2 id="explore-h" className="font-serif text-2xl font-semibold text-ink">Dig in your way</h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {EXPLORE.map((x) => (
            <li key={x.to}>
              <Link to={x.to} className="sticker-tile card flex h-full flex-col gap-2 p-4">
                <Sticker name={x.sticker} size={56} />
                <span className="font-semibold text-ink">{x.title}</span>
                <span className="text-sm leading-snug text-ink2">{x.text}</span>
              </Link>
            </li>
          ))}
        </ul>
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
