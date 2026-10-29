# Vestor Design System & Tokens

## Palette
- **Ink Primary:** `#0B1220` (Ink 950 - deep readable contrast, WCAG AAA compliant)
- **Ink Secondary:** `#1E293B` (Ink 900) & `#475569` (Ink 700)
- **Accent Primary:** `#0F766E` (Teal 700 - trustworthy fintech signature)
- **Accent Soft:** `#CCFBF1` (Teal 100) & `#F0FDFA` (Teal 50)
- **Background:** `#FFFFFF` (Surface) & `#F8FAFC` (Slate 50 canvas)
- **Alert / Accent Secondary:**
  - Amber: `#D97706` (Wants / Warnings)
  - Rose: `#E11D48` (Debt / Errors)
  - Emerald: `#059669` (Savings / Success)
  - Indigo/Blue: `#2563EB` (Investing / Tools)

## Typography
- **Display Headings:** `"Fraunces", Georgia, serif` (`font-display`)
- **Body & Controls:** `"DM Sans", system-ui, sans-serif` (`font-sans`)
- **Scale:**
  - Display Hero: `2.25rem` (36px) to `2.75rem` (44px), tracking `-0.025em`
  - Screen Titles: `1.5rem` (24px) to `1.875rem` (30px), font-bold
  - Section Headings: `1.125rem` (18px) to `1.25rem` (20px), font-semibold
  - Body: `0.875rem` (14px) to `1rem` (16px), line-height `1.625`
  - Captions / Metadata: `0.6875rem` (11px) to `0.75rem` (12px), font-semibold

## Depth & Borders
- **Borders:** `1px solid rgba(226, 232, 240, 0.9)` (Slate 200)
- **Shadows:** Restrained, natural drop shadows (`shadow-xs`: `0 1px 2px rgba(0,0,0,0.05)`, `shadow-sm`: `0 2px 4px rgba(0,0,0,0.05)`)
- **Focus Rings:** `focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2`

## Motion
- **Tool:** Motion (`framer-motion`)
- **Duration:** 200ms to 350ms with `easeOut` curves.
- **Purpose:** Express state changes, step transitions, and validation feedback.
- **Accessibility:** Respects `prefers-reduced-motion`.
