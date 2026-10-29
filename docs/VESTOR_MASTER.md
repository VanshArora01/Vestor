# VESTOR — MASTER PROJECT DOCUMENT

This is the single source of truth for Vestor. Read this fully before implementing anything. Do not invent features, rename modules, or change architecture without updating this document first and logging the reasoning in Section 14 (Decisions).

---

# PART 1 — PRODUCT

## 1.1 Overview
Vestor is an AI-powered financial literacy and investment platform. It is not an expense tracker, portfolio tracker, chatbot, or course in isolation — it is one integrated ecosystem where every module reads and writes the same shared financial profile.

**Tagline**: Learn. Manage. Invest.

## 1.2 Vision
A user goes from not understanding personal finance to actively, correctly managing money, investments, and long-term goals — inside one product, without needing a separate course, spreadsheet, or broker app to understand what they're doing.

## 1.3 Mission
Turn financial knowledge into financial action immediately, using the user's own real numbers — never generic advice, never content in isolation from their actual financial life.

## 1.4 Core philosophy — Learn → Apply → Improve
```
User learns a concept (Academy)
        ↓
AI grounds it in the user's real numbers (Financial Context Service)
        ↓
AI proposes a concrete action (goal, budget change, reallocation)
        ↓
User confirms — nothing changes without explicit user action
        ↓
Dashboard reflects the change immediately
```
Every feature is checked against this loop: does it close the loop, or does it add content/data in isolation?

## 1.5 Product principles
1. One profile, one truth — no module keeps a private copy of data another module owns.
2. AI proposes, the user decides — no AI-initiated write to financial data, ever.
3. Every module must justify its AI usage — AI exists to make a specific action better, not as a bolt-on.
4. Consistency over novelty — one visual language everywhere, no module that looks like a different product.
5. Reusable services over duplicated logic — shared computation lives in one service, not several implementations.

## 1.6 Target users
Primary: Indian students and early-career professionals with income but little structured financial knowledge.
Secondary: casual investors who want learning, budgeting, and portfolio in one place instead of scattered apps.

## 1.7 Brand identity
Minimal, professional, modern, premium. Should read as a production fintech SaaS tool, not a hackathon demo or a gamified app skinned onto a dashboard. Tone: direct, clear, never condescending.

## 1.8 Target skill-building angle
This project doubles as your applied AI engineering portfolio piece for remote SWE roles — RAG pipelines, prompt engineering, structured output, caching strategy, and background job architecture are all real production patterns being practiced here, called out explicitly in each module section below.

---

# PART 2 — ARCHITECTURE

## 2.1 Layered architecture
```
┌─────────────────────────────────────────────┐
│  Presentation (React + TypeScript + Tailwind) │
│  Dashboard · Finance · Goals · Academy ·      │
│  Portfolio · Market · Advisor                 │
└───────────────┬───────────────────────────────┘
                │
┌───────────────▼───────────────────────────────┐
│  Financial Context Service                    │
│  Single source of aggregated data: income,     │
│  expenses, net worth, goal progress, portfolio │
│  value, learning progress                      │
└───────────────┬───────────────────────────────┘
                │
┌───────────────▼───────────────────────────────┐
│  AI Orchestration Layer                        │
│  Prompt templates · RAG retrieval (Qdrant) ·    │
│  Gemini calls · structured output formatting    │
│  Used by: Academy, Advisor, Portfolio, Finance, │
│  Market                                         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Background jobs — Celery + Redis             │
│  price refresh · notification triggers ·      │
│  daily dashboard cache generation              │
└─────────────────────────────────────────────────┘
```
Module-specific computation (Portfolio's gain/loss math, Goals' progress %) stays inside that module. Only cross-module aggregation and all AI logic are centralized.

Deployment shape: single FastAPI app with an isolated service layer, not microservices (see Decision, Section 14) — service boundaries enforced in code structure, not physical separation.

