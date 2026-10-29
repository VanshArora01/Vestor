# VESTOR â€” CURRENT STATE

Last Updated: 2026-10-29 (Paper Trading Complete)

## Current Phase

Phase 3 â€” Vestor AI Personal Finance Intelligence Experience

## Current Milestone

**Paper Trading Complete (Official NSE/BSE Instrument Catalogs + Persisted Virtual Trading + Provider-Backed Charts).**

## Overall Status

**INVEST, PAPER TRADING, VESTOR AI, AND LEARN 2.0 (INTERACTIVE ACADEMY) MODULES COMPLETE**

- [x] Repository structure (frontend + backend)
- [x] FastAPI backend skeleton (/api/v1)
- [x] PostgreSQL (Neon) via SQLAlchemy; Alembic 11_create_academy_tables
- [x] JWT auth, Money, Goals
- [x] Invest I1–I6 backend
- [x] Invest I7 frontend — premium portfolio dashboard
- [x] Paper Trading: user-scoped virtual accounts, cash ledger, idempotent orders, positions, watchlist, and history
- [x] Paper Trading: official NSE EQ and BSE active EQ security master sync; NIFTY 50 and SENSEX references
- [x] Paper Trading: yfinance quote refresh and OHLCV chart API, authenticated `/paper-trading` page and navigation
- [x] Banking B0 — Setu sandbox foundation
- [x] Banking B1 — Setu AA Consent + Bank Linking
- [x] Vestor AI: Global Floating Assistant on all authenticated pages
- [x] Vestor AI: Page-Aware Context System across Dashboard, Money, Accounts, Goals, Invest, Learn
- [x] Vestor AI: Full-Screen Workspace at /ai
- [x] Vestor AI: Verified read-only financial tools
- [x] Vestor Learn 2.0: Interactive Level-based Academy Platform with Winding SVG Road Map
- [x] Vestor Learn 2.0: Framer Motion-animated geometric guide character ("Aisha")
- [x] Vestor Learn 2.0: 8-Step Interactive Flagship 50/30/20 Lesson Engine
- [x] Vestor Learn 2.0: Persistent Academy tables & idempotent XP lifecycle (	est_academy_api.py 1 passed)
- [x] Vestor AI: Page-Aware Context System across Dashboard, Money, Accounts, Goals, Invest, Learn
- [x] Vestor AI: Full-Screen Workspace at `/ai`
- [x] Vestor AI: Verified read-only financial tools (`get_financial_overview`, `get_monthly_summary`, `get_spending_breakdown`, `get_transactions`, `get_savings_goals`, `get_account_details`, `get_portfolio_summary`, `get_financial_education`)

## Completed

### Vestor STEP 1 OF 3 â€” MONEY CORE FINANCIAL MODEL + AVAILABLE TO PLAN
**Original implementation** (prior session):
- Created Alembic migration `f2efbd582631`: `opening_balance` on `connected_accounts`, `manual_income_adjustment` + `carryover` on `monthly_finances`, `income_patterns` table.
- `ConnectedAccount` opening balance frozen strictly on account creation/linking; sync never overwrites it.
- `IncomePattern` narration-match logic with 20% amount tolerance for auto-confirming repeat salary credits.
- Locked-month carryover snapshot written to next month on lock.
- `is_history_incomplete` mid-month connection warning flag.
- `tests/test_money_step1.py` covering all 17 scenarios.

**STEP 1 Fixes** (this session â€” root causes traced, not patched):

1. **Fresh-user data leakage (root cause fixed):**
   - `MoneyRepository.replace_allocations` was auto-creating `Goal` rows (Emergency Fund, Savings) for any user who allocated to those categories. Removed entirely. Goals are only created via the explicit Goals API.
   - Verified all `MonthlyFinance`, `MonthlyAllocation`, `MonthlySpending` queries already filter by `user_id`. `GoalsRepository.list_goals` also correctly scopes by `user_id`.

2. **Canonical carryover formula (corrected):**
   - `MoneyService._get_carryover` now: (a) reads the frozen snapshot from `current_month.carryover` if set (written by `lock_month_service`), (b) only falls back to dynamic `prev_ATP - prev_allocated` when no snapshot exists yet. The previous implementation checked `prev_record.is_locked` but then fell through to dynamic recomputation for unlocked months with the snapshot not being used as primary source.

