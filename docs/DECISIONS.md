# DECISIONS.md — Vestor

Log every architecturally significant decision here — one entry, short. The point isn't documentation for its own sake: it's so nobody (agent or future-you) re-litigates or silently reverses a decision without knowing why it was made.

Format: **Decision** / **Why** / **Date or phase**

---

### AI logic centralized into one AI Orchestration Layer
**Why**: Original module list implied each of Academy, Advisor, Portfolio, Finance, and Market would independently call Gemini and build their own prompts — duplicated logic, inconsistent behavior, and a nightmare to swap models later. One shared layer, all modules call into it.
**Phase**: 0

### Emergency Fund lives in Goals, not duplicated in Finance
**Why**: Original design had Emergency Fund as both a Finance line item and a Goals example — two representations of the same thing risk drifting out of sync. Finance reads/contributes to the Emergency Fund goal; it doesn't own a separate record.
**Phase**: 0

### Single FastAPI app with an isolated service layer, not microservices
**Why**: 4-month solo/small-team build. Microservices add deployment and ops overhead with no payoff at this scale. Service boundaries (Financial Context Service, AI Orchestration Layer) are enforced in code structure, not physical service separation. Can split later if it ever needs to scale.
**Phase**: 0

### Market module does not directly query Portfolio
**Why**: Keeps modules decoupled. "What does this news mean for my portfolio" is answered by the AI Orchestration Layer pulling both Market and Financial Context as needed, rather than a hardcoded Market→Portfolio dependency.
**Phase**: 0

### Academy gamification limited to XP/badges/streaks/progress — no illustrative path animation
**Why**: Vestor is positioned as a production SaaS product (minimal/professional/premium). A Duolingo-style animated path in one module while the rest of the app is a clean fintech dashboard breaks visual consistency and reads as inconsistent to evaluators.
**Phase**: 0

### AI never writes to financial data without explicit user confirmation
**Why**: Applies to Academy (lesson-suggested goal creation), Advisor (recommended plans), and the future Financial Decision Engine. Prevents AI overreach and keeps the user in control of every financial change, no exceptions.
**Phase**: 0

### Subscription/monetization added last (Phase 4), not built into core flows early
**Why**: Core product must work end-to-end before gating anything behind payment — building monetization first risks time spent on paywalls around features that don't exist yet.
**Phase**: 0

### Finance module replaced by Money module (monthly planning model)
**Why**: Transaction-level bookkeeping (transactions, budgets, debts) does not match the approved product behavior. Money uses a monthly cycle: one income amount, allocation plan, category spending totals, month locking, and deterministic insight signals. Supersedes the transaction-centric Finance design in earlier docs.
**Phase**: 1

### Money allocation is planning intent, not actual holdings or goals
**Why**: Allocating to Mutual Funds, Stocks, Goals, or Emergency Fund in Money records monthly intent only. Actual holdings belong to Invest/Portfolio; goal definitions and progress belong to Goals. Keeps module boundaries clean for the future Financial Context Service.
**Phase**: 1

### Emergency Fund allocation in Money is intent-only; Goals owns the EF goal record
**Why**: Money may include an Emergency Fund allocation category for monthly planning. The authoritative Emergency Fund goal entity and progress tracking remain in Goals (when implemented). Money does not duplicate goal state.
**Phase**: 1

### Money Plan goal allocations use XOR linkage on monthly_allocations
**Why**: Each allocation row is either a normal category line (`category_id`) or a goal line (`goal_id`), never both. Named goals (e.g. MacBook) appear as linked plan lines without duplicating goal names as unrelated categories. Enforced via DB check constraint.
**Phase**: 1

### Planned Money allocation ≠ actual goal contribution
**Why**: Money Plan records monthly intent; `goal_contributions` records actual money applied toward a goal and updates `current_amount`. Prevents treating budget intent as saved progress.
**Phase**: 1

### Goal-linked Money Plan allocations drive Goal accumulated progress
**Why**: Goal-linked `monthly_allocations.goal_id` rows are the authoritative monthly commitment toward that goal. API `current_amount` is computed as stored opening/manual amount (`goals.current_amount`, updated by `goal_contributions`) **plus** SUM of linked plan allocations — never counting the same event twice. Updating or removing a month’s allocation immediately changes Goal progress on read.
**Phase**: 1

### Archived goals leave current unlocked Money Plan immediately
**Why**: Archiving removes the goal allocation from the current unlocked month and stops empty option lines; locked/historical months retain goal-linked rows for reporting.
**Phase**: 1

### Goal pace status uses deterministic ±5% band
**Why**: Ahead/On track/Behind compares planned monthly contribution to required monthly contribution with a 5% tolerance — no LLM, reproducible for tests and future Financial Context Service.
**Phase**: 1

### Emergency Fund Money category hidden when EF goal exists
**Why**: When user has an active `emergency_fund` goal, Money Plan uses the goal-linked line as the single EF destination; system `emergency-fund` category is excluded from active plan options to avoid duplicate destinations.
**Phase**: 1

