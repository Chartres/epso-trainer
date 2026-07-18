# Changelog

## 0.2.0 — 2026-07-18

M3 (first generation run):

- 206 new machine-generated, round-trip-verified items (`gen-2026-07-18-g1` pack) across all
  20 seed domains — bank now 234 items. Regulatory items grounded per-article in the actual
  EUR-Lex texts; every item cites its source.
- Authoring pipeline: `tools/corpus.mjs` (EUR-Lex fetch + per-article chunking),
  workflow fan-out (sonnet generators → answer-blind round-trip verification by an
  independent sonnet gate + haiku difficulty calibration; 2/208 dropped),
  `tools/dedupe.mjs` (local MiniLM embedding near-dup gate via transformers.js).
- `provenance.verification` records the verification level; generated items ship
  `reviewed: false` (practice modes only) pending human spot-check for Mock eligibility.
- Touchless Cloudflare Pages deploy in CI: main → epso.dravec.org, claude/** → preview URL.
- In-app spot-check: Approve-for-Mock / Flag-as-wrong buttons on the answer screen for
  unreviewed items. Verdicts persist locally (approved → Mock-eligible on the device,
  flagged → excluded everywhere), ride the telemetry export, and
  `tools/apply-review.mjs` writes them back into the committed packs.

## 0.1.0 — 2026-07-18

M0–M2 of the PRD:

- App shell: Vite + React + TS + Tailwind, offline PWA, bottom-nav mobile layout.
- Item schema + validators (schema, exactly-one-correct, near-duplicate dedupe);
  `validate-data` gate wired into CI.
- Seed pack: 28 hand-written, cited items (AI Act, GDPR×AI, Data Act, DGA, Open Data,
  ML foundations, LLMs, evaluation, robustness, security, MLOps, public-sector AI, ethics,
  EU institutions, verbal reasoning).
- FSRS scheduling (ts-fsrs) with 4-button self-rating and tunable target retention.
- Elo adaptive selection (θ/b, Goldilocks session generator, 100-answer warmup curriculum).
- Procedural numerical + abstract reasoning generators — seeded, guaranteed-correct, infinite.
- Dexie persistence: per-item progress, append-only review telemetry, daily counts + streak
  (free pauses, no guilt mechanics).
- Screens: Today, Focus (isolation of difficulty), Mock (deferred feedback, reviewed items
  only), session Review, Progress (strength bars, weak tags, telemetry export).
