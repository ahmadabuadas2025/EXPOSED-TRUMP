# Phase 1 — Technical assessment

Date: 22 October 2026.

## 1. Tools actually available

| Tool | Status | Used for |
|---|---|---|
| `browser-use` skill | Skill instructions loaded. Its MCP server **failed to connect** in this session. The skill itself advises plain HTTP fetches for public pages. | Followed its guidance: public pages fetched directly |
| `reverse-engineer-anything` (REA) skill | Instructions loaded. **REA MCP tools weren't registered** in this session. The skill's scope (shipped binaries and packages) is broader than needed for a public website. | Not used; the reference site was observed at runtime with Playwright instead |
| Playwright MCP | Available | Runtime observation of the reference map: DOM, scripts, data file shape, screenshots |
| Web search + web fetch | Available | Source discovery; full-text retrieval of 5 documents |
| Local toolchain | Node 25.9, npm 11.7, Python 3.13 (pyyaml, requests, pytest, pypdf). **No PostgreSQL server installed.** | Build, tests, PDF text extraction |

The project directory was empty, so there was no existing application to reuse. It sat inside a home-directory git repository, so it was given its own repository.

## 2. Reference site: whofundedgenocide.com/map/

Observed only through its public pages, on 22 October 2026. No private code, backend or credentials were accessed.

**Architecture (observed).** A static page with three plain JavaScript files: `board-chain.js`, `map-data.js` (~23 KB, `window.MCMAP = {...}`) and `chain.js` (~131 KB, the rendering engine). No framework globals were detected. The map is drawn on a single `<canvas>`, and the engine's header comment says the layout is solved at build time and baked, with nothing simulated on load. It uses `matchMedia` for responsive behaviour and few ARIA attributes (7 occurrences in the engine).

**Information design (observed).**
- Six "boards" in tabs (e.g. "Israel's own money", "US political money"), each with entity and link counts.
- Each board runs as a flow of columns: where money starts → intermediaries → recipients → what it bought → where it lands.
- Line semantics: solid for money a record says moved; dashed or dotted for orders, approved ceilings, and "named together, no money". Thickness encodes amount within one board and one currency, and currencies are never converted.
- Filters by link type and entity type, with counts. Search across boards (`/` shortcut). Zoom, fit and reset controls, and keyboard switching between boards (1–6).
- Clicking an entity or line opens a panel with the source, the item or page, a checksum, the original on the issuer's server, and an archived copy.
- Data downloads: entities, links and sources CSVs, a combined JSON file, and Gephi node/edge files, under CC BY 4.0.

**Concepts adopted, implemented independently:** a role-based column layout, line style encoding evidentiary status, a citation behind every line, never combining currencies, search with a `/` shortcut, and open downloadable data in Gephi-compatible form.

**Deliberately different:** an original visual identity (editorial serif and mono, neutral paper/charcoal, gold for money) with light and dark themes. Cytoscape.js instead of a custom canvas engine. Separate evidence-classification and connection-level scales (the reference site has link types only). Explicit labelled inferences, a financial-type system that prevents adding unlike amounts, a timeline that separates political and financial tracks, per-entity profiles with contradictory-evidence sections, and a text-table alternative to the canvas map.

No code, data, assets or branding were copied.

## 3. Architecture decision

The brief suggested Next.js, PostgreSQL and Python ingestion. What was built:

- **Data:** YAML files as the reviewable source of truth, so every change to the evidence is a readable diff.
- **Pipeline:** Python (`pipeline/build.py`). It enforces the editorial rules as hard validation errors, then emits a JSON bundle, CSVs, Gephi files, SQLite, PostgreSQL seed SQL and a Markdown evidence register.
- **Database:** a PostgreSQL schema is provided (`migrations/001_schema.sql`), with a full-text index and a view that refuses to total non-additive amounts. It isn't required at runtime, because no PostgreSQL server was available, and a static bundle makes the site free to host and easy to audit.
- **Front end:** React 18 + TypeScript + Tailwind + Cytoscape.js on Vite, rather than Next.js. There's no server-rendered content to justify a Node server, and a hash-routed static build deploys anywhere.
