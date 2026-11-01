-- Private event ledger used by the recursive theme compiler.
-- Additive and reversible: dropping this table does not affect newsletter delivery.

CREATE TABLE IF NOT EXISTS public.theme_evidence (
  event_key text PRIMARY KEY,
  observed_at timestamptz NOT NULL,
  publication_date date NOT NULL,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  source_url text NOT NULL DEFAULT '',
  source_name text NOT NULL DEFAULT '',
  feed_url text NOT NULL DEFAULT '',
  source_candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_tier integer NOT NULL DEFAULT 3 CHECK (source_tier BETWEEN 1 AND 99),
  entities jsonb NOT NULL DEFAULT '{}'::jsonb,
  theme_matches jsonb NOT NULL DEFAULT '[]'::jsonb,
  researched boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT false,
  research_score numeric NOT NULL DEFAULT 0,
  research_gate text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_theme_evidence_publication_date
  ON public.theme_evidence (publication_date DESC);
CREATE INDEX IF NOT EXISTS idx_theme_evidence_theme_matches
  ON public.theme_evidence USING gin (theme_matches);
CREATE INDEX IF NOT EXISTS idx_theme_evidence_entities
  ON public.theme_evidence USING gin (entities);

REVOKE ALL PRIVILEGES ON TABLE public.theme_evidence FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.theme_evidence TO service_role;
ALTER TABLE public.theme_evidence ENABLE ROW LEVEL SECURITY;
