# PRD — EPSO AD 8 (AI) Prep Trainer

**Codename:** working title `epso-forge` (rename freely)
**Owner:** Pavol
**Status:** Draft v1, handed to Claude Code 2026-07-18
**Scope:** Merges option **C** (combined shell: reasoning + field MCQ, progress, spaced repetition) and option **D** (self-generating content), under a hard constraint of **zero paid API tokens at runtime**.
**Target competition:** EPSO/AD/430/26 — Administrators (AD 8), Field: Artificial Intelligence. Applications open ~8 Sept 2026. The Notice of Competition (NoC) + Annex II syllabus is the binding spec; this app is built to slot that syllabus in when it lands.

---

## 0. Assumptions (confirmed)

1. **"Flywheel standards"** = the repo conventions in `flywheel/docs/FLYWHEEL-STANDARD.md` + `flywheel/docs/standards/` (confirmed by Pavol: "just see the repo").
2. **Zero paid API tokens** = the shipped, running app never calls a metered API. All LLM work happens at **authoring time** (Claude Code / local tooling) or on **self-hosted local models** (Mac mini M4 hub). See §6.
3. Deployment target is `epso.dravec.org` under the existing shell. Offline-capable (PWA) because drilling happens on vacation with patchy connectivity.
4. Single primary user (Pavol), but built so it generalises (same engine, swap the content pack — like autoskola-kviz / zbrojni-kviz).

---

## 1. Problem

An AD 8 specialist competition is won or lost on test *technique*, not domain expertise. The structure (inferred from sibling competitions EPSO/AD/429/26 and /426/25, pending the real NoC):

- **Reasoning gate** — verbal / numerical / abstract MCQ. Pass/fail. Does **not** feed ranking.
- **Field-Related MCQ (FRMCQ)** — AI-specific. Both a pass gate *and* the primary ranking variable.
- **Written field test (EUFTE)** — only the top ~1.5× the reserve-list size get invited.

Predictable weak spots for a McKinsey analytics profile: (1) the EU **regulatory** frame (AI Act, GDPR, Data Act, DGA) that EPSO leans on heavily, and (2) EPSO's specific item format and time pressure. No good FRMCQ bank exists for this niche.

## 2. Personas

**P1 — The learner (primary).** Expert, time-poor, ~30–45 min/day, drilling on vacation. Needs the system to *find his edges* fast. Hates dark-pattern gamification; responds to visible mastery and a clean streak.

**P2 — The selection committee (north-star, not a user).** Content designed around the screened signal: analysis & problem-solving under time pressure, quality under constraints, written communication, applied to the AI field and its EU legal frame. Every item tagged to a competency and a syllabus domain.

**P3 — Future learners (reuse).** Kids' exam prep. Same engine, different content pack. Content is data, not code.

## 3. Frameworks → features

| Framework | What it becomes in the app |
|---|---|
| Montessori — control of error | Every item ships a worked rationale + source citation, revealed on answer. |
| Montessori — isolation of difficulty | Focus mode: drill a single domain tag or reasoning type in isolation. |
| Montessori — prepared environment | Free navigation; the system suggests but never locks. |
| Duolingo — Goldilocks difficulty | Elo θ/b selection keeps served difficulty just above ability (§7). |
| Duolingo — streaks minus the guilt | Daily goal (default 40 items) + streak; free freezes, no nags/leaderboards/currency. |
| FSRS | The scheduling core; wrong/shaky items resurface on the forgetting curve. |
| Double diamond | Build order M0–M4 (§10); Tally/feedback = the test loop. |
| Committee empathy | Competency tagging; EUFTE scenario mode with rubrics. |
| Learner empathy | "Easy" fast-path: proven items leave the active pool fast. |

## 4. Goals, non-goals, metrics

**Goals:** reasoning gate reliably above threshold with minimal time; a continuously sharpening, cited FRMCQ bank; EUFTE rehearsal against rubrics; fully offline, zero runtime API cost.

**Non-goals (v1):** no accounts/sync server; no native app (PWA); no live LLM calls ever; not a replacement for official EPSO samples.

**Metrics:** leading — items/day, % sessions hitting goal, share of time on weak tags, predicted-recall trend. Lagging — mock accuracy per gate, time-per-item at constant accuracy. Flywheel health — each generation run raises coverage of previously-weak tags.

## 5. Content model

One item schema for reasoning + field questions (implemented in `src/content/types.ts`):
id, type (reasoning_verbal | reasoning_numerical | reasoning_abstract | field_mcq | eufte_scenario),
domain tag, competency[], difficulty_b (Elo-seeded), stem, options A–D, correct, rationale,
source {title, url}, provenance {generator, run, reviewed}, version.