## 2.2 Tech stack
| Layer | Choice |
|---|---|
| Frontend | React, TypeScript, TailwindCSS, Recharts |
| Backend | FastAPI |
| Database | PostgreSQL |
| Auth | JWT |
| AI | Gemini API (free tier) |
| Vector DB | Qdrant (self-hosted via Docker — free, no storage cap) |
| Embeddings | BGE or similar |
| Background jobs | Celery + Redis |
| Market data (stocks) | yfinance (free, `.NS`/`.BO` tickers) |
| Market data (mutual funds) | MFAPI.in (free, daily NAV) |
| News | RSS feeds from financial news sources (free, no key, no quota — AI summarizes headlines, never reproduces article text) |
| Email | Resend (free tier: 3,000/month, 100/day) |

Everything above is free-tier or fully free by design — no paid API dependency anywhere in the stack.

## 2.3 Non-negotiable rules
1. AI proposes, the user decides. No AI-initiated write to financial data — not in Academy, Advisor, or the future Decision Engine.
2. One entity, one owner. Emergency Fund lives in `goals`, not duplicated in Finance. Financial aggregates live in the Financial Context Service, not recomputed per module.
3. One AI Orchestration Layer. No module implements its own prompt logic, retrieval, or model calls.
4. No cross-module hard dependencies. Market doesn't query Portfolio directly; all cross-module context flows through the Financial Context Service or AI Orchestration Layer.
5. Visual consistency — gamification limited to XP/badges/streaks/progress, no illustrative path animation, everywhere minimal/professional.
6. Don't invent modules or rename existing ones without updating this document first.
7. Every external API used must be free-tier or free — no paid dependency without an explicit decision logged in Section 14.

---

# PART 3 — DATA MODEL

## 3.1 Core (Phase 1)
- **users**: id, email, password_hash, name, created_at
- **monthly_finances**: id, user_id, year, month, income (nullable until set), currency (INR), is_locked — one record per user per calendar month
- **allocation_categories**: id, name, slug, is_system, is_others, user_id (nullable — null = global predefined)
- **spending_categories**: id, name, slug, is_system, is_others, user_id (nullable — null = global predefined)
- **monthly_allocations**: id, monthly_finance_id, category_id, amount — monthly income allocation plan (intent only, not holdings)
- **monthly_spendings**: id, monthly_finance_id, category_id, amount — monthly category spending totals (not transaction-level)
- **goals**: id, user_id, name, goal_type(general/emergency_fund), target_amount, current_amount, planned_monthly_contribution, deadline, description, status(active/archived/completed), created_at, updated_at — **single source of truth for Emergency Fund**
- **goal_contributions**: id, goal_id, amount, contributed_on, source(manual/transfer)
- **monthly_allocations**: id, monthly_finance_id, category_id (nullable), goal_id (nullable), amount — XOR: exactly one of category_id or goal_id

## 3.2 Academy (Phase 2)
- **academy_modules**: id, tier, title, order_index, prerequisite_id, color_category, is_optional — seed data, authored not user-generated
- **quiz_questions**: id, module_id, question, options(jsonb), correct_index, difficulty
- **user_academy_progress**: id, user_id, module_id, status(locked/unlocked/completed), completed_at, quiz_score, attempts
- **generated_lessons**: id, user_id, module_id, content_snapshot_hash, generated_text, generated_at — cache layer
- **user_gamification**: user_id, xp, level, current_streak, longest_streak, last_active_date
- **badges** / **user_badges**: standard join pattern

## 3.3 Invest (+ Advisor later)
Product/API/UI name: **Invest** (`/api/v1/invest`, route `/invest`). Supersedes the old single-purchase “Portfolio” row model.

