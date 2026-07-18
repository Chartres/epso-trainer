# AGENTS.md — EPSO Forge (epso-trainer)

The build/test/release contract for this repo. An agent (or the overnight ralph loop) should be
able to read only this file and ship correctly. Keep every command copy-pasteable and current.
Taste rules that apply to every flywheel product live in the hub: `flywheel/docs/standards/taste.md`.

> One-liner: Prep trainer for EPSO/AD/430/26 (AD 8, Artificial Intelligence) — reasoning gate +
> field MCQ with FSRS spaced repetition and Elo-adaptive difficulty. Offline PWA, zero runtime
> API cost.
> Stack/template: Vite + React + TS (autoskola-kviz sibling) · Spec: `docs/PRD.md`

## Hard constraints (from the PRD — never violate)

- **Zero paid API tokens at runtime.** The shipped app never calls a metered API. All LLM work
  happens at authoring time (Claude Code sessions) or on self-hosted local models.
- Content is data: items live in `/content/bank/*.json`, validated by `npm run validate-data`.
  The engine is content-agnostic (P3: same engine, swap the pack).
- No dark patterns: no loss-aversion nags, no leaderboards, no currency. Streak pauses, never shames.

## Build
```bash
npm ci
npm run build
```

## Test (TDD required; persona-journey test per primary journey)
```bash
npm run typecheck
npm test                # Vitest (engine, store, validators, RTL journeys)
npm run validate-data   # bank schema + exactly-one-correct + dedupe
```
Gate: typecheck · test · build · validate-data must pass (CI: `.github/workflows/ci.yml`).
Block only on these. Run `scripts/ci-local.sh` before every push — green-local must equal green-CI.

## Run / verify a change in the real app
`npm run dev` → http://localhost:5173. Primary journeys to eyeball:
- **Today**: start session → answer (keys 1–4/A–D) → reveal shows rationale + source → rate
  (Hard/Good/Easy on correct; wrong auto-rates Again) → session review summary → streak/goal moves.
- **Focus**: pick "Verbal reasoning" or a field domain → isolated drill of that tag only.
- **Mock**: reasoning or field mock → no feedback until summary → accuracy + time/item reported.
- **Progress**: domain strength bars, weakest tags, retention setting, telemetry export (JSON).

## Architecture map
- `src/engine/` — `fsrs.ts` (WHEN: ts-fsrs wrapper), `elo.ts` (WHAT: θ/b + Goldilocks),
  `session.ts` (due → new → procedural fill; warmup curriculum below 100 answers),
  `procedural/` (numerical + abstract generators, seeded, guaranteed-correct — no LLM).
- `src/content/` — item schema/types, validators (shared with `tools/validate.mjs`), bank loader.
- `src/db/` — Dexie schema + `store.ts` (single write path `recordAnswer`; weak-tag telemetry).
- `content/bank/` — versioned item packs with provenance. `provenance.reviewed` gates Mock mode.
- `tools/` — authoring pipeline home (M3: RAG generation via Claude Code; validate.mjs is live).

## Release (the finish line — produces a storefront link)
- **Web** → Cloudflare Pages at `epso.dravec.org` (build: `npm run build`, output `dist/`).
  Until the CF Pages project is connected, the CI `test` job is the gate; deploy is manual.
- PWA: offline-first by construction (bank is bundled; service worker precaches the shell).

## Content authoring (the flywheel, PRD §6)
1. Export telemetry from Progress → weak-tag report.
2. In a Claude Code session: generate new items for weak tags, grounded in the corpus
   (`content/corpus/`, gitignored), cited, `provenance.reviewed: false`.
3. `npm run validate-data` → spot-check → flip `reviewed: true` → commit the pack.
Regenerate icons after changing `public/favicon.svg`: `node scripts/gen-icons.mjs`.

## Milestones (docs/PRD.md §10)
M0 scaffold ✅ · M1 SRS + procedural reasoning ✅ · M2 adaptive selection ✅ ·
M3 FRMCQ bank ≥300 items + authoring pipeline (next) · M4 flywheel loop + EUFTE mode.
When the real Notice of Competition / Annex II publishes (~Sept 2026), swap the seed taxonomy
in `src/content/types.ts` and re-run M3.

## Done means
Green CI · released (URL) · portfolio record updated (stage/gate/links in flywheel repo) ·
storefront link live · (outward promotion only after Pavol's sign-off).
