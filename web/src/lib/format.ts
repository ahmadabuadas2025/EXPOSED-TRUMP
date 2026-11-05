const SYMBOL: Record<string, string> = { USD: "$", ILS: "₪" };

/** Compact money: $2B, $157M, ₪1.05B, $615,422. Small amounts are shown exactly. */
export function money(n: number, currency: string): string {
  const s = SYMBOL[currency] ?? `${currency} `;
  const abs = Math.abs(n);
  const fmt = (v: number, unit: string) => `${s}${(+v.toFixed(v < 10 ? 2 : 1)).toLocaleString("en-US")}${unit}`;
  if (abs >= 1e9) return fmt(n / 1e9, "B");
  if (abs >= 1e6) return fmt(n / 1e6, "M");
  return `${s}${Math.round(n).toLocaleString("en-US")}`;
}

/** A range when low and high differ; "up to" when the low bound is zero (an upper bound only). */
export function moneyRange(low: number, high: number, currency: string): string {
  if (low === high) return money(low, currency);
  if (low === 0) return `up to ${money(high, currency)}`;
  return `${money(low, currency)}–${money(high, currency).replace(/^[^\d]+/, "")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Formats YYYY, YYYY-MM, YYYY-MM-DD or a year range, keeping the source's precision. */
export function date(d: string): string {
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(d);
  if (!m) return d;
  const [, y, mo, da] = m;
  if (!mo) return y;
  if (!da) return `${MONTHS[+mo - 1]} ${y}`;
  return `${MONTHS[+mo - 1]} ${+da}, ${y}`;
}
