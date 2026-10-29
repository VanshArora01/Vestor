# ROADMAP.md — Vestor

**Current phase: Phase 0 — Architecture & documentation. No code written yet.**
(Update this line at the top the moment you move to the next phase — this is the single most important line in the whole docs folder.)

Total timeline: full semester (4+ months).

---

## Priority tiers
- **Must-have (defense depends on it)**: Dashboard, Finance, Goals, Academy
- **Should-have (differentiator, app survives without it)**: Portfolio, Advisor
- **Cut candidate if time runs short**: Market — a static/mock news feed is an acceptable fallback for the demo

---

## Phase 1 — Foundation (Month 1)
- Auth (JWT)
- PostgreSQL schema for all core entities (see DATA_MODEL.md once authored)
- Financial Context Service scaffolded (even if thin at first)
- Finance module — full manual CRUD (income, expenses, budget, debt, loans)
- Goals module — full manual CRUD, including Emergency Fund as a goal type
- Dashboard — wired to real Finance + Goals data via Financial Context Service
- **Exit criteria**: a boring but fully functional finance tracker, submittable as-is if everything after slips.

## Phase 2 — Academy (Month 2)
- Curriculum content authored + ingested into Qdrant (Tier 1-2 first, ~16 modules)
- AI Orchestration Layer built — prompt templates, RAG retrieval, Gemini calls
- Academy lesson generation wired through the AI Orchestration Layer, personalized via Financial Context Service
- Quiz flow, XP/streak/badges
- **Exit criteria**: Learn → Apply → Improve loop works end to end for Tier 1-2.

## Phase 3 — Portfolio + Advisor (Month 3)
- Portfolio — manual entry, value/gain-loss/allocation calculations, AI diversification commentary via AI Orchestration Layer
- Advisor — conversational surface on top of the same AI Orchestration Layer, full Financial Context access
- Academy Tier 3-6 content, if not finished in Phase 2
- **Exit criteria**: all must-have + should-have modules functioning together, referencing shared data.

## Phase 4 — Market, monetization, polish (Month 4)
- Market module (or confirmed mock fallback)
- Subscription tiers (Razorpay) gating premium Advisor usage / advanced Academy tiers
- Bug fixes, UI polish, deployment
- Project report / documentation (graded separately from code — don't leave this to the last week)

---

## Rule for this file
Never work on a module tagged for a later phase while an earlier phase's exit criteria are unmet. If you're tempted to jump ahead, that's a signal to check whether the current phase is actually done, not a reason to start the next one.