- **assets**: id, asset_type(stock/mutual_fund/etf/gold/fd/ppf/nps/other), symbol(nullable), exchange(nullable), name, provider_symbol(nullable), isin(nullable), active, metadata(jsonb) — global instrument master (not user-owned)
- **portfolio_holdings**: id, user_id, asset_id(nullable FK assets), asset_type, display_name, symbol(nullable), quantity, total_invested, average_cost, valuation_mode(market/benchmark/deterministic/manual), manual_current_value(nullable), manual_value_updated_at(nullable), FD fields (principal/rate/dates/compounding), gold_unit(nullable), status(open/closed) — **aggregated position per user**
- **investment_transactions**: id, user_id, holding_id, asset_id(nullable), transaction_type(buy initially), quantity(nullable), unit_price(nullable), amount, traded_on, notes(nullable) — **each purchase is a separate lot**; never overwrite prior buys
- **price_cache**: shared latest-available quotes across users holding the same asset — populated by Celery refresh (I4); not live streaming
- **portfolio_value_snapshots** / `portfolio_snapshots` (I6): daily invested/value observations for performance history (not live streaming, not XIRR)
- **advisor_conversations** / **advisor_messages**: standard chat history pattern (Advisor phase)

Rule: Money Plan allocations are planning intent only. Invest owns actual holdings and lots. Recording an investment must not mutate Money Available, allocations, spending, or Goals.

## 3.4 Market, notifications, subscriptions (Phase 4)
- **market_news_cache**: id, headline, summary, source_url, category, published_at, fetched_at
- **notifications**: id, user_id, notif_type(streak/budget_alert/goal_deadline), message, channel(email), status, created_at
- **subscriptions**: id, user_id, plan, status, started_at, expires_at, razorpay_subscription_id — scope not finalized

## 3.5 Cross-cutting rule
The Financial Context Service owns no tables of its own — it aggregates from `monthly_finances`, `monthly_allocations`, `monthly_spendings`, `goals`, `portfolio_holdings`, `user_academy_progress` at query time. Never create a duplicate "aggregated_data" table.

---

# PART 4 — MODULES IN DEPTH

## 4.1 Dashboard
**Purpose**: answers "how am I doing financially?" Reads only from the Financial Context Service.

Six widgets, each cached daily (per `user_id, widget_id, data_snapshot_hash, date`) to avoid burning free-tier AI quota on every page load:

1. **Financial Health Score** (shield icon) — deterministic 0-100 score from savings rate, emergency fund coverage, debt-to-income ratio, goal progress; AI writes one factual sentence, temp ~0.3.
2. **Spending Trend** (trend arrow) — this month vs last month expenses by category; AI flags the biggest category change in one sentence.
3. **Portfolio Snapshot** (pie chart) — total value + today's P/L from `price_cache`; AI notes diversification only if allocation is skewed >70% into one asset type.
4. **Goal Progress** (target icon) — nearest-deadline goal, % complete, on-pace assessment; AI suggests the specific next contribution amount.
5. **Savings Rate** (piggy bank) — (income − expenses)/income this month vs the 20% benchmark; factual comparison, no judgment language.
6. **Daily Recommendation** (lightbulb) — pulls the user's next-uncompleted Academy module and connects it to their current financial snapshot; this is the widget that pulls users back into Academy from the dashboard, closing the core loop.

**Fallback rule**: if Gemini quota is hit, serve the deterministic numbers with no AI sentence rather than failing the widget.

**Endpoint**: `GET /api/dashboard` — all six widgets in one call.

---

## 4.2 Money
**Purpose**: monthly financial planning and review center — income, allocation plan, category spending, comparison, and deterministic insight signals.

**Features**:
- One monthly income amount per user per calendar month
- Income allocation plan across predefined + custom categories (must equal 100% of income to confirm)
- Simple monthly category spending totals (not transaction-level bookkeeping)
- Month-over-month comparison (income, spending, surplus, category changes, allocation changes)
- Month locking when next month's income is entered; explicit unlock with confirmation
- Deterministic insight signals (no LLM) for future AI Orchestration Layer consumption

**Rules**:
- Allocation to Mutual Funds/Stocks/Goals/Emergency Fund is **planning intent only** — does not create portfolio holdings or goal records
- Emergency Fund goal entity lives in Goals module when implemented; Money allocation is intent-only
- All monetary calculations use Decimal/Numeric — never float
- New months start empty — no auto-copy of previous month data

