import { ClassBadge, ConnBadge } from "../components/Badges";
import { EdgeSwatch } from "../components/Legend";
import { CATEGORY, CLASSIFICATION, CLASSIFICATION_ORDER, CONNECTION, CONNECTION_ORDER, EDGE, EDGE_ORDER } from "../lib/vocab";

// Open questions this research could not answer. Kept here, next to the method, so readers see
// the edges of what is known.
const UNRESOLVED = [
  "How much of Affinity Partners' fee and carried-interest income reaches Jared Kushner personally? Not public.",
  "What is Affinity's equity share in the $55 billion EA take-private, and has the deal closed?",
  "Did the State Department accept Sheldon Adelson's 2018 offer to fund part of the Jerusalem embassy?",
  "What are the licence-fee terms in the Dar Global and Qatari Diar agreements? Only annual totals appear in press accounts of Trump's disclosures.",
  "How much do LIV Golf events pay Trump-owned courses? These payments aren't itemized in his disclosure.",
  "How much does World Liberty Financial earn on the reserves behind USD1, including the float from MGX's $2 billion Binance deal?",
  "What are the exact terms of the 747-8 MOU on post-presidency use, and how much did the refit cost?",
  "Where would Board of Peace membership fees go under the final charter, and has any state paid?",
  "Did the Brookfield lease on 666 Fifth Avenue involve Qatar Investment Authority money? Brookfield denies it, and the committee did not get the records.",
  "What did the CNN Phoenix investigation, the WSJ World Liberty report and the NYT PIF report say beyond the summaries we could access?",
];

