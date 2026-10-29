# Vestor UI Spec

GOAL
Premium fintech UI: calm, soft, confident. One dominant element per screen, everything else quieter. Restyle only: do NOT change data, logic, API calls or routes. Reuse existing components and data hooks.

REFERENCE LOOK
Soft rounded cards on a warm-neutral background, one dark "hero" card per page, a single teal accent, a grouped left sidebar. Copy the surfaces, radii, type and spacing; do NOT copy the density or vanity stats.

DESIGN TOKENS (define once, everything uses them)
- Colors: warm-neutral background, white surfaces, near-black ink, dark hero surface, existing teal as the only accent, semantic positive / negative / warning. Define dark-mode variants but do not build dark mode yet.
- Radius 20-24px for cards, 12px for controls. Soft 1px borders, very light shadows. 8px spacing scale.
- Type: Geist or Inter for UI. Tabular numerals for ALL amounts. Existing serif only for page titles and Learn.
- Money format: Indian grouping (₹12,83,424), no decimals unless needed, negatives in red with a minus sign.

PRIMITIVES (components/ui)
AppShell (grouped left sidebar: Main [Dashboard, Money, Accounts], Plan [Goals, Portfolio], Grow [Learn, Market, AI]; collapsible; mobile bottom bar or drawer; ⌘K trigger; global sync chip), Card, HeroCard (dark), Stat (label, value, delta chip, "Show the math" trigger), Badge/StatusChip (SYNCED / STALE / FAILED, COMPLETE / IN_PROGRESS / NOT_STARTED / OVER_PLAN), ProgressBar, Ring, Button, Sheet (side panel), EmptyState, Skeleton, InlineConfirm (✓ / ✕ pair).

GLOBAL RULES
- Motion (import from "motion/react"): 150-250ms transitions, count-up on the hero number only, layout animation for list changes, respect prefers-reduced-motion. No decorative animation elsewhere.
- Every card has designed empty, loading (skeleton, not spinners) and error states. Never show a bare "—"; show a short reason instead ("Waiting for first sync").
- Charts: Recharts, styled with tokens only, minimal gridlines, tooltip on hover.
- Responsive: usable at 390px, comfortable at 1280px. Max content width 1200px.
- Accessibility: AA contrast, visible focus rings, buttons with labels, keyboard navigable.
- Hide sections that have no data yet (e.g. Wealth Journey chart until there are enough snapshots) instead of showing empty placeholders.

PAGES (build in this order, one per session)

1. SHELL + LOGIN/REGISTER
   AppShell for all authenticated routes. Login/Register as a split layout: calm brand panel on one side, form on the other, one primary button, inline validation, subtle entrance.

2. DASHBOARD ("Am I okay?")
   - Header: greeting, date, sync chip.
   - HeroCard (dark): Safe to Spend if the backend provides it, otherwise Tracked Net Worth. Never fabricate a value. Under it: one-line state, "Show the math" link, and a small forecast sparkline if data exists. Beside it: a Stat card with the other figure.
   - Breakdown row: Main/Spending, Savings (stacked bar: goal earmarks vs unallocated), Emergency Fund (months of runway), Invested.
   - "Needs you" card: pending approvals, such as the salary confirmation with InlineConfirm.
   - "What changed": max 3 insights, each with a headline, a specific-number body, and an evidence link.
   - Upcoming 7 days (only if obligation data exists).
   - REMOVE: Wealth Journey empty state, the "Your Progress" checklist, the duplicate Monthly Financial Flow block.

3. MONEY ("What can I plan, and did reality match?")
   - Month switcher pill + ACTIVE/LOCKED chip.
   - Equation hero: Carryover + Confirmed income + Manual adjustment = Available to Plan, laid out left to right as chips.
   - Salary confirmation banner with InlineConfirm when income is unconfirmed.
   - Left column: Plan vs Actual rows (category, planned, actual, progress bar, status chip, provenance icon). Right column: Spending by category with bars and a "Start new month" action.
   - Compact Month Comparison at the bottom.

4. ACCOUNTS ("Where is my money?")
   - Hero: Total Connected Cash.
   - Accounts grouped by purpose (Main/Spending, Savings, Emergency, Other). Each card: institution avatar + name, masked number, balance, sync StatusChip with last-synced time, purpose chip (editable), Sync now.
   - Account detail opens in a Sheet showing the transaction ledger with a category chip and a correct-classification action.
   - Connection History collapsed behind a "Past connections" toggle.

5. GOALS ("What am I saving for?")
   - Top: per-account earmark stacked bar (e.g. Savings ••6015: PS5 | Car | Unallocated).
   - Goal cards: Ring progress, saved/target, linked account chip, required vs planned per month, estimated completion, status chip.
   - Create/edit goal in a Sheet with an account dropdown.
   - One insight card, specific and with numbers.

6. PORTFOLIO
   - Hero: valuation, with a "1 holding missing a price" notice instead of blanking totals; price-freshness chip.
   - Allocation donut + legend, holdings table with price-age chips, plan-vs-invested row for the month.

7. LEARN
   Path map as a winding node trail; mascot slot component (accepts a Rive file or a Motion placeholder). Lesson player in focus mode: sidebar hidden, thin progress bar, one large action per step, bouncy but short feedback, canvas-confetti on completion, optional sound (off by default). Level/world cards with XP and streak only.

8. AI / COMMAND BAR
   ⌘K palette (search, navigate, ask) and an Ask Vestor panel. Answers show evidence chips that open "Show the math".

9. MARKET: lowest priority; apply tokens only.

PROCESS
- One page per session. Read only that page's files, the primitives and this spec.
- Commit after each page.
- After each page: /impeccable critique <page>, then /impeccable polish <page>.
- Report in 5 lines or fewer: what changed, files touched, anything blocked.
- No screenshots or browser loops until the final check of a page.