3. **Spending/allocation separation (architecture contract enforced):**
   - `_validate_budget_within_income`: removed the `allocated + spending > ATP` combined check. Only allocations are validated against ATP. Spending is actual and is tracked separately.
   - `build_month_metrics` in `money_calculations.py`: added contract-level docstring clarifying ATP = carryover + income; spending never reduces ATP. Logic was already correct but is now documented.
   - `lock_month_service`: carryover = ATP - allocated (spending intentionally excluded); docstring added.

3. **New regression test suites added:**
   - `tests/test_fresh_user.py` â€” 7 tests: zero income, zero ATP, no allocations, no goals, no spending, zero carryover, EF category allocation â‰  goal creation.
   - `tests/test_carryover_correctness.py` â€” 5 tests: positive carryover, zero carryover, spending doesn't reduce carryover, negative carryover propagation, frozen snapshot after lock.
   - `tests/test_user_isolation.py` â€” 6 tests: income isolation, allocation isolation, goals isolation, spending isolation, carryover isolation, independent plans for two users.
   - All 10 tests that ran before cancellation: **PASSED**. No failures observed.


### Money Plan Reconciliation B4 (prior)

- Added `account_purpose` column to `bank_transactions` and `bank_transaction_id` column to `goal_contributions`.
- Modified transaction normalization to snapshot connected account purpose context at transaction time, preserving history.
- Implemented `MoneyReconciliationService` to compare planned goals, allocations, and spending categories against actual verified transactions.
- Excluded unclassified expenses from planned spending slots and unresolved investments from stocks/mutual-funds buckets.
- Exposed protected reconciliation API endpoint: `GET /api/v1/money/reconciliation/{year}/{month}`.
- Updated `MoneyPlanPanel` and `SpendingPanel` UI to show Planned vs Actual vs Remaining columns and verified provenance indicators.

### Goals G1, Banking B3, and UI Sync C1 (prior)

- Added optional `linked_account_id` mappings to goals and contributions, validating user-owned accounts.
- Implemented dynamically calculated account earmarking without double counting assets or conflating earmarks with goal progress.
- Created `earmarked_for_goals` summary, unallocated balances, and over-allocation warnings in Connected Accounts UI.
- Implemented conservative deterministic transaction classification (Salary -> Income, Broker -> Investment, Swiggy/Amazon -> Expense, others remain Unclassified).
- Added multi-signal deterministic Transfer Matching on synced transactions.
- Added `PATCH /banking/transactions/{id}/classification` endpoint for manual corrections with status `USER_CORRECTED` and source `USER`.
- Switched purpose editing mutations to TanStack Query optimistic caching updates, rollbacks on error, and alert toasts without page reload.

### Banking B1 (prior)

- Added `FinancialConnection` and `FinancialConsent` database models.
- Updated `SetuClient` with `create_consent` API wrapper.
- Implemented `BankingRepository` and `BankingService` for consent lifecycle and idempotent webhook handling.
- Added `POST /api/v1/banking/connect`, `GET /api/v1/banking/consents/{id}`, and `POST /api/integrations/setu/webhook`.
- Created frontend `Connect Bank` UI on dashboard header.
- Added `/banking/connect/callback` frontend page for redirect loop handling.
- Fixed cross-module actual-balance aggregation with reusable `FinancialContextService`, aggregate endpoint, and frontend/dashboard integration with clean fallback logic and double-counting prevention.


### Invest I7 (prior)

Complete Invest frontend at `/invest` (legacy `/portfolio` redirects here).

**Page composition**
- Header â€” title, subtitle, Export, Add Investment
- Portfolio hero â€” value, gain/return, invested, current value, market-data freshness / stale / incomplete valuation
- Performance â€” Recharts area chart from `GET /invest/performance`; range tabs only when enough snapshot history exists (no fabricated history)
- Allocation â€” donut by asset type (design-system teal/slate palette)
- This month â€” I5 planned-vs-actual with month navigator (Money pattern), progress, over-plan messaging, CTAs to Money / Add Investment
- Holdings â€” desktop list/table hybrid + mobile cards; detail drawer with lots
- History tab â€” filters + backend CSV export
- Empty portfolio â€” premium empty state (no fake â‚¹0 dashboard)
- Loading skeletons; section-level error/retry for performance, plan, history

**Add Investment flow**
- Multi-step dialog: type â†’ asset search â†’ details â†’ review
- Types: stock, mutual_fund, etf, gold, fd, other (backend schema)
- Asset search via `GET /invest/assets/search`
- Creates via `POST /invest/transactions`; invalidates Invest queries; toast confirmation

