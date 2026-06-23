// The pricing logic — the heart of Tapwijs.
//
// Governing rule: the margin already lives in the menu price. So a forfait is
// NOT cost-plus. It is simply expected consumptions per head times menu price.
// The drinks cost the same in the forfait as at the bar; the appeal is ease,
// not a discount.
//
// The target margin is a FLOOR on the realized forfaitmarge, which is always
// measured "op de omzet". The margin convention from settings only governs how
// a price is derived FROM a cost.

import type { MargeConventie } from './types'

/** Derive a price from a cost using the owner's chosen margin convention. */
export function prijsVanKost(kost: number, marge: number, conventie: MargeConventie): number {
  if (conventie === 'opslag_op_kostprijs') {
    return kost * (1 + marge)
  }
  // 'op_de_omzet'
  if (marge >= 1) return Infinity
  return kost / (1 - marge)
}

/**
 * Realized margin on a party. Always "op de omzet":
 *   forfaitmarge = (omzet - inkoopkost) / omzet
 */
export function forfaitmarge(omzet: number, inkoopkost: number): number {
  if (omzet <= 0) return 0
  return (omzet - inkoopkost) / omzet
}

/**
 * Suggested forfait price from expected consumptions per head.
 *   forfaitprijs per persoon = verwachte consumpties per persoon * menuprijs
 * The representative menu price is the average menu price of the tier's drinks.
 */
export function suggestedForfaitPrijs(
  verwachte_consumpties_per_persoon: number,
  gemiddeldeMenuprijs: number
): number {
  return verwachte_consumpties_per_persoon * gemiddeldeMenuprijs
}

/**
 * The buffer line: at this price, up to how many consumptions per head can a
 * guest take before the realized forfaitmarge drops below the target floor?
 *   forfaitmarge = (prijs - n*kost) / prijs >= doelmarge
 *   => n <= prijs * (1 - doelmarge) / kost
 * Always measured op de omzet (the floor is on the realized margin).
 */
export function bufferConsumptiesPerHoofd(
  prijs_per_persoon: number,
  gemiddeldeKostPerConsumptie: number,
  doelmarge: number
): number {
  if (gemiddeldeKostPerConsumptie <= 0) return Infinity
  const n = (prijs_per_persoon * (1 - doelmarge)) / gemiddeldeKostPerConsumptie
  return Math.floor(n)
}

/**
 * Hindsight price for a party: the price per head that would have exactly met
 * the target floor, given the cost actually drunk per head.
 */
export function hindsightPrijsPerPersoon(
  inkoopkostPerPersoon: number,
  doelmarge: number,
  conventie: MargeConventie
): number {
  return prijsVanKost(inkoopkostPerPersoon, doelmarge, conventie)
}
