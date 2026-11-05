# Exposed-Trump

An evidence-based, interactive investigation of Donald Trump's and his family's financial interests, their Gulf and Israeli business ties, and US policy toward Israel.

The site maps documented relationships between Trump, family members, companies, sovereign funds, governments and policy decisions. **Every line on the map cites a finding, and every finding cites its sources**, with the exact location of the support, its limitations, and responses from the people involved. Findings are graded by how well they are established. Facts, allegations, estimates and analytical inferences are kept visibly separate.

The project tests a hypothesis. It does not assume one. Several findings contradict the idea of a financial motive behind specific Israel decisions, and those are shown just as prominently.

## What's in this release

| | |
|---|---|
| Findings (claims) | 48: 5 verified · 26 corroborated · 12 reported · 2 disputed · 3 labelled inferences |
| Sources | 88 (5 retrieved and read in full; the rest located and summarised from search excerpts, flagged as such) |
| Typed financial amounts | 36, across 17 non-additive categories |
| Map edges | 89 drawn (96 including hidden-by-default family ties), each backed by at least one finding |

### Features

- **Interactive relationship map** (Cytoscape.js). A "by role" lane layout (foreign states & funds → companies → family → US government & policy → Israel & outcomes) plus a clustered layout. Colour plus line style encode the evidence type: money moved, money promised, business, ownership, policy, oversight, reported-only and inference. The legend doubles as a filter. Filters cover year, evidence strength, topic and actor type. Clicking any node or line opens its profile or evidence, and a text-table view gives an accessible alternative.
- **Evidence explorer.** Search and filter by person or organisation, date, country or region, topic or policy area, transaction type, amount, source type, classification and what the finding establishes.
- **Timeline.** Policy decisions, business and financial events, and investigations sit in separate columns. They are aligned by year only, and no causal links are drawn.
- **Profiles** for all 54 entities. Each has a radial connection map, connections grouped by kind, financial figures, a timeline of findings, a section on contradictory evidence and unresolved questions, and its source documents.
- **Financial dashboard.** It charts one amount type and one currency at a time. It never adds unlike amounts, never totals non-additive types (net-worth estimates, valuations, proposals), and never counts components twice. Confirmed and estimated amounts are encoded differently. A separate list shows only the money an official filing shows reached the family.
- **Sources register**, with access status (read in full, located, or blocked) and automated link-check results.
- **Global search** across people, organisations, findings, transactions and sources (press `/`).
- **Open data downloads**: JSON, CSV, Gephi/Cytoscape node and edge files, SQLite and PostgreSQL seed SQL.
- Dark theme, responsive down to 360px, keyboard-navigable, and screen-reader text alternatives for the map.

## Quick start

Requirements: Python 3.11+ with `pyyaml` and `requests` (plus `pytest` for tests), and Node.js 18+.

```bash
pip install pyyaml requests pytest
python pipeline/build.py          # validate data/*.yaml and build the bundle + exports
cd web
npm install
npm run dev                       # http://localhost:5173
```

Production build: `cd web && npm run build`. The static site is written to `web/dist/`.

## Repository layout

```
data/                 Source of truth: hand-curated YAML
  sources.yaml        every source, with access status (reviewed / located / blocked)
  entities.yaml       people, organisations, governments, policies
  claims.yaml         findings: statement, classification, connection level, limitations, responses, citations
  transactions.yaml   typed amounts with ranges, status, personal-benefit assessment, dedupe keys
  relationships.yaml  non-monetary edges, each citing findings
  link_status.json    output of the link checker
pipeline/
  build.py            validator + builder (bundle.json, CSV, SQLite, seed.sql, evidence register)
  linkcheck.py        checks every source URL
  tests/              pytest suite: each editorial rule must reject the case it guards against
migrations/
  001_schema.sql      PostgreSQL schema (full-text search index, non-additive totals view)
docs/
  EVIDENCE_REGISTER.md  generated, human-readable register of every finding and citation
  METHODOLOGY.md        research method and editorial rules
  REFERENCE_ANALYSIS.md Phase 1 technical assessment of the reference site and environment
  DEPLOYMENT.md         hosting and database instructions
web/                  React + TypeScript + Tailwind + Cytoscape front end (Vite)
```

## Adding or correcting evidence

1. Add the source to `data/sources.yaml`. Set `access: reviewed` only if you read the document. Add `repeats:` if it only restates another outlet's reporting.
2. Add or edit the finding in `data/claims.yaml`, with a `locator` for every citation. Add a verbatim `quote` only from a reviewed source.
3. Add amounts to `transactions.yaml` with the correct `category` and `status`, and a `part_of` link if one amount is inside another.
4. Run `python pipeline/build.py`. The build **fails** on any rule violation, including:
   - a finding without sources, or a citation without a locator
   - "verified" without a quoted passage from a reviewed source
   - "corroborated" without two independent, accessible origins (restatements count once)
   - a quote attributed to an unreviewed source
   - duplicate transactions (same `dedupe_key`), or a component larger than its parent or in a different currency
   - an edge without supporting findings, or an inference edge not citing an inference finding
   - unknown entities, sources or claims; malformed dates or amounts
5. Optionally run `python pipeline/linkcheck.py` to refresh link statuses.

## Tests

```bash
python -m pytest pipeline/tests     # 19 tests: data validity + every validation rule + arithmetic checks
cd web && npm test                  # 15 tests: search, filters, no double-counting, formatting
cd web && npm run typecheck
```

## Deployment

The site is fully static, so any static host works (GitHub Pages, Netlify, Cloudflare Pages, S3). It uses hash routing and relative paths, so it needs no rewrite rules. A GitHub Actions workflow (`.github/workflows/ci.yml`) validates the data, runs both test suites and builds the site, and it deploys to GitHub Pages on pushes to `main`. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), which also covers loading the evidence into PostgreSQL.

## Known limitations

- **Most sources are "located", not read in full.** Only 5 of 88 documents were retrieved and quoted (the two Federal Register proclamations, the CRS aid report, the Senate Finance letter on Affinity fees, and CREW's disclosure analysis). The rest are summarised from search excerpts and labelled that way on the site. They are the first thing a reviewer should check.
- **Paywalled investigations** (the NYT on the PIF investment, the WSJ on the World Liberty stake, and CNN on Phoenix) are known only through other outlets' summaries, and are marked as restating them.
- **OGE financial disclosures and FEC filings weren't retrieved directly.** Figures attributed to them come from press accounts.
- **Eleven source URLs refused automated link checks** (HTTP 403/406 or timeouts). They are flagged for manual review, not declared dead.
- **The register is a starting set, not a complete census.** Research was bounded (see Method → Unresolved questions). Absence of a finding here is not evidence of absence.
- **The data is current to 22 October 2026.** Several matters, including congressional inquiries, the EA deal and the Board of Peace charter, were still developing.
- No backend. The PostgreSQL schema and seed are provided, but the site reads a static JSON bundle built from the YAML. That is deliberate for transparency and zero-cost hosting.

## Licence

Code: MIT. Data (`data/`, generated exports): CC BY 4.0. Quoted source passages remain the property of their publishers and are reproduced for commentary and verification.

This project is independent. It is not affiliated with any campaign or government, or with whofundedgenocide.com, whose public map informed the interface concepts (see `docs/REFERENCE_ANALYSIS.md`).
