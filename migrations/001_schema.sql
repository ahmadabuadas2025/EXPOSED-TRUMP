-- Exposed-Trump evidence database (PostgreSQL 14+).
-- The YAML files in data/ are the source of truth; `python pipeline/build.py` regenerates
-- data/exports/seed.sql to load them:  psql "$DATABASE_URL" -f migrations/001_schema.sql -f data/exports/seed.sql

CREATE TYPE source_access   AS ENUM ('reviewed', 'located', 'blocked');
CREATE TYPE classification  AS ENUM ('verified', 'corroborated', 'reported', 'disputed', 'unverified', 'inference');
CREATE TYPE connection_level AS ENUM ('policy-decision', 'financial-relationship', 'economic-benefit', 'plausible-unproven', 'no-connection');
CREATE TYPE amount_category AS ENUM (
  'revenue', 'profit', 'investment-capital', 'asset-value', 'net-worth-estimate', 'loan-principal',
  'contract-value', 'government-expenditure', 'market-valuation', 'realized-gain',
  'unrealized-appreciation', 'potential-benefit', 'sale-proceeds', 'political-contribution',
  'charitable-donation', 'in-kind-gift', 'proposed-funding');

CREATE TABLE source (
  id          text PRIMARY KEY,
  title       text NOT NULL,
  publisher   text NOT NULL,
  url         text NOT NULL UNIQUE CHECK (url LIKE 'https://%'),
  published   text NOT NULL,           -- YYYY, YYYY-MM or YYYY-MM-DD
  source_type text NOT NULL,
  access      source_access NOT NULL,
  accessed    date NOT NULL,
  repeats     text,                    -- original outlet this source restates (not independent)
  note        text,
  link_status text,                    -- from pipeline/linkcheck.py
  link_checked date
);

CREATE TABLE entity (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  entity_type text NOT NULL,
  lane        smallint NOT NULL CHECK (lane BETWEEN 1 AND 5),
  country     text,
  role        text NOT NULL,
  summary     text NOT NULL
);

CREATE TABLE claim (
  id             text PRIMARY KEY,
  title          text NOT NULL,
  statement      text NOT NULL,
  event_date     text NOT NULL,
  track          text NOT NULL,
  classification classification NOT NULL,
  connection     connection_level NOT NULL,
  confidence     text NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  limitations    text NOT NULL,
  responses      text,
  search         tsvector GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || statement)) STORED
);
CREATE INDEX claim_search_idx ON claim USING gin (search);

CREATE TABLE claim_entity (
  claim_id  text REFERENCES claim(id) ON DELETE CASCADE,
  entity_id text REFERENCES entity(id),
  PRIMARY KEY (claim_id, entity_id)
);

CREATE TABLE citation (
  claim_id  text REFERENCES claim(id) ON DELETE CASCADE,
  source_id text REFERENCES source(id),
  locator   text NOT NULL,             -- page, section or passage
  quote     text,                      -- verbatim; only for reviewed sources
  PRIMARY KEY (claim_id, source_id)
);

CREATE TABLE financial_transaction (
  id               text PRIMARY KEY,
  title            text NOT NULL,
  from_entity      text REFERENCES entity(id),
  to_entity        text NOT NULL REFERENCES entity(id),
  category         amount_category NOT NULL,
  amount_low       numeric NOT NULL CHECK (amount_low >= 0),
  amount_high      numeric NOT NULL,
  currency         char(3) NOT NULL,
  value_date       text NOT NULL,
  status           text NOT NULL,
  beneficiary      text,
  personal_benefit text NOT NULL CHECK (personal_benefit IN ('proven', 'partial', 'unproven', 'none')),
  benefit_note     text,
  part_of          text REFERENCES financial_transaction(id),
  dedupe_key       text NOT NULL UNIQUE, -- one real-world transaction, however many reports
  methodology      text,
  hide_edge        boolean NOT NULL DEFAULT false,
  CHECK (amount_low <= amount_high),
  CHECK (from_entity IS NOT NULL OR hide_edge)
);

CREATE TABLE transaction_claim (
  transaction_id text REFERENCES financial_transaction(id) ON DELETE CASCADE,
  claim_id       text REFERENCES claim(id),
  PRIMARY KEY (transaction_id, claim_id)
);

CREATE TABLE relationship (
  id            text PRIMARY KEY,
  source_entity text NOT NULL REFERENCES entity(id),
  target_entity text NOT NULL REFERENCES entity(id),
  kind          text NOT NULL,
  label         text NOT NULL
);

CREATE TABLE relationship_claim (
  relationship_id text REFERENCES relationship(id) ON DELETE CASCADE,
  claim_id        text REFERENCES claim(id),
  PRIMARY KEY (relationship_id, claim_id)
);

-- Amounts that may be totalled: top-level rows only (components excluded), additive types only
-- (net-worth estimates, valuations, paper gains and proposals are never summed), never mixing
-- categories or currencies.
CREATE VIEW amount_totals AS
SELECT category, currency, count(*) AS n, sum(amount_low) AS total_low, sum(amount_high) AS total_high
FROM financial_transaction
WHERE part_of IS NULL
  AND category NOT IN ('net-worth-estimate', 'market-valuation', 'unrealized-appreciation', 'proposed-funding', 'potential-benefit')
GROUP BY category, currency;