**API client** (`frontend/src/api/invest.ts`)
- summary, holdings, holding detail, history, export, assets/search, plan, performance, create transaction

**Data fetching**
- TanStack Query; separate queries so plan/history/performance failures do not blank the whole page

**Formatting**
- Indian INR (`en-IN`), signed gain/percent, stale price copy without alarm styling

### Invest I6â€“I1 (prior)

Daily snapshots, planned-vs-actual, market data, asset master, reads, BUY accounting â€” unchanged. No backend redesign in I7.

## Frontend structure

```text
frontend/src/
  api/invest.ts
  types/invest.ts
  pages/invest/InvestPage.tsx
  pages/portfolio/PortfolioPage.tsx   # re-exports InvestPage
  features/invest/
    hooks/useInvest.ts
    utils/format.ts
    components/
      InvestHeader, PortfolioHero, PerformanceChart, AllocationChart,
      InvestmentPlanSection, HoldingsList, HoldingDetailDrawer,
      AddInvestmentDialog, InvestmentHistory, EmptyPortfolio, InvestPageSkeleton
```

## Testing / Verification

```text
cd frontend && npx tsc --noEmit && npm run build
cd backend && pytest -q   # 148 passed
```

- Frontend TypeScript â€” pass
- Frontend production build â€” pass
- Backend full suite â€” 148 passed
- Live API smoke (empty summary â†’ asset search â†’ BUY â†’ plan actual â†’ CSV export) â€” pass
- Dev servers: Vite + uvicorn verified responding

## Known Issues / Limitations

- Performance chart needs â‰¥2 daily snapshots (Celery I6); short history shows â€œNot enough history yetâ€ and only offers ranges the data supports
- ETF buys are not attributed to Money Stocks/MF plan categories (I5 mapping)
- No SELL, XIRR, tax, AI advice, or additional market providers (intentionally out of scope)
- Market values use cached prices (fresh/stale/unavailable) â€” not live ticks

## Vestor AI Repair & Viewport Redesign (Current Session)

- **Root Cause of `Not Found` (404) Repaired**:
  - A detached zombie Python worker (`PID 16160`) from an earlier session was binding port 8000 on Windows. Incoming requests were intercepted before hitting the latest Uvicorn server, returning Starlette's default 404 for `/api/v1/advisor/messages`.
  - Terminated zombie process, restarted clean Uvicorn server with all `/api/v1/advisor` endpoints active and registered.
  - Corrected Groq fallback model from nonexistent `llama-3.3-70b-versatile` to `openai/gpt-oss-120b` (supported in current Groq environment) in both `.env` and `app/core/config.py`.
- **Viewport & Space Efficiency Redesign**:
  - `AdvisorPage.tsx` converted from arbitrary height to clean viewport-contained `h-[calc(100dvh-5.5rem)] sm:h-[calc(100vh-6.5rem)]` without window-level scroll bouncing.
  - Sidebar reduced from bulky 320px (`w-80`) to compact `w-64`, with mobile drawer toggle on narrow screens.
  - Replaced oversized welcome banner and four 200px cards with clean, compact 6-card grid with concise supporting copy.
  - Compact `MessageBubble` styling with reduced vertical padding, tighter user bubbles (`max-w-[80%]`), and streamlined assistant response cards.
  - Clean floating assistant dimensions (`w-[350px]`, `h-[480px]`, `z-40`) preventing control overlap.
- **Verification**:
  - Query "What is my total verified connected cash?" verified end-to-end: executes `get_financial_overview`, inspects user's linked accounts, correctly reports verified connected cash without inventing data.
  - `pytest -q tests/test_advisor_api.py` (6/6 tests passed).
  - `npm run build` (Clean production build in 2.39s, 0 errors).

## Vestor Learn 2.0 â€” In Progress

### Learn 2.0 â€” Lesson Data + World Map (Current Session)

- Created `frontend/src/features/learn/data/lessons-v2/budgeting-50-30-20.ts`
  - Inline TypeScript interfaces for all 8 step types: `StoryCardStep`, `PredictSliderStep`, `SortBucketsStep`, `BudgetBuilderStep`, `ScenarioBranchStep`, `MatchPairsStep`, `SpotTheMistakeStep`, `MiniSimStep`
  - `LessonV2` interface exported
  - `BUDGETING_50_30_20_LESSON` constant â€” 8 steps, totalXp: 155
  - `LESSONS_V2` array exported
