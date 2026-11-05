"""Tests for the evidence pipeline: the real data must validate, and each editorial rule
must actually reject the bad case it exists to catch."""
import copy
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import build  # noqa: E402


@pytest.fixture(scope="module")
def data():
    return build.load_all()


def errors_after(data, mutate):
    d = copy.deepcopy(data)
    mutate(d)
    return build.validate(d)


def claim(d, cid):
    return next(c for c in d["claims"] if c["id"] == cid)


def tx(d, tid):
    return next(t for t in d["transactions"] if t["id"] == tid)


def test_real_data_is_valid(data):
    assert build.validate(data) == []


def test_claim_without_sources_rejected(data):
    errs = errors_after(data, lambda d: claim(d, "C-001").update(sources=[]))
    assert any("C-001: no sources" in e for e in errs)


def test_verified_requires_reviewed_quote(data):
    # C-010 cites only located news sources; calling it verified must fail.
    errs = errors_after(data, lambda d: claim(d, "C-010").update(classification="verified"))
    assert any("C-010: 'verified' requires" in e for e in errs)


def test_quote_from_unreviewed_source_rejected(data):
    def m(d):
        claim(d, "C-010")["sources"][0]["quote"] = "invented words"
    assert any("not reviewed" in e for e in errors_after(data, m))


def test_corroborated_requires_independent_origins(data):
    # C-020's two news sources both restate the NYT; without the Senate letter it is one origin.
    def m(d):
        c = claim(d, "C-020")
        c["sources"] = [s for s in c["sources"] if s["id"] in ("S-006", "S-007")]
        c["classification"] = "corroborated"
    assert any("C-020: 'corroborated' requires" in e for e in errors_after(data, m))


def test_blocked_source_does_not_count_toward_corroboration(data):
    def m(d):
        c = claim(d, "C-043")
        c["sources"] = [s for s in c["sources"] if s["id"] in ("S-031", "S-033")]
    assert any("C-043: 'corroborated' requires" in e for e in errors_after(data, m))


def test_duplicate_transaction_rejected(data):
    errs = errors_after(data, lambda d: tx(d, "T-004").update(dedupe_key="pif-affinity-commitment"))
    assert any("duplicate transaction" in e for e in errs)


def test_component_cannot_exceed_parent(data):
    errs = errors_after(data, lambda d: tx(d, "T-003").update(amount_low=2e8, amount_high=2e8))
    assert any("exceeds its parent" in e for e in errs)


def test_component_currency_must_match(data):
    errs = errors_after(data, lambda d: tx(d, "T-003").update(currency="ILS"))
    assert any("different currency" in e for e in errs)


def test_relationship_requires_evidence(data):
    errs = errors_after(data, lambda d: d["relationships"][0].update(claims=[]))
    assert any("needs supporting claims" in e for e in errs)


def test_inference_edge_must_cite_inference_claim(data):
    def m(d):
        r = next(r for r in d["relationships"] if r["kind"] == "inference")
        r["claims"] = ["C-001"]
    assert any("inference edges must cite" in e for e in errors_after(data, m))


def test_unknown_entity_rejected(data):
    errs = errors_after(data, lambda d: claim(d, "C-001")["entities"].append("nobody"))
    assert any("unknown entity nobody" in e for e in errs)


def test_low_above_high_rejected(data):
    errs = errors_after(data, lambda d: tx(d, "T-001").update(amount_low=3e9))
    assert any("T-001: amounts" in e for e in errs)


def test_bundle_never_draws_hidden_edges(data):
    bundle = build.build_bundle(data)
    hidden = {t["id"] for t in data["transactions"] if t.get("hide_edge")}
    assert hidden and not hidden & {e.get("transaction") for e in bundle["edges"]}


def test_commitments_are_drawn_as_proposed_not_paid(data):
    bundle = build.build_bundle(data)
    e = next(e for e in bundle["edges"] if e.get("transaction") == "T-001")
    assert e["kind"] == "money-proposed"


def test_phoenix_arithmetic_matches_reported_gain(data):
    # Documented consistency check in T-008's methodology.
    proceeds, remaining, cost = (tx(data, t)["amount_low"] for t in ("T-006", "T-007", "T-005"))
    assert abs((proceeds + remaining - cost) - tx(data, "T-008")["amount_low"]) < 0.05e9


def test_arms_sale_components_sum_to_low_end(data):
    assert tx(data, "T-028")["amount_low"] == 2_040_000_000 + 675_700_000 + 295_000_000


def test_seed_sql_escapes_quotes(data):
    sql = build.seed_sql(data)
    assert "Kushner''s" in sql or "''" in sql
    assert sql.strip().endswith("COMMIT;")


def test_bundle_is_json_serialisable(data):
    json.dumps(build.build_bundle(data))
