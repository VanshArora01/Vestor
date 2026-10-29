# CLAUDE.md — Vestor agent entry point

Read this file first, every session, before touching any code.

## What this project is
Vestor — AI-powered financial literacy and investment SaaS platform. Full vision, philosophy, module list, and non-negotiable rules live in `/docs/PROJECT_CONTEXT.md`. Read it before implementing any new feature.

## Current phase
Check `/docs/ROADMAP.md` for the current phase marker before starting work. **Do not start a module or feature that belongs to a later phase**, even if it looks quick — half-finished modules across multiple phases is the exact failure mode this project is structured to avoid.

## Before making any architectural change
1. Check `/docs/ARCHITECTURE.md` — does this change fit inside an existing service boundary, or does it require a new one?
2. Check `/docs/DECISIONS.md` — has this exact question already been decided? If yes, don't silently reverse it. If you believe the prior decision is wrong, say so explicitly and log a new decision entry explaining the change — don't just code around it.
3. If the change is genuinely new ground, implement it, then add an entry to `/docs/DECISIONS.md` explaining what was decided and why.

## Non-negotiable rules (full list in PROJECT_CONTEXT.md §13)
- AI never writes to financial data without explicit user confirmation.
- One entity, one owner — e.g. Emergency Fund lives in Goals, not duplicated in Finance. Check `/docs/DATA_MODEL.md` before adding a table/field that might already exist elsewhere.
- All AI logic (prompts, retrieval, model calls) goes through the AI Orchestration Layer — no module implements its own.
- No direct cross-module data dependencies — cross-module context flows through the Financial Context Service.
- Visual language stays minimal/professional/premium in every module, including Academy — no illustrative game-path animations.

## Where to look for what
| Task involves... | Read |
|---|---|
| A specific module's feature | `/docs/modules/<module>.md` + `ARCHITECTURE.md` |
| Database changes | `/docs/DATA_MODEL.md` |
| A new or changed API endpoint | `/docs/API_CONTRACTS.md` |
| Anything AI/RAG/prompt-related | `/docs/AI_ORCHESTRATION.md` |
| UI/component work | `/docs/DESIGN_SYSTEM.md` |
| Naming, folder structure, git conventions | `/docs/CONVENTIONS.md` |
| Unsure why something was built a certain way | `/docs/DECISIONS.md` |
| A term you don't recognize (e.g. "Financial Context") | `/docs/GLOSSARY.md` |

## If something seems inconsistent
Flag it — don't quietly resolve it by picking one side. Contradictions between docs mean a decision needs to be made and logged, not guessed at.