### D1 — Invest is the next implementation module (before full Financial Context Service)
**Why**: Money and Goals are complete; Invest owns actual holdings and is required for the plan-vs-actual distinction. A thin FCS can consume Invest later; building Invest first avoids blocking portfolio tracking on cross-module aggregation that does not exist yet.
**Phase**: 1 (Invest I0)

### D2 — Product/API/UI terminology is Invest
**Why**: Route is `/invest`, API prefix `/api/v1/invest`, frontend feature namespace `features/invest`. Docs previously said “Portfolio”; product language is Invest. Placeholder `PortfolioPage` may later rename to `InvestPage` without changing the public route.
**Phase**: 1 (Invest I0)

### D3 — Holdings aggregate lots; purchases are investment_transactions
**Why**: The old single-purchase Portfolio schema cannot represent multiple buys of the same instrument. A holding is the aggregated position; each purchase is a separate transaction/lot so average cost and history stay correct.
**Phase**: 1 (Invest I0)

### D4 — Money Plan ↔ Invest planned-vs-actual mapping is deferred
**Why**: Mapping will live in a dedicated service in a later Invest phase. I1 records actual investments only and must not integrate or mutate Money Plan data.
**Phase**: 1 (Invest I0)

### D5 — Celery Beat required later for market-data refresh; not configured in I1
**Why**: Shared price refresh needs a scheduler, but I1 has no market providers. Beat stays out of scope until price-cache work.
**Phase**: 1 (Invest I0)

### D6 — Portfolio performance history will use daily snapshots later
**Why**: Reliable charts without treating free quote APIs as a historical warehouse. Snapshots are not created in I1.
**Phase**: 1 (Invest I0)

### D7 — XIRR is deferred
**Why**: Simple invested/value return is enough for I1. Transaction dates and amounts remain so money-weighted return can be added without schema redesign.
**Phase**: 1 (Invest I0)

### D8 — Today’s change is deferred
**Why**: Requires prior-day pricing or snapshots. Hidden/unavailable until that exists.
**Phase**: 1 (Invest I0)

### D9 — Recording an investment does not reduce Money Available
**Why**: Money Plan is intent/commitment, not a cash ledger. Invest owns actual ownership. Mutating Money Available on buy would double-count and blur module boundaries.
**Phase**: 1 (Invest I0)

### D10 — I1 supports BUY transactions only
**Why**: Sells/redemptions need quantity reduction and lot handling; defer to keep I1 focused on recording and aggregating purchases.
**Phase**: 1 (Invest I0)

### I3 — Invest asset master uses a versioned JSON universe seed
**Why**: Search needs real instrument identity without live market API calls. A curated, version-controlled JSON file (`invest_assets_universe_v1.json`) is maintainable and replaceable by a later sync job. Not a complete Indian market listing.
**Phase**: 1 (Invest I3)

### I4 — Market data uses provider adapters; prices are not real-time
**Why**: Invest valuation must never call yfinance/MFAPI from services or the frontend. A `MarketDataProvider` abstraction isolates adapters; PostgreSQL `price_cache` is source of latest known price; Redis is a TTL performance cache; Celery Beat refreshes periodically. Market prices are periodically refreshed and are not guaranteed to be real-time.
**Phase**: 1 (Invest I4)

### I4 — ETFs reuse the stock (yfinance) provider
**Why**: Seeded ETFs use NSE ticker-style `provider_symbol` (e.g. `NIFTYBEES.NS`), the same identifier shape as stocks. A separate ETF provider would duplicate work without benefit in I4.
**Phase**: 1 (Invest I4)

### I4 — Invest HTTP reads never call market providers
**Why**: Portfolio pages must not hammer free quote APIs. Request path reads Redis → Postgres only; Celery refresh (and explicit refresh tasks) perform provider fetches.
**Phase**: 1 (Invest I4)

### I5 — Money↔Invest planned-vs-actual uses explicit slug→asset_type mapping
**Why**: Money already has `semantic_type=investment` on system Stocks / Mutual Funds. I5 only compares categories with an explicit slug map (`stocks`→`stock`, `mutual-funds`→`mutual_fund`). No FK between `monthly_allocations` and `investment_transactions`. No ETF Money category exists yet, so ETF buys are not silently attributed. Goal-linked allocations stay in Goals.
**Phase**: 1 (Invest I5)

### I6 — Daily portfolio snapshots; skip empty portfolios; no XIRR yet
**Why**: Performance history needs durable daily observations of Invest valuation using I4 latest-available prices. One row per `(user_id, snapshot_date)` with upsert. No open holdings → no snapshot (avoid fake ₹0 history). Incomplete valuation keeps null totals (same as summary). XIRR / money-weighted return remains deferred; snapshots do not reconstruct past market prices.
**Phase**: 1 (Invest I6)

---

## Template for new entries
```
### <short decision title>
**Why**: <the reasoning, one or two sentences>
**Phase**: <roadmap phase this was decided in>
```