**Endpoints**: `GET /api/v1/money/current`, `GET /api/v1/money/months`, `GET /api/v1/money/{year}/{month}`, `POST /api/v1/money/{year}/{month}/income`, `PUT /api/v1/money/{year}/{month}/allocation`, `POST /api/v1/money/{year}/{month}/allocation/add-remaining-to-others`, `PUT /api/v1/money/{year}/{month}/spending`, `GET /api/v1/money/{year}/{month}/comparison`, `POST /api/v1/money/{year}/{month}/unlock`, `GET /api/v1/money/categories`, `POST /api/v1/money/categories`

---

## 4.3 Goals
**Purpose**: single source of truth for all target-based tracking, including Emergency Fund.

**Features**:
- Create/edit/delete goals, log contributions (`goal_contributions`)
- Progress view, deadline tracking
- AI-suggested monthly contribution to stay on pace
- Future projection (deterministic math: current pace extrapolated to deadline)

**AI suggestion prompt**:
> Goal "{goal_name}" needs ₹{remaining_amount} more by {deadline} ({months_remaining} months away). The user's average monthly savings rate is ₹{avg_monthly_savings}. Suggest a specific monthly contribution amount to hit the deadline, and state plainly whether it's feasible given their current savings rate. One paragraph, under 60 words.

**Endpoints**: CRUD `goals`; `POST /api/goals/{id}/contribute`; `GET /api/goals/{id}/projection`

---

## 4.4 Academy
**Purpose**: gamified financial literacy learning path, personalized via RAG.

**Flow**: Roadmap screen (tiered list, minimal progress-bar style, no path animation) → Lesson (concept + "for you" personalized insight) → MCQ quiz → open-ended real-life scenario (AI-graded) → pass unlocks next module, XP + streak update.

**RAG pipeline**:
1. Ingest curated source content (external sources, summarized in your own words + your own writing) per module into Qdrant, chunked ~200-400 tokens, embedded via BGE.
2. Retrieval scoped strictly to `module_id` — never search the whole knowledge base.
3. Pull user's Financial Context snapshot.
4. Check `generated_lessons` cache by `(user_id, module_id, data_snapshot_hash)` before calling Gemini.

**Lesson generation prompt**:
> You are a financial literacy teacher writing for someone with no background in {module_topic}. Using only this source material: {retrieved_chunks}, explain the concept in under 250 words, plain language, defining jargon before using it. Then, using this user's snapshot: {user_context_summary}, write a 2-3 sentence "for you" section applying the concept to their actual numbers. End with one bolded key takeaway. (temp ~0.5)

**Scenario grading prompt** (structured JSON output, temp ~0.2):
> You are grading a financial literacy exercise. The user was taught: {module_key_concepts}. Their answer: "{user_answer}". Respond ONLY in this JSON: {"understood_core_concept": bool, "reasoning_quality": "weak"|"adequate"|"strong", "feedback": "2-3 sentences", "pass": bool}. Pass if concept understood AND reasoning at least adequate. Don't penalize for omitting asset classes not covered by this module's concept.

**Why structured output matters**: never branch backend logic on parsed free text — always force JSON schema output so pass/fail is reliable. Real production pattern, not a shortcut.

**Streak logic**: a day counts as active on any module completion or lesson review (not just full passes). Increments once per IST calendar day, resets after a full missed day. Optional stretch: 1 streak-freeze per week.

**Gamification values**: 50 XP per module completion, +20 first-try bonus, +10 for "strong" reasoning quality. Badges include tier completions, 7-day streak, and combined badges (Academy completion + actual Goals/Finance action taken — the real differentiator).

**AI engineering practices applied**: scoped retrieval, snapshot-hash caching, temperature tuned per task (low for grading, moderate for generation), structured JSON for anything backend-branched on, graceful degradation (quiz still works if AI call fails — only personalization/grading depend on it), prompt versioning as prompts get iterated.

**Endpoints**: `GET /api/academy/roadmap`, `GET /api/academy/modules/{id}/lesson`, `POST /api/academy/modules/{id}/quiz`, `POST /api/academy/modules/{id}/scenario`

---

## 4.5 Invest
**Purpose**: track what the user actually owns — holdings, lots, performance — distinct from Money Plan intent.

