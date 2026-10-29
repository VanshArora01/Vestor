from __future__ import annotations

from decimal import Decimal

# Percentage change threshold to flag category spending increase (e.g. 15%)
CATEGORY_SPENDING_INCREASE_PCT = Decimal("15")

# Absolute minimum increase in INR to flag category spending increase
CATEGORY_SPENDING_INCREASE_MIN_AMOUNT = Decimal("500")

# Investment allocation decrease threshold (percentage points of income)
INVESTMENT_ALLOCATION_DECREASE_PCT = Decimal("5")

# Emergency fund allocation increase threshold (percentage points of income)
EMERGENCY_ALLOCATION_INCREASE_PCT = Decimal("3")

# Slugs for investment allocation categories
INVESTMENT_ALLOCATION_SLUGS = frozenset({"mutual-funds", "stocks"})

EMERGENCY_ALLOCATION_SLUG = "emergency-fund"
