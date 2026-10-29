const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatMonthLabel(year: number, month: number): string {
  return `${MONTHS[month - 1]} ${year}`;
}

export function formatCurrency(amount: string | null | undefined): string {
  if (!amount) return "—";
  const value = Number(amount);
  if (Number.isNaN(value)) return `₹${amount}`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: string | null | undefined): string {
  if (!value) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return `${num.toFixed(1)}%`;
}

export function changeDirection(value: string | null | undefined): "up" | "down" | "flat" {
  if (!value) return "flat";
  const num = Number(value);
  if (num > 0) return "up";
  if (num < 0) return "down";
  return "flat";
}