**Features**:
- Record actual BUY lots (multi-purchase); holding aggregates quantity, total invested, weighted average cost
- Asset types: stocks, mutual funds, ETFs, gold, FD, PPF, NPS, other
- Instrument-backed buys reference global `assets` (search/universe sync later)
- FD: deterministic estimated current / maturity value (not “market price”)
- PPF/NPS/other: manual current value when no free price source
- Planned vs actual vs Money Plan (later phase); does not mutate Money
- AI diversification commentary (later, via AI Orchestration Layer only)

**Price refresh (I4 — Celery + shared `price_cache`, not live streaming)**:
- Configurable interval via `MARKET_DATA_REFRESH_MINUTES` (default 15); not a full exchange calendar in I4
- Stocks/ETFs via yfinance (`provider_symbol`), mutual funds via MFAPI.in — free sources with acknowledged limitations
- Market prices are periodically refreshed and are **not** guaranteed to be real-time
- One fetch per asset regardless of how many users hold it; Redis TTL cache in front of Postgres
- Gold: benchmark later; FD: math; PPF/NPS: manual

**AI diversification prompt** (later):
> Portfolio allocation: {allocation_breakdown}. If more than 70% is concentrated in one asset type, write one sentence flagging the concentration risk in plain language. Otherwise, write one sentence noting the diversification is reasonable. Never give buy/sell recommendations — literacy framing only, not investment advice.

**Endpoints (evolving)**: `POST /api/v1/invest/transactions` (I1); holdings/history/summary/export/asset search (I2/I3); `GET /api/v1/invest/plan` planned-vs-actual vs Money (I5). Market prices via shared `price_cache` (I4), not live on request.

---

## 4.6 Market
**Purpose**: simplified financial news, kept fully decoupled from Portfolio at the data layer.