- Created `frontend/src/features/learn/components/WorldMap.tsx`
  - `WorldMapNode` + `WorldMapProps` interfaces
  - SVG viewBox 400Ã—600, zigzag cubic-bezier snake path
  - Dual-layer road: dashed gray (ahead) / solid teal (completed)
  - Node variants: completed (teal + checkmark), current (pulse animation), available (white/teal border), locked (gray + lock)
  - Boss node: star shape in teal/amber
  - XP badges per node
  - Keyboard accessible (Tab/Enter/Space)
  - Hover tooltip for locked nodes
  - `BUDGETING_WORLD_NODES` preset exported
  - No new TypeScript errors introduced; all pre-existing errors unchanged

---

## Next Milestone

Do **not** start another Invest backend milestone.

Next product work belongs elsewhere (per ROADMAP) â€” e.g. Academy / Market / Advisor when those phases begin.

## Paper Trading (2026-10-29)

- Added authenticated `/api/v1/paper-trading` endpoints and the separate `/paper-trading` React route/navigation item. Paper data is user-scoped and isolated from bank accounts and real Invest holdings.
- Added PostgreSQL models and Alembic revision `012_paper_trading` for virtual accounts, positions, orders, cash ledger entries, and watchlists. Orders use decimal amounts, account-row locking, and per-account idempotency keys; repeated buys, partial sells, and weighted cost basis are supported. The simulator applies zero charges and zero slippage, shown in the ticket.
- Added a catalog sync command: from `backend`, run `python -m scripts.sync_nse_equity_master`. It loads NSE EQ listings from NSE's official equity master and active BSE EQ listings from BSE's official `SCRIP.ZIP` archive. The catalog now contains 2,368 NSE and 6,087 BSE equities. BSE scrip codes are retained as the unique sync identifiers because symbols and ISINs may repeat. Repeated syncs avoid rewriting unchanged rows.
- Added NIFTY 50 and SENSEX catalog references. Search covers exchange, symbol, company name, and ISIN; cached fresh price snapshots drive movers, with their ranked universe disclosed.
- Added provider OHLCV history via the existing yfinance adapter and TradingView Lightweight Charts with public attribution. Price/chart timestamps and unavailable/stale states are surfaced; no sample candles or fabricated prices are used. Quotes refresh for the selected instrument and active holdings/watchlist, not the full catalog.
- Verification: `python -m pytest tests/test_paper_trading.py -q` (3 passed); provider quote parsing test passed; backend `compileall` passed; frontend `npm run build` passed. Instrument search and candle retrieval were API-tested with provider candles mocked; virtual buy/sell, idempotency, cash/position math, and persistence across API requests were tested against the configured Neon test database.
- Limitations: yfinance data can be delayed or unavailable. Market hours are indicative and do not include holidays. BSE master supplies exchange symbols and scrip codes; yfinance may not provide quote/history coverage for every listing. Paper fills require a fresh cached quote; refresh it from the selected instrument's quote button.

## Do Not Touch Yet (Invest)

AI investment advisor, RAG recommendations, XIRR, tax engine, sell transactions, new market providers, new portfolio analytics beyond I1â€“I7.

## Transaction History & Monthly Review (2026-10-29)

- Added a user-scoped all-connected-account transaction history endpoint and embedded monthly history on the Transactions/Money page.
- Added a one-click, explicitly user-triggered month review that matches recognized expenses to existing spending categories, plus per-transaction category prompts for unclassified items.
- Confirmed income continues to use existing user-confirmed bank-credit aggregation; no synthetic transaction or automatic financial allocation is created. Available-to-plan funds remain under the user's control for goal allocation.
- Verification is currently blocked by the local shell's OneDrive junction access error (`EPERM` resolving `C:\Users\vansh\OneDrive`); bundled Python runtime does not include pytest.

### October demo monthly transaction analysis update (2026-10-29)

