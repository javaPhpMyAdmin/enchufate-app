/**
 * Display formatters. Pure functions, no React Native imports.
 *
 * Locale: en-US by design. Spanish formatters can be layered on top later
 * without changing call sites.
 */

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

/** "$6/hr" — whole-dollar price for chargers. */
export function formatPrice(value: number): string {
  return `${usdFormatter.format(Math.round(value))}/hr`;
}

/** "11 kW" — always one decimal for sub-10 kW chargers. */
export function formatPower(value: number): string {
  const formatted =
    value < 10 ? decimalFormatter.format(value) : integerFormatter.format(value);
  return `${formatted} kW`;
}

/** "4.8" — single decimal rating. */
export function formatRating(value: number): string {
  return decimalFormatter.format(value);
}

/**
 * Convert minutes to a countdown string.
 * - < 60 minutes  -> "mm:ss"
 * - >= 60 minutes -> "hh:mm:ss"
 *
 * Rounds up so users never see "00:00" before the slot is actually free.
 */
export function formatCountdown(totalMinutes: number): string {
  const minutes = Math.max(0, Math.ceil(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const secs = 0; // We don't have second-level precision in mock data.

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/** "350 reseñas" — pluralized review count. */
export function formatReviewCount(count: number): string {
  return `${integerFormatter.format(count)} ${count === 1 ? 'reseña' : 'reseñas'}`;
}
