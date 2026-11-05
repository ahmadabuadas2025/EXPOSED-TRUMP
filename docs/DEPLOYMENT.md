# Deployment

## Static site (recommended)

```bash
python pipeline/build.py
cd web && npm ci && npm run build      # output: web/dist/
```

Upload `web/dist/` to any static host. The build uses relative asset paths (`base: "./"`) and hash routing, so it works from a sub-path with no rewrite rules.

- **GitHub Pages:** push to `main`. `.github/workflows/ci.yml` validates the data, runs the tests, builds, and deploys. Enable Pages with source "GitHub Actions" in the repository settings.
- **Netlify / Cloudflare Pages:** build command `pip install pyyaml requests && python pipeline/build.py && cd web && npm ci && npm run build`, publish directory `web/dist`.
- **S3 / any web server:** copy `web/dist/` as-is.

## Updating the evidence

Edit `data/*.yaml`, then run `python pipeline/build.py` and rebuild. CI rejects data that breaks the evidence rules. Re-run `python pipeline/linkcheck.py` periodically (for example monthly) and commit `data/link_status.json`.

## PostgreSQL (optional)

The site doesn't need a database. To query the evidence in SQL:

```bash
createdb exposed_trump
psql exposed_trump -f migrations/001_schema.sql
python pipeline/build.py                 # regenerates data/exports/seed.sql
psql exposed_trump -f data/exports/seed.sql
```

Example queries:

```sql
-- full-text search across findings
SELECT id, title FROM claim WHERE search @@ plainto_tsquery('english', 'Phoenix stake');

-- totals that are safe to show (additive types, components excluded)
SELECT * FROM amount_totals;

-- every finding with its citations
SELECT c.id, c.classification, s.publisher, ci.locator
FROM claim c JOIN citation ci ON ci.claim_id = c.id JOIN source s ON s.id = ci.source_id
ORDER BY c.id;
```

A SQLite copy (`data/exports/exposed_trump.sqlite`) is also produced for quick local queries.