- Fixed the existing Review & Categorize Month action: it now calls authenticated `POST /api/v1/banking/transactions/analyze-month` for the selected month, shows progress/failure/success, and refreshes transaction and Money queries.
- The endpoint uses the existing `ClassificationService`, scopes records to the authenticated user/month, persists deterministic classifications, and preserves user-confirmed/corrected rows. Salary remains system-classified until the existing explicit user confirmation flow is used. Transfers and investments retain their distinct classifications.
- Added `backend/scripts/seed_october_transactions.py`, repeatable and restricted to the `demo@vestor.ai` simulated connection/account. It seeds 31 persistent `DEMO` records for October 2026; ₹1,00,000 salary, ₹60,000 ordinary debits and ₹1,000 in two unresolved debits. It does not change bank balances or create Setu records.
- Seed command from `backend`: `$env:PYTHONPATH='.'; .\venv\Scripts\python.exe scripts\seed_october_transactions.py`. First run inserted 31 records; repeat run reported 0 inserted and 31 already present.
- Verification: backend classifier tests 2 passed; backend files compile; frontend production build and TypeScript check pass. Browser click-through, category confirmation, and live Money-page verification were not completed in this session.

### Monthly review and actual cash overview completion pass (2026-10-29)

- Tightened `POST /banking/transactions/analyze-month`: account filters now verify ownership; totals only count confidently classified ordinary expenses; unconfirmed income is excluded from remaining cash; investment and transfer activity are reported separately; opening cash and transaction-derived end cash are returned separately; demo provenance is explicit.
- Category totals map deterministic classifier labels to the user's existing spending categories where a known alias exists, while retaining original labels when no supported category exists.
- The manual category endpoint rejects invalid/incompatible classification directions. User decisions remain protected on repeat analysis.
- Transaction review preselects recognized category suggestions, includes an existing transaction category in choices when absent from the category catalog, persists through the classification endpoint, and invalidates transaction/Money/account queries. “Not Salary” is now an explicit “Other income” confirmation, preventing repeat prompts.
- The transaction section now shows backend-driven confirmed income, ordinary actual spending, cash movement, opening-balance-adjusted transaction cash, categorized totals/counts, and separate investment/transfer activity. Simulated vs connected provenance is labeled. Result entrance uses existing Framer Motion and honors reduced-motion preferences.
- Kept MonthlySpending plans/manual actuals separate from transaction-derived analysis totals; analysis does not overwrite user-entered actuals or plans. Goal allocation continues through the explicit existing Money plan workflow and does not create bank transfers.
- Verification: `frontend/npm run build` passes (TypeScript + production build); `backend` Python compilation passes; focused `tests/test_g1_b3.py -k classification` passes (1 passed). Full grouped backend test run was stopped because the test configuration used remote Neon and stalled; browser click-through was blocked because Computer Use could not confidently determine Brave's current URL. Git status/diff unavailable because this provided Vestor folder has no `.git` directory.

### Month review to Money panels and collapsible history (2026-10-29)

- Updated the existing month analysis operation to persist confirmed bank income and bank-classified ordinary spending to the selected, editable month through `MoneyService`. Spending writes merge classified transaction totals by existing spending category and preserve manual actual categories without a matching transaction. Locked months are not overwritten.
- Money Plan allocations remain user-planned intent. Review updates the confirmed income/Available to Plan model but does not fabricate category allocations, goal contributions, or bank transfers; remaining funds remain available for the user to allocate.
- Transaction history is collapsed by default, with an accessible toggle; starting review expands the list. Counts, account selection, and Review action remain available in the header.
- The success message confirms that income and actual category totals were saved, and distinguishes them from plan allocations.


### Transaction review, simulated source isolation, and plan preview (2026-10-29)