**Seed FRMCQ taxonomy** (replace with Annex II when published): AI Act (risk tiers, prohibited practices, high-risk, GPAI, governance), GDPR intersection, Data Act, DGA, Open Data Directive; ML/DL foundations, LLMs & GenAI, MLOps, evaluation, data engineering, model risk & robustness, AI security; public-sector AI, ethics/HLEG, EU institutions.

**EUFTE mode (M4):** scenario prompts with authoring-time rubrics; self-assessment or local-model grading. No metered calls.

## 6. Zero-token generation architecture

The app never generates at runtime. Generation is an authoring pipeline; the app ships static, versioned JSON.

**6.1 Authoring pipeline (offline):** corpus (`content/corpus/`, gitignored) → chunk + tag → RAG-grounded generation via Claude Code or the Mac mini hub → validate (`tools/validate.mjs`: schema, exactly-one-correct, distractor sanity, near-dup dedupe) → human spot-check (`provenance.reviewed` gates Mock mode) → commit to `content/bank/`.

**6.2 Reasoning items — no LLM.** Numerical and abstract items are procedurally generated in code with guaranteed-correct answers (`src/engine/procedural/`). Verbal items come from the authoring pipeline.

**6.3 Optional runtime "infinite mode"** (feature-flagged, later): local-model endpoint at `hub.dravec.org` or in-browser WebLLM. Static bank is the product and the default.

**6.4 The flywheel:** drill → telemetry (weak tags, confusion, slow items) → export weak-tag report (Progress screen) → next authoring run targets weak tags → sharper bank → drill.

## 7. Adaptive engine

**7.1 Scheduling — FSRS** (`ts-fsrs`): 4-button rating (Again/Hard/Good/Easy), target retention default 90% (tunable in Progress → raise toward the exam). Decides *when*.

**7.2 Selection — Elo/Goldilocks:** item difficulty `b` and learner ability `θ`, both updated per answer; sessions pick due items first, then new items nearest the ~70%-success sweet spot. Below ~100 answers: fixed easy→hard curriculum. Decides *what*. Both run client-side on IndexedDB.

## 8. UX / modes

**Today** (one CTA, goal + streak) · **Focus** (single tag isolation) · **Mock** (timed draw of reviewed items, feedback deferred to summary) · **EUFTE** (M4) · **Review** (post-session rationale pass) · **Progress** (strength bars, weak tags, retention setting, telemetry export).

Item screen: stem → options → answer → control of error (rationale + source) → self-rate. Keyboard-first: 1–4/A–D answer, 2/3/4 rate, Enter continue. Anti-dark-pattern rules apply.

## 9. Tech stack

Per flywheel standard and sister apps (autoskola-kviz, zbrojni-kviz): Vite + React + TS + Tailwind, Vitest + RTL, Dexie (IndexedDB), vite-plugin-pwa, Cloudflare Pages preferred. Repo layout: `src/engine · src/content · src/ui · src/db · content/bank · content/corpus · tools`.

## 10. Build phases

- **M0 — Scaffold** ✅ shell, Dexie schema, item schema + validators, seed pack. *Accept:* answer items, state persists across reloads.
- **M1 — SRS + reasoning gate** ✅ ts-fsrs, self-rating, Today/Review/Progress, procedural generators. *Accept:* due-scheduling works; infinite reasoning drills; mastery bars move.
- **M2 — Adaptive selection** ✅ Elo θ/b, Goldilocks generator, warmup curriculum. *Accept:* served difficulty tracks ability.
- **M3 — FRMCQ bank + authoring pipeline.** RAG-grounded generation, ≥300 reviewed cited items across the taxonomy; realistic Mock. (Next.)
- **M4 — Flywheel + EUFTE.** Weak-tag regeneration loop demonstrated; EUFTE scenarios + rubrics; optional hub flag.

When the real NoC/Annex II publishes (~8 Sept 2026), swap the seed taxonomy and re-run M3.

## 11. Open decisions

1. Flywheel standards reading — **confirmed** ("see the repo").
2. Target retention — 90% default, raise toward exam (setting shipped in Progress).
3. Hub infinite mode — deferred, static-only v1.
4. EUFTE grading — self-rubric first; local-model grading when the hub is up.
5. Corpus scope v1 — regulatory-first (the likely weak spot), technical second.

## References

- EPSO testing / competency framework (eu-careers.europa.eu); sibling NoCs EPSO/AD/429/26, /426/25
- Settles & Meeder (2016), A Trainable Spaced Repetition Model, Duolingo Research
- Duolingo Birdbrain / Goldilocks difficulty write-ups
- Ye, J. — FSRS / `ts-fsrs` (open-spaced-repetition)
- Optimizing RAG of Medical Content for Spaced Repetition (arXiv 2503.01859)
