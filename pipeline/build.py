"""Validate the evidence data in data/*.yaml and build every derived artefact.

    python pipeline/build.py            # validate + build
    python pipeline/build.py --check    # validate only (CI)

Outputs
    web/public/data/bundle.json          the website's single data file
    data/exports/*.csv                   flat tables, plus gephi-nodes/edges.csv
    data/exports/exposed_trump.sqlite    the same tables in SQLite
    data/exports/seed.sql                INSERTs for the PostgreSQL schema in migrations/
    docs/EVIDENCE_REGISTER.md            human-readable register

Validation is strict: any error stops the build, so the site can never ship a claim
without a source, an edge without evidence, or a "verified" label without a reviewed document.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import re
import shutil
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
EXPORTS = DATA / "exports"
BUNDLE = ROOT / "web" / "public" / "data" / "bundle.json"
REGISTER = ROOT / "docs" / "EVIDENCE_REGISTER.md"
LINK_STATUS = DATA / "link_status.json"

ENTITY_TYPES = {"person", "company", "fund", "government", "agency", "legislature", "nonprofit", "pac", "policy"}
SOURCE_TYPES = {"government", "congressional", "company", "court", "ngo", "journalism", "wire", "fact-check", "reference"}
ACCESS = {"reviewed", "located", "blocked"}
CLASSIFICATIONS = ["verified", "corroborated", "reported", "disputed", "unverified", "inference"]
CONNECTIONS = ["policy-decision", "financial-relationship", "economic-benefit", "plausible-unproven", "no-connection"]
CONFIDENCE = {"high", "medium", "low"}
TRACKS = {"policy", "financial", "oversight", "diplomacy", "analysis"}
REL_KINDS = {"family", "role", "ownership", "business", "policy", "oversight", "reported", "inference", "political"}
TX_CATEGORIES = {
    "revenue", "profit", "investment-capital", "asset-value", "net-worth-estimate", "loan-principal",
    "contract-value", "government-expenditure", "market-valuation", "realized-gain",
    "unrealized-appreciation", "potential-benefit", "sale-proceeds", "political-contribution",
    "charitable-donation", "in-kind-gift", "proposed-funding",
}
TX_STATUS = {"paid", "committed", "disclosed", "reported", "estimated", "proposed", "announced"}
PERSONAL_BENEFIT = {"proven", "partial", "unproven", "none"}
CURRENCIES = {"USD", "ILS"}
# A date may be YYYY, YYYY-MM, YYYY-MM-DD, or a year range like 2011–2013.
DATE_RE = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?([–-]\d{4})?$")


class ValidationError(Exception):
    pass


def load(name: str) -> list[dict]:
    with open(DATA / f"{name}.yaml", encoding="utf-8") as f:
        rows = yaml.safe_load(f) or []
    # YAML parses bare dates into date objects; normalise to strings.
    for r in rows:
        for k, v in list(r.items()):
            if isinstance(v, (dt.date, dt.datetime)):
                r[k] = v.isoformat()
            elif isinstance(v, int) and k in {"published", "event_date", "value_date", "accessed"}:
                r[k] = str(v)
    return rows


def load_all() -> dict[str, list[dict]]:
    return {n: load(n) for n in ("sources", "entities", "claims", "transactions", "relationships")}


def origin(src: dict) -> str:
    """Sources that restate the same original reporting share one origin."""
    return (src.get("repeats") or src["publisher"]).split(" (")[0].strip().lower()


def validate(d: dict[str, list[dict]]) -> list[str]:
    errors: list[str] = []
    err = errors.append

    def index(rows, kind):
        out = {}
        for r in rows:
            rid = r.get("id")
            if not rid:
                err(f"{kind}: row without id: {r}")
            elif rid in out:
                err(f"{kind}: duplicate id {rid}")
            out[rid] = r
        return out

    S, E, C = index(d["sources"], "source"), index(d["entities"], "entity"), index(d["claims"], "claim")
    T, R = index(d["transactions"], "transaction"), index(d["relationships"], "relationship")

    for s in d["sources"]:
        for f in ("title", "publisher", "url", "published", "type", "access", "accessed"):
            if not s.get(f):
                err(f"{s['id']}: missing {f}")
        if s.get("type") not in SOURCE_TYPES:
            err(f"{s['id']}: bad type {s.get('type')}")
        if s.get("access") not in ACCESS:
            err(f"{s['id']}: bad access {s.get('access')}")
        if not str(s.get("url", "")).startswith("https://"):
            err(f"{s['id']}: url must be https")
    urls = defaultdict(list)
    for s in d["sources"]:
        urls[s.get("url")].append(s["id"])
    for u, ids in urls.items():
        if len(ids) > 1:
            err(f"duplicate source url {u}: {ids}")

    for e in d["entities"]:
        if e.get("type") not in ENTITY_TYPES:
            err(f"{e['id']}: bad entity type {e.get('type')}")
        if e.get("lane") not in {1, 2, 3, 4, 5}:
            err(f"{e['id']}: lane must be 1-5")
        for f in ("name", "role", "summary"):
            if not e.get(f):
                err(f"{e['id']}: missing {f}")

    for c in d["claims"]:
        cid = c["id"]
        for f in ("title", "statement", "event_date", "limitations"):
            if not c.get(f):
                err(f"{cid}: missing {f}")
        if not DATE_RE.match(str(c.get("event_date", ""))):
            err(f"{cid}: bad event_date {c.get('event_date')}")
        if c.get("classification") not in CLASSIFICATIONS:
            err(f"{cid}: bad classification {c.get('classification')}")
        if c.get("connection") not in CONNECTIONS:
            err(f"{cid}: bad connection {c.get('connection')}")
        if c.get("confidence") not in CONFIDENCE:
            err(f"{cid}: bad confidence")
        if c.get("track") not in TRACKS:
            err(f"{cid}: bad track {c.get('track')}")
        for eid in c.get("entities", []):
            if eid not in E:
                err(f"{cid}: unknown entity {eid}")
        if not c.get("entities"):
            err(f"{cid}: no entities")
        for rel in c.get("related", []):
            if rel not in C:
                err(f"{cid}: unknown related claim {rel}")
        refs = c.get("sources") or []
        if not refs:
            err(f"{cid}: no sources")
        cited = []
        for ref in refs:
            src = S.get(ref.get("id"))
            if not src:
                err(f"{cid}: unknown source {ref.get('id')}")
                continue
            cited.append(src)
            if not ref.get("locator"):
                err(f"{cid}: source {src['id']} needs a locator")
            if ref.get("quote") and src["access"] != "reviewed":
                err(f"{cid}: quote attributed to {src['id']} which was not reviewed")
        usable = [s for s in cited if s["access"] != "blocked"]
        cls = c.get("classification")
        if cls == "verified" and not any(s["access"] == "reviewed" and r.get("quote")
                                         for s, r in zip(cited, refs)):
            err(f"{cid}: 'verified' requires a quoted passage from a reviewed source")
        if cls == "corroborated" and len({origin(s) for s in usable}) < 2:
            err(f"{cid}: 'corroborated' requires two independent, accessible origins")
        if cls == "inference" and "Inference" not in c.get("title", ""):
            err(f"{cid}: inference claims must say so in the title")

    keys = defaultdict(list)
    for t in d["transactions"]:
        tid = t["id"]
        if t.get("category") not in TX_CATEGORIES:
            err(f"{tid}: bad category {t.get('category')}")
        if t.get("status") not in TX_STATUS:
            err(f"{tid}: bad status {t.get('status')}")
        if t.get("currency") not in CURRENCIES:
            err(f"{tid}: bad currency {t.get('currency')}")
        if t.get("personal_benefit") not in PERSONAL_BENEFIT:
            err(f"{tid}: bad personal_benefit")
        lo, hi = t.get("amount_low"), t.get("amount_high")
        if not isinstance(lo, (int, float)) or not isinstance(hi, (int, float)) or lo > hi or lo < 0:
            err(f"{tid}: amounts must satisfy 0 <= low <= high")
        if not DATE_RE.match(str(t.get("value_date", ""))):
            err(f"{tid}: bad value_date {t.get('value_date')}")
        for end in ("from", "to"):
            v = t.get(end)
            if v is None:
                if end == "to" or not t.get("hide_edge"):
                    err(f"{tid}: '{end}' required unless hide_edge (and 'to' always)")
            elif v not in E:
                err(f"{tid}: unknown entity {v}")
        if not t.get("claims"):
            err(f"{tid}: no claims")
        for cid in t.get("claims", []):
            if cid not in C:
                err(f"{tid}: unknown claim {cid}")
        if t.get("dedupe_key"):
            keys[t["dedupe_key"]].append(tid)
        else:
            err(f"{tid}: missing dedupe_key")
        if t.get("part_of"):
            parent = T.get(t["part_of"])
            if not parent:
                err(f"{tid}: unknown part_of {t['part_of']}")
            elif parent.get("currency") != t.get("currency"):
                err(f"{tid}: part_of parent has a different currency")
            elif isinstance(hi, (int, float)) and hi > parent.get("amount_high", 0):
                err(f"{tid}: component exceeds its parent {parent['id']}")
    for k, ids in keys.items():
        if len(ids) > 1:
            err(f"duplicate transaction (dedupe_key {k}): {ids}")

    for r in d["relationships"]:
        rid = r["id"]
        if r.get("kind") not in REL_KINDS:
            err(f"{rid}: bad kind {r.get('kind')}")
        for end in ("source", "target"):
            if r.get(end) not in E:
                err(f"{rid}: unknown entity {r.get(end)}")
        if not r.get("label"):
            err(f"{rid}: missing label")
        if not r.get("claims"):
            err(f"{rid}: every relationship needs supporting claims")
        for cid in r.get("claims", []):
            if cid not in C:
                err(f"{rid}: unknown claim {cid}")
        if r.get("kind") == "inference":
            if not any(C.get(cid, {}).get("classification") == "inference" for cid in r.get("claims", [])):
                err(f"{rid}: inference edges must cite an inference claim")

    linked = {x for r in d["relationships"] for x in (r["source"], r["target"])}
    linked |= {t.get(k) for t in d["transactions"] if not t.get("hide_edge") for k in ("from", "to")}
    for eid in E:
        if eid not in linked:
            err(f"entity {eid} has no edges on the map")
    return errors


def build_bundle(d: dict[str, list[dict]]) -> dict:
    S = {s["id"]: s for s in d["sources"]}
    link_status = json.loads(LINK_STATUS.read_text(encoding="utf-8")) if LINK_STATUS.exists() else {}
    sources = []
    for s in d["sources"]:
        s = dict(s)
        if s["id"] in link_status:
            s["link"] = link_status[s["id"]]
        sources.append(s)

    claims = []
    for c in d["claims"]:
        c = dict(c)
        cited = [S[r["id"]] for r in c["sources"]]
        c["origins"] = len({origin(s) for s in cited if s["access"] != "blocked"})
        c["reviewed"] = any(s["access"] == "reviewed" for s in cited)
        c["year"] = int(str(c["event_date"])[:4])
        claims.append(c)

    edges = []
    for r in d["relationships"]:
        edges.append({"id": r["id"], "source": r["source"], "target": r["target"], "kind": r["kind"],
                      "label": r["label"], "claims": r["claims"]})
    for t in d["transactions"]:
        if t.get("hide_edge"):
            continue
        edges.append({"id": t["id"], "source": t["from"], "target": t["to"],
                      "kind": "money-proposed" if t["status"] in {"committed", "proposed", "announced", "estimated"} else "money",
                      "label": t["title"], "claims": t["claims"], "transaction": t["id"],
                      "amount_low": t["amount_low"], "amount_high": t["amount_high"], "currency": t["currency"]})

    degree = defaultdict(int)
    for e in edges:
        degree[e["source"]] += 1
        degree[e["target"]] += 1
    entities = [dict(e, degree=degree[e["id"]]) for e in d["entities"]]

    counts = defaultdict(int)
    for c in claims:
        counts[c["classification"]] += 1
    return {
        "generated": dt.date.today().isoformat(),
        "stats": {
            "entities": len(entities), "claims": len(claims), "sources": len(sources),
            "edges": len(edges), "transactions": len(d["transactions"]),
            "reviewed_sources": sum(1 for s in sources if s["access"] == "reviewed"),
            "by_classification": dict(counts),
        },
        "entities": entities, "claims": claims, "sources": sources,
        "transactions": d["transactions"], "edges": edges,
    }


def flat(v):
    if isinstance(v, list):
        return "; ".join(x["id"] if isinstance(x, dict) else str(x) for x in v)
    return "" if v is None else v


def write_csv(path: Path, rows: list[dict], cols: list[str]):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for r in rows:
            w.writerow([flat(r.get(c)) for c in cols])


SOURCE_COLS = ["id", "title", "publisher", "url", "published", "type", "access", "accessed", "repeats", "note"]
ENTITY_COLS = ["id", "name", "type", "lane", "country", "role", "summary"]
CLAIM_COLS = ["id", "title", "statement", "event_date", "track", "classification", "connection", "confidence",
              "entities", "sources", "limitations", "responses", "related"]
TX_COLS = ["id", "title", "from", "to", "category", "amount_low", "amount_high", "currency", "value_date", "status",
           "beneficiary", "personal_benefit", "benefit_note", "part_of", "claims", "dedupe_key", "methodology"]
REL_COLS = ["id", "source", "target", "kind", "label", "claims"]


def write_exports(d, bundle):
    EXPORTS.mkdir(parents=True, exist_ok=True)
    write_csv(EXPORTS / "sources.csv", d["sources"], SOURCE_COLS)
    write_csv(EXPORTS / "entities.csv", d["entities"], ENTITY_COLS)
    write_csv(EXPORTS / "claims.csv", d["claims"], CLAIM_COLS)
    write_csv(EXPORTS / "transactions.csv", d["transactions"], TX_COLS)
    write_csv(EXPORTS / "relationships.csv", d["relationships"], REL_COLS)
    # Claim → source citation table, one row per citation, with locator and quote.
    cites = [{"claim": c["id"], "source": r["id"], "locator": r.get("locator"), "quote": r.get("quote")}
             for c in d["claims"] for r in c["sources"]]
    write_csv(EXPORTS / "citations.csv", cites, ["claim", "source", "locator", "quote"])
    write_csv(EXPORTS / "gephi-nodes.csv",
              [{"Id": e["id"], "Label": e["name"], "type": e["type"], "lane": e["lane"]} for e in d["entities"]],
              ["Id", "Label", "type", "lane"])
    write_csv(EXPORTS / "gephi-edges.csv",
              [{"Source": e["source"], "Target": e["target"], "Type": "Directed", "Label": e["label"],
                "kind": e["kind"], "evidence": e["claims"]} for e in bundle["edges"]],
              ["Source", "Target", "Type", "Label", "kind", "evidence"])

    db = EXPORTS / "exposed_trump.sqlite"
    db.unlink(missing_ok=True)
    con = sqlite3.connect(db)
    for name, rows, cols in (("sources", d["sources"], SOURCE_COLS), ("entities", d["entities"], ENTITY_COLS),
                             ("claims", d["claims"], CLAIM_COLS), ("transactions", d["transactions"], TX_COLS),
                             ("relationships", d["relationships"], REL_COLS), ("citations", cites,
                                                                                ["claim", "source", "locator", "quote"])):
        qc = ", ".join(f'"{c}"' for c in cols)
        con.execute(f"CREATE TABLE {name} ({qc})")
        con.executemany(f"INSERT INTO {name} VALUES ({', '.join('?' * len(cols))})",
                        [[flat(r.get(c)) for c in cols] for r in rows])
    con.commit()
    con.close()
    (EXPORTS / "seed.sql").write_text(seed_sql(d), encoding="utf-8")
    # Publish the exports with the site so the Data page can link to them.
    site_exports = BUNDLE.parent / "exports"
    site_exports.mkdir(parents=True, exist_ok=True)
    for f in EXPORTS.iterdir():
        shutil.copy2(f, site_exports / f.name)


def q(v) -> str:
    if v is None or v == "":
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def seed_sql(d) -> str:
    """INSERT statements matching migrations/001_schema.sql."""
    out = ["-- Generated by pipeline/build.py. Do not edit.", "BEGIN;",
           "TRUNCATE citation, claim_entity, relationship_claim, transaction_claim, relationship, financial_transaction, claim, entity, source CASCADE;"]
    for s in d["sources"]:
        out.append("INSERT INTO source (id,title,publisher,url,published,source_type,access,accessed,repeats,note) VALUES "
                   f"({q(s['id'])},{q(s['title'])},{q(s['publisher'])},{q(s['url'])},{q(s['published'])},{q(s['type'])},"
                   f"{q(s['access'])},{q(s['accessed'])},{q(s.get('repeats'))},{q(s.get('note'))});")
    for e in d["entities"]:
        out.append("INSERT INTO entity (id,name,entity_type,lane,country,role,summary) VALUES "
                   f"({q(e['id'])},{q(e['name'])},{q(e['type'])},{e['lane']},{q(e.get('country'))},{q(e['role'])},{q(e['summary'])});")
    for c in d["claims"]:
        out.append("INSERT INTO claim (id,title,statement,event_date,track,classification,connection,confidence,limitations,responses) VALUES "
                   f"({q(c['id'])},{q(c['title'])},{q(c['statement'])},{q(c['event_date'])},{q(c['track'])},{q(c['classification'])},"
                   f"{q(c['connection'])},{q(c['confidence'])},{q(c['limitations'])},{q(c.get('responses'))});")
        for eid in c["entities"]:
            out.append(f"INSERT INTO claim_entity (claim_id,entity_id) VALUES ({q(c['id'])},{q(eid)});")
        for r in c["sources"]:
            out.append("INSERT INTO citation (claim_id,source_id,locator,quote) VALUES "
                       f"({q(c['id'])},{q(r['id'])},{q(r.get('locator'))},{q(r.get('quote'))});")
    for t in d["transactions"]:
        out.append("INSERT INTO financial_transaction (id,title,from_entity,to_entity,category,amount_low,amount_high,currency,value_date,status,"
                   "beneficiary,personal_benefit,benefit_note,part_of,dedupe_key,methodology,hide_edge) VALUES "
                   f"({q(t['id'])},{q(t['title'])},{q(t.get('from'))},{q(t['to'])},{q(t['category'])},{t['amount_low']},{t['amount_high']},"
                   f"{q(t['currency'])},{q(t['value_date'])},{q(t['status'])},{q(t.get('beneficiary'))},{q(t['personal_benefit'])},"
                   f"{q(t.get('benefit_note'))},{q(t.get('part_of'))},{q(t['dedupe_key'])},{q(t.get('methodology'))},{q(bool(t.get('hide_edge')))});")
        for cid in t["claims"]:
            out.append(f"INSERT INTO transaction_claim (transaction_id,claim_id) VALUES ({q(t['id'])},{q(cid)});")
    for r in d["relationships"]:
        out.append("INSERT INTO relationship (id,source_entity,target_entity,kind,label) VALUES "
                   f"({q(r['id'])},{q(r['source'])},{q(r['target'])},{q(r['kind'])},{q(r['label'])});")
        for cid in r["claims"]:
            out.append(f"INSERT INTO relationship_claim (relationship_id,claim_id) VALUES ({q(r['id'])},{q(cid)});")
    out.append("COMMIT;")
    return "\n".join(out) + "\n"


def write_register(d, bundle):
    S = {s["id"]: s for s in d["sources"]}
    lines = ["# Evidence Register", "",
             f"Generated {bundle['generated']} by `pipeline/build.py` from `data/*.yaml`. Do not edit by hand.", "",
             f"{len(d['claims'])} claims · {len(d['sources'])} sources ({bundle['stats']['reviewed_sources']} reviewed in full) · "
             f"{len(d['transactions'])} financial amounts · {len(bundle['edges'])} map edges.", "",
             "Source access: **reviewed** = document text read and quoted; **located** = found by search, content known "
             "from excerpts only; **blocked** = retrieval refused.", ""]
    for c in d["claims"]:
        lines += [f"## {c['id']} — {c['title']}", "",
                  f"- **Statement:** {c['statement']}",
                  f"- **Event date:** {c['event_date']} · **Track:** {c['track']}",
                  f"- **Classification:** {c['classification']} · **Connection:** {c['connection']} · **Confidence:** {c['confidence']}",
                  f"- **Entities:** {', '.join(c['entities'])}",
                  f"- **Limitations:** {c['limitations']}"]
        if c.get("responses"):
            lines.append(f"- **Responses / exculpatory:** {c['responses']}")
        if c.get("related"):
            lines.append(f"- **Related:** {', '.join(c['related'])}")
        lines.append("- **Sources:**")
        for r in c["sources"]:
            s = S[r["id"]]
            rep = f" — restates {s['repeats']}" if s.get("repeats") else ""
            lines.append(f"  - {s['id']} [{s['title']}]({s['url']}) — {s['publisher']}, {s['published']} "
                         f"· *{s['access']}*{rep} · locator: {r.get('locator')}")
            if r.get("quote"):
                lines.append(f"    > {r['quote']}")
        lines.append("")
    REGISTER.parent.mkdir(parents=True, exist_ok=True)
    REGISTER.write_text("\n".join(lines), encoding="utf-8")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="validate only")
    args = ap.parse_args(argv)
    d = load_all()
    errors = validate(d)
    if errors:
        print(f"{len(errors)} validation error(s):", file=sys.stderr)
        for e in errors:
            print("  -", e, file=sys.stderr)
        return 1
    bundle = build_bundle(d)
    print(f"valid: {bundle['stats']}")
    if args.check:
        return 0
    BUNDLE.parent.mkdir(parents=True, exist_ok=True)
    BUNDLE.write_text(json.dumps(bundle, ensure_ascii=False, indent=1), encoding="utf-8")
    write_exports(d, bundle)
    write_register(d, bundle)
    print(f"wrote {BUNDLE.relative_to(ROOT)}, data/exports/, {REGISTER.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
