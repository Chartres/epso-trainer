# EPSO Forge — AD 8 (AI) prep trainer

Practice trainer for the EPSO/AD/430/26 competition (Administrators AD 8, field: Artificial
Intelligence): the reasoning gate (verbal / numerical / abstract) and the field-related MCQ
that decides the ranking. Offline-capable PWA, free, no ads, no accounts.

- **Spaced repetition (FSRS)** decides *when* an item comes back — lapses resurface fast,
  mastered items fade out.
- **Adaptive difficulty (Elo)** decides *what* comes next — items sit just above your current
  level (the Goldilocks zone) after a ~100-item warmup curriculum.
- **Infinite reasoning drills** — numerical and abstract items are generated procedurally with
  guaranteed-correct answers. No LLM, no API, no network.
- **Control of error** — every item ships a worked rationale and a source citation, revealed on
  answer. Field items cite the actual legal text (AI Act, GDPR, Data Act, DGA, …).
- **The flywheel** — practice telemetry exports a weak-tag report that steers the next
  authoring run, so the bank keeps sharpening where you are weakest.

Zero runtime API cost by design: all content generation happens at authoring time; the shipped
app is static JSON + client-side engines on IndexedDB.

## Develop

```bash
npm ci
npm run dev          # http://localhost:5173
npm test             # Vitest: engine, store, validators, persona journeys
npm run typecheck
npm run validate-data
npm run build
```

The full contract (gates, journeys, authoring pipeline) is in `AGENTS.md`; the product spec is
`docs/PRD.md`.

## Content

Items are data (`content/bank/*.json`), one schema for reasoning and field questions, each with
domain tag, competency tag, difficulty seed, rationale, source, and provenance. Only items with
`provenance.reviewed: true` appear in Mock mode. The seed taxonomy is replaced by the official
Annex II syllabus when the Notice of Competition publishes.
