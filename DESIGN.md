# DESIGN.md — EPSO Forge

Design tokens + rationale (taste.md: each product earns its own identity; invariants hold).

## Identity

Night-navy field with gold accents — the EU flag palette pushed dark and calm. The app is a
drill room for an expert under time pressure: one primary action per screen, no decoration
competing with the stem text. Serif display (Source Serif 4) for headings, Inter for UI and
item text.

## Tokens (src/index.css @theme)

| Token | Value | Use |
|---|---|---|
| navy-950/900/800/700 | #0a1226 → #1f3161 | background field, primary buttons |
| paper | #f7f4ec | text on navy, card-adjacent |
| ink | #1c2333 | text on white cards |
| muted | #5a6478 | secondary text on white |
| gold-400/500/700 | #ffd94d / #c9a227 / #8a6f1d | CTA, streak, accents |
| pass / pass-soft | #1c7c43 / #e3f2e8 | correct reveal |
| fail / fail-soft | #b3261e / #f9e5e3 | incorrect reveal |

Contrast (WCAG AA): ink/white 14.9:1 · paper/navy-900 15.2:1 · navy-950/gold-500 7.4:1 ·
pass/white 5.1:1 · fail/white 6.6:1. Body text on white uses ink, never muted below 14px.

## Invariants honored

- 44px minimum touch targets (`min-h-[44px]` on every interactive element).
- Bottom-of-screen primary nav (mobile-ux.md), hidden during a session — the item screen owns
  the viewport.
- Visible keyboard focus (3px gold outline), keyboard-first item flow (1–4/A–D, Enter).
- Works at 375px: single-column cards, no horizontal overflow; `tabular-nums` only on numbers.
- No cookie banner — no cookies, local-first IndexedDB only.
- Anti-dark-pattern (PRD §8): streak pauses instead of resetting to shame, goal is items not
  minutes, no leaderboards, no currency, no notifications.
