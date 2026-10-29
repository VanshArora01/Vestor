/** Invest formatting helpers — Indian INR, signed gain/return. */

export function formatInr(
  amount: string | number | null | undefined,
  options?: { decimals?: number; fallback?: string },
): string {
  const fallback = options?.fallback ?? "—";
  if (amount === null || amount === undefined || amount === "") return fallback;
  const value = typeof amount === "number" ? amount : Number(amount);
  if (Number.isNaN(value)) return fallback;
  const decimals = options?.decimals ?? 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatSignedInr(
  amount: string | number | null | undefined,
  options?: { decimals?: number },
): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const value = typeof amount === "number" ? amount : Number(amount);
  if (Number.isNaN(value)) return "—";
  const abs = formatInr(Math.abs(value), { decimals: options?.decimals ?? 0 });
  if (value > 0) return `+${abs}`;
  if (value < 0) return `−${abs}`;
  return abs;
}

export function formatSignedPercent(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) return "—";
  const body = `${Math.abs(num).toFixed(2)}%`;
  if (num > 0) return `+${body}`;
  if (num < 0) return `−${body}`;
  return body;
}

export function toneForNumber(value: string | number | null | undefined): "up" | "down" | "flat" {
  if (value === null || value === undefined || value === "") return "flat";
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num) || num === 0) return "flat";
  return num > 0 ? "up" : "down";
}

export function toneClass(tone: "up" | "down" | "flat"): string {
  if (tone === "up") return "text-teal-700";
  if (tone === "down") return "text-red-700";
  return "text-ink-700";
}

export function assetTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    stock: "Stock",
    mutual_fund: "Mutual Fund",
    etf: "ETF",
    gold: "Gold",
    fd: "Fixed Deposit",
    ppf: "PPF",
    nps: "NPS",
    other: "Other",
  };
  return labels[type] ?? type;
}

export function assetTypePlural(type: string): string {
  const labels: Record<string, string> = {
    stock: "Stocks",
    mutual_fund: "Mutual Funds",
    etf: "ETFs",
    gold: "Gold",
    fd: "Fixed Deposits",
    ppf: "PPF",
    nps: "NPS",
    other: "Other",
  };
  return labels[type] ?? type;
}

export function formatUnits(value: string | null | undefined): string {
  if (!value) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 6,
  }).format(num);
}

export function formatRelativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const mins = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

export const ASSET_TYPE_COLORS: Record<string, string> = {
  stock: "#134E4A",
  mutual_fund: "#0F766E",
  etf: "#0D9488",
  gold: "#64748B",
  fd: "#475569",
  ppf: "#334155",
  nps: "#94A3B8",
  other: "#CBD5E1",
};
