const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 1234 → "1.2K"; a missing value → "–". */
export function formatCount(value: number | null | undefined): string {
  return value == null ? "–" : compact.format(Math.round(value));
}

export function formatUsd(value: number | null | undefined): string {
  return value == null ? "–" : `$${value.toFixed(2)}`;
}