**Features**:
- News ingestion via free RSS feeds (Economic Times Markets, Moneycontrol, or similar) — no API key, no quota limit, and copyright-safe since only headlines are stored and AI generates original summaries rather than reproducing article text
- AI summary per article
- "What does this mean for my portfolio" — answered by the AI Orchestration Layer pulling both Market content and Financial Context; Market never queries `portfolio_holdings` directly (Non-negotiable rule #4)
- Economic calendar: stretch goal, static/manual dataset acceptable if no suitable free API is found by Phase 4

**Summary prompt**:
> Summarize this news item in 2 sentences, plain language, no jargon: {rss_article_title_and_snippet}. Do not reproduce the source text — write an original summary.

**Portfolio-relevance prompt** (only triggered on user request, not automatic):
> Given this news summary: {summary}, and the user's portfolio allocation: {allocation_breakdown}, state in one sentence whether this news is relevant to their specific holdings, and why. If not relevant, say so plainly.

**Cut fallback**: if RSS/time runs short, a static mock news feed is an acceptable demo substitute — this module is lowest priority (Roadmap Section 5).

**Endpoints**: `GET /api/market/news`, `POST /api/market/news/{id}/relevance` (on-demand, not auto-run for every article)

---

## 4.7 Advisor
**Purpose**: conversational AI assistant with full Financial Context access — a UI surface on top of the same AI Orchestration Layer every other module uses, not a separate AI system.

**Features**:
- Chat interface, conversation history (`advisor_conversations`, `advisor_messages`)
- System prompt always includes the full Financial Context snapshot
- Future Financial Decision Engine: proposes plans for user-stated goals (e.g. "I want to buy a ₹2 lakh bike") using savings, goals, investments, budget, emergency fund — **never executes anything**, only proposes, per Non-negotiable rule #1

**System prompt structure**:
> You are Vestor's financial advisor. You have access to the user's full financial context: {full_context_summary}. You may reference their actual goals, portfolio, spending, and Academy progress in your answers. You must never claim to execute an action (create a goal, log a transaction, etc.) — if the user wants to do something, describe the plan and tell them to confirm it in the relevant module. {conversation_history} {user_message}

**Endpoints**: `POST /api/advisor/message`, `GET /api/advisor/conversations`

---

## 4.8 Notifications (cross-cutting, Phase 4)
- Channel: email only (Resend), no web push
- Triggers: streak-about-to-break reminder, budget threshold exceeded, goal deadline approaching
- Delivered via a Celery task, not generated synchronously in a request — a scheduled job checks conditions and enqueues sends

## 4.9 Subscription (Phase 4, scope not finalized)
- Razorpay integration for payment
- Gating scope (which features are premium) deliberately undecided until Phase 4, based on what actually feels premium once the product exists — avoid building paywalls around features that don't exist yet

---

# PART 5 — BACKGROUND JOBS (Celery + Redis)

| Task | Schedule | Purpose |
|---|---|---|
| `refresh_portfolio_prices` | every 5-15 min, market hours only | update `price_cache` via yfinance/MFAPI.in |
| `generate_dashboard_cache` | once daily per active user | pre-generate the 6 dashboard widget AI texts |
| `check_notification_triggers` | hourly | check streak/budget/goal conditions, enqueue email sends |
| `send_email` | on-demand (enqueued by above) | actual Resend API call |

Set up a working Celery worker + Redis instance early in Phase 1 (Section 6) — don't leave first real usage until Phase 3, where a deployment issue could eat time right when Portfolio is also being built.

---

# PART 6 — ROADMAP

**Current phase: Phase 0 — architecture & documentation. No code written yet.**
Timeline: full semester (4+ months).

**Priority tiers**: Must-have — Dashboard, Finance, Goals, Academy. Should-have — Portfolio, Advisor. Cut candidate — Market (static mock feed is an acceptable fallback).

- **Phase 1 (Month 1)**: Auth, schema, Celery+Redis working end to end, Financial Context Service scaffolded, Finance + Goals full CRUD, Dashboard wired to real data. Exit: a fully functional, boring finance tracker, submittable as-is.
- **Phase 2 (Month 2)**: Curriculum ingested (Tier 1-2), AI Orchestration Layer built, Academy lesson generation + quiz + scenario grading + gamification. Exit: Learn → Apply → Improve loop works end to end.
- **Phase 3 (Month 3)**: Portfolio (live pricing), Advisor, remaining Academy tiers. Exit: all must-have + should-have modules working together on shared data.
- **Phase 4 (Month 4)**: Market (or mock), Razorpay subscription, notifications, polish, deployment, project report.

Never start a later-phase module while the current phase's exit criteria are unmet.

---

# PART 7 — DECISIONS LOG

| Decision | Why |
|---|---|
| AI logic centralized in one Orchestration Layer | Prevents 5 modules each implementing their own prompts/Gemini calls |
| Emergency Fund lives in Goals only | Prevents two drifting representations of the same entity |
| Single FastAPI app, not microservices | 4-month solo build — ops overhead not worth it yet |
| Market never queries Portfolio directly | Keeps modules decoupled; AI Orchestration Layer bridges them on demand |
| Academy gamification limited to XP/badges/streaks | Visual consistency with the rest of the minimal/premium product |
| AI never writes to financial data without confirmation | Applies to Academy, Advisor, and the future Decision Engine, no exceptions |
| Subscription scope deferred to Phase 4 | Avoid building paywalls around features that don't exist yet |
| Categories: predefined + user-custom | Balance of consistent AI insight quality with flexibility |
| INR only, single-user isolated profiles | Matches actual target user, avoids unneeded complexity |
| Portfolio prices: periodic refresh, not real-time streaming | Free APIs are pull-based; true streaming needs a paid broker API |
| Web only for now, mobile deferred | Focus effort on one platform before considering a port |
| Celery + Redis for background jobs | Industry-standard, chosen deliberately over simpler in-process scheduling despite more setup |
| Email via Resend, no web push | Free tier, better deliverability than raw SMTP, avoids PWA complexity |
| Academy scenario test is open-ended, AI-graded | More realistic LLM engineering practice than multiple-choice |
| Every external API must be free-tier | No paid dependency anywhere in the stack by design |

---

# PART 8 — CURRENT STATUS
- Milestone: architecture & documentation complete, no code written
- Next immediate step: Phase 1 — auth, schema migrations, Celery+Redis setup, Finance + Goals CRUD
