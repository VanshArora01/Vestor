# Vestor UI Spec v2

GOAL
A premium fintech UI that feels designed, not templated. Restyle only: do NOT change data, logic, API calls or routes. Keep the existing card structure; change the look and add interaction. Never fabricate values: if the API doesn't return something, hide the element.

ART DIRECTION: "Midnight ledger"
Dark-first, calm, precise. Neutrals do 95% of the work. Gold is the only accent and covers under 5% of pixels (hero glow, focus ring, primary button, key chart line). Depth comes from layered surfaces, hairline borders and soft inner glow, not drop shadows.

TOKENS (CSS variables; define dark and light; default dark; theme toggle in the user menu)
Dark:  --bg #0B0D10, --surface #12151A, --surface-2 #181C22, --border rgba(255,255,255,.07), --text #ECEAE4, --muted #8B909A, --accent #F2B84B (fills/lines/glows only, text on accent is #14110F)
Light: --bg #F4F1EA, --surface #FFFFFF, --surface-2 #EEEAE1, --border rgba(20,17,15,.08), --text #14110F, --muted #6B645B, --accent #D9962B
Semantic (text color only, NEVER tinted pill backgrounds): --positive #4CC38A (dark) / #1E7A4F (light), --negative #E5707E / #B3392F
Chart palette: gold #F2B84B, teal #4FB3A5, periwinkle #7C8CFF, rose #E5707E, sand #C9B79C
Radius: 20px cards, 12px controls. Spacing: 8px scale, 24-32px gutters.
Type: Geist (npm `geist`) or Inter variable. Tabular numerals on ALL amounts. Existing serif only for greeting, page titles and section titles. Scale with real contrast: hero number 72-96px/600/tight tracking, section titles 24-28px serif, body 14-15px, labels 13px sentence-case muted.
Money format: Indian grouping (₹12,83,424), negatives with minus in negative color.

ANTI-SLOP RULES (hard)
- No tinted pill backgrounds. Chips are neutral outlines, max 2 visible per card, and used only for state that changes (sync state, plan status).
- No uppercase letter-spaced labels except at most one page eyebrow.
- Cards have three weights: Hero (dark, glow, big), Standard (surface + hairline border), Quiet (no background, divider only). Not every block is a bordered card.
- No gradient buttons, no purple, no emoji, no stock illustrations. Icons: Lucide, 1.5 stroke, one size scale.
- Sibling cards share baselines: fixed header height, single-line titles with truncation, values aligned.
- No dead space: a card is never taller than its content needs; fill space with meaningful visuals.
- Charts: 1.5px lines, area fading to transparent, one baseline gridline, end-point dot with value, tooltip on hover. Recharts only; styled with tokens.
- Redundancy ban: show each status once (one global sync chip, in the sidebar).

MOTION (Motion, import from "motion/react")
150-250ms. Staggered card entrance (40ms, once per session). Hover: lift 2px + brighter border. Press: scale .98. Count-up on hero numbers once per session. Layout animations for expand/collapse and list changes. Sliding active indicator in the sidebar (layoutId). Cursor-follow spotlight glow on hero cards (CSS radial-gradient driven by pointer position) plus a subtle grain overlay. Respect prefers-reduced-motion. Nothing decorative beyond this.

PRIMITIVES (components/ui)
AppShell, Card (weights: hero / standard / quiet), HeroCard, Stat, StatusChip, ProgressBar, SegmentedBar (linked hover), Ring, Gauge, Button (primary = gold fill, secondary = outline), Sheet (side panel), CommandPalette (cmdk), InlineConfirm, EmptyState, Skeleton, ThemeToggle.

GLOBAL RULES
Skeletons not spinners. Every card has designed empty/loading/error states with a reason, never a bare "—". Hide sections without data. Usable at 390px, comfortable at 1280px, max content width 1200px. AA contrast, visible focus rings, keyboard navigable.

PAGE 2: DASHBOARD ("Am I okay?")
Keep: sidebar shell, Safe to Spend hero + Net Worth card, 4 breakdown cards, What Changed.
- Header: greeting (serif), date. Remove the duplicate Synced chip; the single sync chip lives in the sidebar and opens a popover listing each account's last sync with a Sync now action.
- Hero (Safe to Spend): count-up, cursor spotlight + grain, a thin day-of-month progress line (today's position, frontend date only), "Show the math" opens a Sheet with the formula inputs. Show daily allowance only if the API returns it.
- Net Worth card: fill the empty space with a SegmentedBar showing the four components (Main, Savings, Emergency, Invested). Hovering a segment highlights its matching breakdown card below (shared hover state); clicking expands that card. Show a sparkline only when 2+ snapshots exist. Delta chip only when the API returns a real previous value, otherwise hide it. Hide "+0.0%".
- Breakdown cards: align baselines (single-line titles). Click to expand in place: Main = list of accounts with balances; Savings = SegmentedBar of goal earmarks (PS5, Car) vs free; Emergency = 6-segment runway Gauge (months covered vs 6-month target); Invested = mini donut + holdings count + price-freshness note. Show only fields the API returns.
- What Changed: horizontal snap carousel with arrow-key navigation and dots; "View evidence" opens a Sheet with the source numbers. Rewrite jargon into plain language ("Investing was 13.5 points lower as a share of income than last month"). If an approval is pending (e.g. salary confirmation), show a "Needs you" card with InlineConfirm to the left of the carousel.
- Command palette (cmdk, ⌘K): navigate to pages, quick actions (New goal, Connect bank, Add investment, Sync now), and fall through to Ask Vestor. Make the sidebar search box open it.
- The floating Vestor AI pill opens the Ask panel. Add bottom padding so it never covers content; hide it behind the bottom bar on mobile.
- Replace the green XP badge with a neutral streak count (hide if no streak data).
- REMOVE leftover placeholders and checklists.

PAGES 3-9: follow v1 page definitions (Money, Accounts, Goals, Portfolio, Learn, AI, Market) using this language. Money's equation hero and Learn's path map are the signature visuals.

PROCESS
One page per session. Read only that page's files, the primitives and this spec. Commit after each page. After each page run /impeccable critique <page>, then /impeccable polish <page>. Report in 5 lines or fewer: what changed, files touched, anything blocked. No screenshots or browser loops until the final check.