# Vestor Agent Instructions

## Project Context

Vestor is an AI-powered Financial Literacy and Investment Platform.

Before implementing anything:
1. Read AGENTS.md
2. Read docs/CURRENT_STATE.md
3. Read only the relevant section of docs/VESTOR_MASTER.md
4. Inspect existing code before modifying it

Do NOT read the entire project unless necessary.

---

## Core Rules

- Do not invent features.
- Do not change finalized architecture without explicit approval.
- Do not rename existing modules without approval.
- Do not duplicate business logic.
- Do not create mock implementations when a real implementation is specified.
- Never hardcode API keys or secrets.
- Never put business logic inside React components.
- Never call the LLM directly from frontend code.
- Never allow AI to modify financial data without explicit user confirmation.
- Reuse existing services before creating new ones.
- Follow existing project patterns before introducing a new pattern.

---

## Architecture

Frontend:
React + TypeScript + TailwindCSS

Backend:
FastAPI

Database:
PostgreSQL

AI:
Gemini

Vector DB:
Qdrant

Background jobs:
Celery + Redis

---

## Required Development Process

Before coding:

1. Understand the requested feature.
2. Inspect relevant existing files.
3. Identify affected modules.
4. Check CURRENT_STATE.md.
5. Check VESTOR_MASTER.md only for relevant architecture.
6. Implement the smallest correct change.
7. Run relevant tests/type checks.
8. Fix errors.
9. Update CURRENT_STATE.md.
10. Report exactly what changed.

---

## Token Efficiency

Do not repeatedly reread large documentation files.

Prefer:
CURRENT_STATE.md
→ relevant section of VESTOR_MASTER.md
→ relevant source files

Only read unrelated documentation when required.

Do not regenerate existing architecture documentation unless explicitly requested.

---

## Before Creating a New File

Ask:

1. Does an existing file already handle this responsibility?
2. Can the functionality be added to an existing service/component?
3. Would creating this file introduce unnecessary abstraction?

Avoid unnecessary files.

---

## Completion Criteria

A task is NOT complete merely because code was written.

Verify:
- Application builds
- Types pass
- Relevant tests pass
- No obvious regression
- Documentation/state updated

## Infrastructure Policy

Vestor uses cloud-hosted infrastructure for persistent/shared services.

Do not introduce local replacements for project infrastructure unless explicitly approved.

Current:
- PostgreSQL → Neon

Planned:
- Redis → cloud-hosted Redis
- Vector database → Qdrant Cloud

Local development should run the application services locally while connecting to the configured cloud infrastructure through environment variables.

Never hardcode infrastructure credentials.
Never commit `.env` files.
Never introduce a local database/cache/vector database solely as a development shortcut unless explicitly approved.