- Connected transaction queries now exclude DEMO provenance and the `Vestor Simulated Bank` account by default. Explicit account queries verify ownership and source match. The prepared profile returns 4 genuine transactions across its two real accounts and 18 transactions from the selected simulated account.
- Genuine aggregate balances exclude the simulated account. The aggregate endpoint includes genuine accounts only.
- Repeated October analysis for `the prepared presentation profile` returns ₹1,00,000 confirmed income, ₹60,000 categorized ordinary debits, ₹0 unresolved, ₹60,000 total recorded ordinary debits, and ₹40,000 cash remaining with ₹0 opening balance. The two originally ambiguous debits (₹2,000 and ₹3,000) are now persisted as user-corrected Education transactions. Their saved decisions are preserved, so the current result is ₹60,000 categorized and ₹0 uncategorized rather than reverting them to the original 55/5 split.
- The simulated analysis response includes a read-only Money Plan preview computed with the existing `build_month_metrics` formula. For the prepared month it reports ₹0 carryover + ₹1,00,000 confirmed income = ₹1,00,000 available to plan and ₹1,00,000 unallocated. It does not write simulated income, spending, allocations, or goal contributions into the live plan. Genuine plan/account totals remain isolated.
- The page uses the returned preview and transaction summary after review. Its spending breakdown is based on the selected transactions and totals ₹60,000; grocery transactions resolve to the existing Food category. The top summary shows income, actual spending, and cash remaining once. Transaction history is collapsed by default and has an accessible show/hide control; expanding/collapsing does not invoke analysis.
- Repeat review left 18 simulated rows in place and retained all 3 `USER_CORRECTED` classifications (salary plus the two Education decisions). Connected account rows remained outside the simulated history. The live Money endpoint continues to report its separate connected/manual actual ledger, unchanged by simulated review.
- Verification: `npm run build` passes; changed backend modules pass `py_compile`; 7 focused Money calculation/income tests pass. Live TestClient checks verified connected/simulated source counts, per-account filters, aggregate balance isolation, repeat analysis totals, category totals, and the plan preview. Browser accessibility inspection confirmed the collapsed default and account selector options. The final browser click-through was stopped when Computer Use received the user's Escape key, so the review-button interaction was verified through the live API rather than a final browser click.
- Additional allocation verification: `pytest -q tests/test_money_api.py tests/test_goals_money_sync.py -k 'allocation or remaining_to_others or money_available'` passed (9 passed, 13 deselected). Two stale fixtures were updated to avoid the unsupported direct Goals-category allocation; goal allocation remains through explicit goal IDs.

### Money page redesign (2026-10-29)

- Reworked the shared app shell for a full-bleed layout with a fixed sidebar, compact page-title bar, Vestor wordmark, and Money navigation label. The Money page now uses the existing FinAI palette and a 1200px content width.
- Replaced the KPI/equation layout with an Available to Plan hero, plan-vs-actual and spending panels, and a transactions section. Added a precise 50/30/20 plan draft that saves only after approval; simulated plan previews remain read-only.
- The transaction list now shows the latest eight by date, stays collapsible, and opens a searchable/filterable Sheet for all rows. Review and recategorization still use the existing API calls. The payee checkbox remembers a suggestion for matching rows in the current list; persistent expense payee rules are not supported by the existing API.
- `docs/DEMO_SPEC.md` was not present in this checkout. Verification: `frontend/npx tsc --noEmit` passes. No screenshots or full test runs were performed.

### Money analysis action and refresh restoration (2026-10-29)

- Restored **Analyse Transactions & Update Spending** in the existing Spending card. It runs the existing monthly analysis endpoint for the selected month/account even when no transactions are pending, then refreshes transaction, Money, and account queries. Loading, error, and completion feedback are visible.
- Unconfirmed income rows now expose an explicit **Confirm income** action in the existing recategorization control.
- The zero-metric path was the missing analysis trigger: the prior `Review (N)` action disappeared when every row was already classified, so the transaction-derived summary was never recalculated. Connected monthly actuals and confirmed income continue to feed the existing Money API formula after reconciliation.
- After an explicit analysis, the selected account and month are retained in the URL and the same idempotent workflow rebuilds its summary on refresh from persisted transaction classifications. Simulated activity remains a read-only preview and does not write to the genuine monthly ledger; plan allocations remain separate from actual spending.
- Added a focused banking API regression for selected simulated/live account isolation, classifier-driven category totals, transfers and unknown debits, connected actual-spending persistence, and repeat-analysis idempotence. The focused test passed. Frontend `tsc --noEmit` still reports two unrelated existing Invest errors (`refreshInvestPrices` and missing `onRefresh`); it reports no errors in the changed Money files.
- Live persisted demo verification: October 2026 returned 18 simulated rows, ₹1,00,000 confirmed income, ₹60,000 ordinary spending, ₹40,000 cash remaining, and 9 category totals. A second analysis returned the same summary; transaction count stayed 18 and the Money ledger response was unchanged. No genuine account rows were analyzed.
- `frontend/npx vite build` passes. No screenshots or full test suite were run.

### Selected-account income confirmation and manual fallback (2026-10-29)

