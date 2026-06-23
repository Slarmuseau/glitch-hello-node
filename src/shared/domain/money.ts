// Small numeric helpers. Money is rounded to cents only for display/totals;
// intermediate cost-per-consumption values keep full precision so repeated
// derivations never drift.

export function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0
  const f = 10 ** decimals
  return Math.round((value + Number.EPSILON) * f) / f
}

/** Round to whole cents. */
export function euro(value: number): number {
  return round(value, 2)
}

/** Format a euro amount in Belgian Dutch notation, e.g. "€ 3,50". */
export function formatEuro(value: number): string {
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: 'EUR'
  }).format(Number.isFinite(value) ? value : 0)
}

/** Format a margin (0..1) as a percentage, e.g. "32 %". */
export function formatPercent(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '–'
  return new Intl.NumberFormat('nl-BE', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

/** Format a plain number in Belgian Dutch notation. */
export function formatNumber(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '–'
  return new Intl.NumberFormat('nl-BE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  }).format(value)
}
