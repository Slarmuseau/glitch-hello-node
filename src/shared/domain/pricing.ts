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

/** Default front-loaded drink profile: the first hour weighs ~2, each further
 *  hour ~1 (a common catering rule of thumb). Tunable in settings. */
export const STANDAARD_DUUR_GEWICHT = { eerste_uur: 2, per_extra_uur: 1 }

/** Relative drink "weight" for a duration, front-loaded. */
export function duurGewicht(uren: number, eerste_uur = 2, per_extra_uur = 1): number {
  const t = Math.max(0, uren)
  return eerste_uur * Math.min(t, 1) + per_extra_uur * Math.max(0, t - 1)
}

/**
 * Price/consumption multiplier for a duration vs a base (standard) duration,
 * using the front-loaded profile. 1.0 at the standard duration; longer is
 * higher but sub-linear (1u is proportionally pricier than 2u).
 */
export function duurFactor(
  duur: number,
  standaardduur: number,
  eerste_uur = 2,
  per_extra_uur = 1
): number {
  const basis = duurGewicht(standaardduur, eerste_uur, per_extra_uur)
  if (basis <= 0) return 1
  return duurGewicht(duur, eerste_uur, per_extra_uur) / basis
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
