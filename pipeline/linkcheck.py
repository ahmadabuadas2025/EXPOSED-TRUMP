"""Check every source URL and record the result in data/link_status.json.

    python pipeline/linkcheck.py

The build merges this file into the bundle, so the site shows dead or blocked links.
Status meanings:
    ok        2xx/3xx response
    blocked   401/403/429 or similar: the server refused an automated client; the page may
              still work in a browser, so this is flagged for manual review rather than "dead"
    dead      404/410
    error     network failure or other status
"""
from __future__ import annotations

import datetime as dt
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build import LINK_STATUS, load  # noqa: E402

UA = "Mozilla/5.0 (compatible; Exposed-Trump link checker; +https://github.com/)"


def check(url: str) -> dict:
    try:
        r = requests.head(url, headers={"User-Agent": UA}, timeout=20, allow_redirects=True)
        if r.status_code in (405, 400) or r.status_code >= 500:
            r = requests.get(url, headers={"User-Agent": UA}, timeout=20, allow_redirects=True, stream=True)
        code = r.status_code
        status = ("ok" if code < 400 else "dead" if code in (404, 410)
                  else "blocked" if code in (401, 403, 429, 451) else "error")
        return {"status": status, "http": code}
    except requests.RequestException as e:
        return {"status": "error", "http": None, "detail": type(e).__name__}


def main() -> int:
    sources = load("sources")
    today = dt.date.today().isoformat()
    with ThreadPoolExecutor(max_workers=12) as pool:
        results = list(pool.map(lambda s: check(s["url"]), sources))
    out = {s["id"]: dict(r, checked=today) for s, r in zip(sources, results)}
    LINK_STATUS.write_text(json.dumps(out, indent=1), encoding="utf-8")
    tally: dict[str, int] = {}
    for r in out.values():
        tally[r["status"]] = tally.get(r["status"], 0) + 1
    print(f"checked {len(out)} sources: {tally}")
    for sid, r in out.items():
        if r["status"] != "ok":
            print(f"  {sid}: {r['status']} {r.get('http') or r.get('detail')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