export function Method() {
  return (
    <article className="mx-auto max-w-3xl space-y-10">
      <header>
        <h1 className="font-serif text-4xl font-semibold text-ink">Methodology</h1>
        <p className="mt-3 text-lg text-ink2">
          This project tests a question: did Trump's position, decisions and policies on Israel and the Gulf benefit him, his family
          or their businesses? It doesn't assume the answer. Findings are allowed to support, qualify or contradict that question,
          and several here contradict it.
        </p>
      </header>

      <section className="prose-body">
        <h2 className="mb-3 font-serif text-2xl font-semibold text-ink">1. What counts as a finding</h2>
        <p>
          A finding (claim) is one checkable statement with a date, the people and organisations involved, at least one source, and
          the specific place in each source where support sits. Each finding records its limitations and any responses, denials or
          exculpatory evidence. Contested figures are attributed to whoever published them. For example, we write "according to
          Senate Finance Chairman Wyden's letter" rather than presenting the number as established fact.
        </p>
        <p>
          The data lives in plain YAML files in the repository. A build step validates every rule below and fails if any is broken,
          so the site can't publish a finding without a source, a line without evidence, or a "verified" label without a quoted
          document.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-2xl font-semibold text-ink">2. Evidence classification</h2>
        <ul className="space-y-3">
          {CLASSIFICATION_ORDER.map((c) => (
            <li key={c} className="flex gap-3"><span className="w-44 shrink-0"><ClassBadge value={c} /></span><span className="text-sm text-ink2">{CLASSIFICATION[c].desc}</span></li>
          ))}
        </ul>
        <div className="prose-body mt-4">
          <p>
            <strong>Machine-checked rules.</strong> <em>Verified</em> requires a retrieved primary document and a verbatim quote of the
            supporting passage. <em>Corroborated</em> requires at least two independent origins. Outlets that restate another
            outlet's report (for example, several sites summarising one New York Times story) count as one origin, and a source we
            couldn't retrieve doesn't count. <em>Analytical inference</em> must be labelled as such in its title, and it's drawn as a
            dotted line on the map.
          </p>
          <p>The classification doesn't replace the explanation. Every card shows the underlying evidence and its limits.</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-2xl font-semibold text-ink">3. What a finding establishes</h2>
        <p className="mb-3 text-sm text-ink2">Separately from how well a statement is established, each finding states what it shows about money and policy:</p>
        <ul className="space-y-2">
          {CONNECTION_ORDER.map((c) => <li key={c} className="flex gap-3"><span className="w-56 shrink-0"><ConnBadge value={c} /></span><span className="text-sm text-ink2">{CONNECTION[c].desc}</span></li>)}
        </ul>
        <div className="prose-body mt-4">
          <p>
            We don't treat support for Israel, a policy agreement, a meeting with a foreign official, or a political donation as proof
            of a financial motive. A business relationship isn't evidence of a crime, and two events in the same year aren't evidence
            that one caused the other.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-2xl font-semibold text-ink">4. Money: types, ranges and double-counting</h2>
        <div className="prose-body">
          <p>
            Every amount is typed. A commitment to a fund isn't money received, a valuation isn't income, and sale proceeds aren't
            profit. The dashboard only ever adds amounts of the same type and currency, and it won't add types that can't be summed at all, such as net-worth estimates from different years, point-in-time valuations or proposals. Shekels and dollars are never converted,
            because none of the sources supply an exchange rate.
          </p>
          <p>
            Each real-world transaction has one deduplication key, however many outlets report it. Amounts that are parts of another
            (for example, the $87M of Saudi fees inside the $157M of foreign fees) are linked to their parent and excluded from
            totals. Where only an upper bound is published ("as much as $157M"), the range starts at zero. Calculations are written
            out on the amount itself. For example, the Phoenix figures reconcile: NIS 1.05B in proceeds plus NIS 3.3B remaining minus
            NIS 0.94B invested gives NIS 3.41B, against a reported NIS 3.4B gain.
          </p>
          <p>
            Each amount also records whether evidence shows it reached Trump or a family member personally: <em>shown</em>,{" "}
            <em>partly shown</em> (it reached a business they own), <em>not shown</em>, or <em>no personal benefit</em>. Nothing is
            described as money Trump earned unless his own disclosure, as reported, shows it.
          </p>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-ink">All amount types</summary>
          <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[180px_1fr]">
            {Object.entries(CATEGORY).map(([k, v]) => [<dt key={k} className="font-medium text-ink">{v.label}</dt>, <dd key={k + "d"} className="text-ink2">{v.desc}</dd>])}
          </dl>
        </details>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-2xl font-semibold text-ink">5. Reading the map</h2>
        <ul className="space-y-1.5">
          {EDGE_ORDER.map((k) => <li key={k} className="flex items-center gap-3 text-sm"><EdgeSwatch kind={k} /><span className="w-56 text-ink">{EDGE[k].label}</span><span className="text-ink2">{EDGE[k].desc}</span></li>)}
        </ul>
        <p className="mt-3 text-sm text-ink2">
          Colour and line style both carry meaning, so the map can be read without relying on colour. Every map is also available
          as a text table.
        </p>
      </section>

      <section className="prose-body">
        <h2 className="mb-3 font-serif text-2xl font-semibold text-ink">6. Sources and their limits</h2>
        <p>
          We prioritised primary documents: Federal Register proclamations, Congressional Research Service reports, congressional
          committee letters and company releases. Where a primary document wasn't retrievable, we used credible reporting and say so
          on each source. Only a handful of documents were read in full for this release. The rest are marked as located, and those
          are the first thing a reviewer should check. Paywalled originals (the New York Times, Wall Street Journal and CNN
          investigations) were known only through other outlets' summaries, and those summaries are marked as restating the
          original.
        </p>
        <p>
          A link checker records each URL's status. Links that refuse automated requests are flagged for manual review rather than
          declared dead.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-2xl font-semibold text-ink">7. Unresolved questions</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink2">
          {UNRESOLVED.map((u) => <li key={u}>{u}</li>)}
        </ul>
      </section>

      <section className="prose-body">
        <h2 className="mb-3 font-serif text-2xl font-semibold text-ink">8. Design reference</h2>
        <p>
          The interface borrows ideas from the public map at whofundedgenocide.com/map: money flowing across columns of actors, line
          styles that separate money moved from money promised, a citation behind every line, and downloadable data. We studied it
          only through its public pages. No code, data, assets or branding were copied, and this project isn't affiliated with it.
        </p>
      </section>
    </article>
  );
}
