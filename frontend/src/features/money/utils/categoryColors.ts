/** Restrained Vestor teal/slate palette — opacity variants, not random hues. */

const BASE_PALETTE = [
  "#0F766E",
  "#115E59",
  "#0D9488",
  "#5EEAD4",
  "#334155",
  "#64748B",
  "#94A3B8",
  "#CBD5E1",
] as const;

const SLUG_COLORS: Record<string, string> = {
  "emergency-fund": "#0F766E",
  goals: "#0D9488",
  "mutual-funds": "#115E59",
  stocks: "#134E4A",
  "personal-expenses": "#334155",
  others: "#94A3B8",
  food: "#0F766E",
  transport: "#0D9488",
  rent: "#115E59",
  utilities: "#64748B",
  shopping: "#334155",
  entertainment: "#14B8A6",
  healthcare: "#5EEAD4",
  education: "#0F766E",
  travel: "#475569",
};

/** Allocation categories counted as investments (matches backend semantic_type / system slugs). */
export const INVESTMENT_ALLOCATION_SLUGS = new Set(["mutual-funds", "stocks"]);

export function isInvestmentCategory(
  slug: string,
  semanticType?: string | null,
): boolean {
  return semanticType === "investment" || INVESTMENT_ALLOCATION_SLUGS.has(slug);
}

export function getCategoryColor(slug: string, index = 0): string {
  if (SLUG_COLORS[slug]) return SLUG_COLORS[slug];
  return BASE_PALETTE[index % BASE_PALETTE.length];
}