- The Money hero now receives unconfirmed income candidates from the same month/account transaction query as the history, including the simulated source. Selecting the simulated account automatically reruns the idempotent monthly analysis and keeps the source-specific preview in sync.
- Corrected the existing “Other income” confirmation path: it now confirms the credit as income with the `Other income` category instead of sending it as an expense. Income confirmation refreshes transactions, Money, and account queries, then recomputes the selected-source summary.
- When no income candidate exists, the hero offers manual income entry through the existing income or manual-adjustment API, depending on account connection state. Pending income no longer displays a misleading negative “left after spending” amount before the user confirms it.

### Money page blank-screen resilience (2026-10-29)

- Added a Money-route render error boundary so an unexpected component/API-shape error no longer removes the entire page and leaves the grey app shell. It logs the render exception and shows a reload action.
- Normalized optional account, transaction, monthly spending/allocation, and analysis category lists before rendering; account labels tolerate a missing masked-number suffix.
- Verified the Vite production build and loaded the Money route with a local headless browser against empty and incomplete API fixtures; no render exceptions occurred. `tsc --noEmit` remains blocked only by the existing Invest errors (`refreshInvestPrices`, missing `onRefresh`). The live signed-in browser’s original exception could not be inspected, so the boundary preserves a visible recovery path if a different user-specific render error remains.

### Money page chart render-loop fix (2026-10-29)

- Diagnosed the live blank page as a Recharts `ReportChartProps` maximum-update-depth crash in the spending donut, which caused the Money route error boundary to replace the whole page.
- Replaced the Recharts donut with a small native SVG chart while preserving category highlighting, keyboard selection, and the existing chart API. The route now renders the snapshot, plan, spending, and transaction sections in the signed-in browser.
- Removed temporary development error details from the boundary. The separate reconciliation request still returns HTTP 500, but the existing query treats reconciliation as optional and the rest of Money loads. Frontend `npm run build` passes.

### Global button loading and notification menu polish (2026-10-29)

- Updated the shared `Button` to keep its regular label space while loading, show a compact inline spinner and status label, maintain a minimum control height, and use color feedback instead of scale transforms. The Money analysis button now stays compact while showing “Analysing…”. Removed active scale utilities from the remaining affected controls.
- Replaced the header’s notification alert and hard-coded unread dot with a responsive in-app popover. No persisted notification API or data model exists yet, so it shows a real empty state and no fabricated unread state.
- Frontend `npm run build` passes. Browser inspection confirmed the notification popover and empty state render; further keyboard/outside-click browser checks were interrupted when Computer Use received the user's Escape key.

### Public landing page visual redesign (2026-10-29)

- Reworked the public `/` landing page around a high-contrast forest-green hero, oversized Fraunces headline, lime action accent, and open portfolio learning visual. Replaced generic marketing headings with direct product language and varied the product showcase layouts.
- Kept real authentication and product routes. The page continues to distinguish illustrative balances, sample quotes and charts from live data; the paper-trading demo remains virtual and preview-only.
- Preserved the interactive lesson choice, budget simulator and buy/sell order preview. Verified the mobile navigation opens with the expected routes and that changing illustrative income recalculates all budget amounts with zero unassigned rupees.
- Verification: frontend `npm run build` passes. Rendered and reviewed mobile and desktop layouts; browser console reported no errors. Vite reports the existing application JavaScript chunk is over 500 kB after minification.

### Deployment readiness check (2026-10-29)

- Frontend production build passes (`npm run build`). Existing Vite output includes a 1.5 MB minified JS chunk; this is a performance warning, not a failed build.
- Backend dependency manifest is present, settings validate, `uvicorn app.main:app` starts and serves OpenAPI, and configured PostgreSQL connectivity succeeds. The database is at Alembic head `012_paper_trading`.
- Redis did not respond to the read-only ping from this environment. Current local frontend API and backend CORS settings are localhost-only and need production values before a public deployment.
- Added `frontend/vercel.json` SPA rewrite so React Router deep links resolve on Vercel, and broadened `.gitignore` to ignore `.env*` files while allowing the safe `.env.example` templates.
- No Render deployment manifest or Git metadata is present in this workspace; production deployment and repository history remain unverified. Local `.env` files are ignored, but prior credential history cannot be checked without Git metadata.

### PostgreSQL driver dependency alignment (2026-10-29)

- Added the Psycopg 3 binary extra required by Render's `postgresql+psycopg` SQLAlchemy URL. Kept `psycopg2-binary` for generic `postgresql://` URLs still used by local settings; application and Alembic URLs remain environment-driven and unchanged. No database or migration was modified.
