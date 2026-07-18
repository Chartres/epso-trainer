# Changelog

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
