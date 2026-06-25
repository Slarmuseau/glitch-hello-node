// The pricing logic — the heart of Tapwijs.
//
// Governing rule: the margin already lives in the menu price. So a forfait is
// NOT cost-plus. It is simply expected consumptions per head times menu price.
//
// The real question the owner asks: how much must a forfait cost per head so it
// brings in at least as much as the SAME drinks sold by the glass (à-la-carte)?
// Charging exactly the à-la-carte value = 0% (as good as per glass); a few
// percent above is the goal, won from light drinkers.

import type { MargeConventie } from './types'

/** Derive a price from a cost using a margin convention (kept for the
 *  secondary cost-based insight; the forfait price itself is not cost-plus). */
export function prijsVanKost(kost: number, marge: number, conventie: MargeConventie): number {
  if (conventie === 'opslag_op_kostprijs') {
    return kost * (1 + marge)
  }
  if (marge >= 1) return Infinity
  return kost / (1 - marge)
}

/**
 * PRIMARY measure — how much more (or less) the forfait earned versus the same
 * drinks sold by the glass:
 *   (forfait_omzet - alacarte_omzet) / alacarte_omzet
 * 0 = exactly as good as per glass.
 */
export function forfaitmargeVsAlacarte(forfait_omzet: number, alacarte_omzet: number): number {
  if (alacarte_omzet <= 0) return 0
  return (forfait_omzet - alacarte_omzet) / alacarte_omzet
}

/**
 * SECONDARY insight — gross margin on purchase cost, measured on revenue:
 *   (omzet - inkoopkost) / omzet
 */
export function inkoopmargeOpOmzet(omzet: number, inkoopkost: number): number {
  if (omzet <= 0) return 0
  return (omzet - inkoopkost) / omzet
}

/**
 * Suggested forfait price from expected consumptions per head:
 *   forfaitprijs per persoon = verwachte consumpties per persoon * menuprijs
 * This is the à-la-carte value per head — the break-even versus selling per glass.
 */
export function suggestedForfaitPrijs(
  verwachte_consumpties_per_persoon: number,
  gemiddeldeMenuprijs: number
): number {
  return verwachte_consumpties_per_persoon * gemiddeldeMenuprijs
}

/**
 * Forfait price per head to reach the à-la-carte value plus the target uplift:
 *   prijs = alacarte_per_persoon * (1 + doelmarge)
 */
export function forfaitPrijsVoorMarge(alacarte_per_persoon: number, doelmarge: number): number {
  return alacarte_per_persoon * (1 + doelmarge)
}

/** Default, front-loaded duration curve (vs a 1,5u standard) used until the
 *  manager configures their own per type. */
export const STANDAARD_DUUR_AANPASSINGEN: { duur: number; pct: number }[] = [
  { duur: 1, pct: -20 },
  { duur: 1.5, pct: 0 },
  { duur: 2, pct: 12 }
]

/**
 * Price/consumption adjustment (%) for a given duration, from a party type's
 * config. Manager-defined per duration (non-linear). Falls back to the default
 * curve when no config (or no entry for that duration) exists.
 */
export function duurAanpassingPct(
  config: { aanpassingen: { duur: number; pct: number }[] } | undefined | null,
  duur: number
): number {
  const aanp = config?.aanpassingen ?? STANDAARD_DUUR_AANPASSINGEN
  const m = aanp.find((a) => a.duur === duur)
  if (m) return m.pct
  return STANDAARD_DUUR_AANPASSINGEN.find((a) => a.duur === duur)?.pct ?? 0
}

/**
 * The buffer line: at this price per head, up to how many consumptions can a
 * guest take before the forfait drops below the per-glass value (plus target)?
 *   prijs >= n * gem_menuprijs * (1 + doelmarge)
 *   => n <= prijs / (gem_menuprijs * (1 + doelmarge))
 */
export function bufferConsumptiesPerHoofd(
  prijs_per_persoon: number,
  gemiddeldeMenuprijs: number,
  doelmarge: number
): number {
  const noemer = gemiddeldeMenuprijs * (1 + doelmarge)
  if (noemer <= 0) return Infinity
  return Math.floor(prijs_per_persoon / noemer)
}
