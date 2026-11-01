# Theme Compiler

The Theme Compiler is the governed intelligence layer that keeps
`ai/config.yml` aligned with market evidence without allowing the current
taxonomy to reinforce itself.

## Data path

1. `rss_tool` records the entries the researcher already fetched; there is no
   second RSS crawl.
2. Repeated reporting is collapsed through the existing canonical-event and
   source-authority logic.
3. Every canonical observation is retained, including unmatched, rejected and
   unpublished events.
4. The daily workflow encrypts the evidence batch with a dedicated repository
   secret and uploads the ciphertext as a 90-day GitHub Actions artifact. When the additive Supabase migration is installed, the
   same records are also upserted into `theme_evidence`.

The public repository, artifact archive and newsletter JSON never expose the
plaintext evidence ledger.

## Weekly compilation

`.github/workflows/theme_compiler.yml` runs on Sunday and can also be launched
manually. It:

- downloads retained daily evidence;
- recomputes theme momentum, confidence and effective priority;
- clusters unmatched observations;
- asks the inexpensive utility model for at most three proposals;
- asks the editor model to challenge those proposals;
- applies only critic-approved proposals with at least two valid evidence IDs;
- validates schema and weight caps;
- backtests current versus proposed matching over both the evidence ledger and
  90 days of newsletter history;
- opens or updates a draft PR labelled `human-approval-required`.

The workflow never merges its own taxonomy PR.

## Authority split

Automatic:

- evidence capture and canonicalization;
- momentum, confidence and effective priority;
- unmatched-event clustering;
- proposal generation, critique, validation and backtesting.

Human approval required:

- structural importance changes;
- new, merged, split, archived or materially re-scoped themes;
- retrieval-signal changes that alter what future agents notice.

## Local dry run

```bash
python -m ai.scripts.theme_compiler \
  --evidence-file ai/tests/fixtures/theme_evidence.json \
  --output-dir ai/output/theme-compiler-dry-run \
  --write-config ai/output/theme-compiler-dry-run/proposed-config.yml
```

Add `--with-model` when `OPENAI_API_KEY` is available. Outputs include the
candidate config, audit, proposal, adversarial critique, backtest, review pack
and model-cost telemetry.

## Optional Supabase ledger

Apply `db/migrations/20261101_theme_evidence.sql`. The table is private: only
`service_role` receives access, RLS is enabled, and anonymous/authenticated
roles receive no grants. Artifact retention keeps the compiler operational
without making the database migration a newsletter dependency.
