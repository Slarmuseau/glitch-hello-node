// Conversions between what the owner measures (empties, emptied bottles, keg
// weights, tallies) and consumptions + purchase cost. Nothing here is ever
// stored as a typed number: a glaasgrootte or loss-factor change must flow
// through automatically. See the build brief, section 5.

import type { Drank, Vat } from './types'

// ---------------------------------------------------------------------------
// per stuk — sold as a single unit, counted by empties. One empty = one drink.
// ---------------------------------------------------------------------------

export function kostprijsPerConsumptiePerStuk(inkoopprijs_per_consumptie: number): number {
  return inkoopprijs_per_consumptie
}

// ---------------------------------------------------------------------------
// uit fles — poured from a bulk bottle, counted by emptied bottles.
// ---------------------------------------------------------------------------

/** How many consumptions one full bottle yields. */
export function consumptiesPerFles(fles_inhoud_cl: number, glaasgrootte_cl: number): number {
  if (glaasgrootte_cl <= 0) return 0
  return fles_inhoud_cl / glaasgrootte_cl
}

export function consumptiesUitFles(
  aantal_flessen: number,
  fles_inhoud_cl: number,
  glaasgrootte_cl: number
): number {
  return aantal_flessen * consumptiesPerFles(fles_inhoud_cl, glaasgrootte_cl)
}

export function kostprijsPerConsumptieUitFles(
  inkoopprijs_per_fles: number,
  fles_inhoud_cl: number,
  glaasgrootte_cl: number
): number {
  const perFles = consumptiesPerFles(fles_inhoud_cl, glaasgrootte_cl)
  if (perFles <= 0) return 0
  return inkoopprijs_per_fles / perFles
}

// ---------------------------------------------------------------------------
// uit vat — poured from a keg. The loss lowers the number of glasses served,
// not the cost. He pays for the whole barrel, foam included, so the cost per
// served glass sits a little higher.
// ---------------------------------------------------------------------------

export function kostprijsPerLiter(inkoopprijs_per_vat: number, inhoud_liter: number): number {
  if (inhoud_liter <= 0) return 0
  return inkoopprijs_per_vat / inhoud_liter
}

/** Glasses a full keg would yield before loss. */
export function brutoConsumptiesPerVat(inhoud_liter: number, glaasgrootte_cl: number): number {
  if (glaasgrootte_cl <= 0) return 0
  return inhoud_liter / (glaasgrootte_cl / 100)
}

/** Glasses actually served per keg, after foam/line loss. */
export function nettoConsumptiesPerVat(
  inhoud_liter: number,
  glaasgrootte_cl: number,
  verlies_percentage: number
): number {
  return brutoConsumptiesPerVat(inhoud_liter, glaasgrootte_cl) * (1 - verlies_percentage / 100)
}

export function kostprijsPerConsumptieUitVat(
  inkoopprijs_per_vat: number,
  inhoud_liter: number,
  glaasgrootte_cl: number,
  verlies_percentage: number
): number {
  const netto = nettoConsumptiesPerVat(inhoud_liter, glaasgrootte_cl, verlies_percentage)
  if (netto <= 0) return 0
  return inkoopprijs_per_vat / netto
}

export interface VatWeging {
  /** Number of barrels opened (the last one may be partial). */
  aantal_vaten_geopend: number
  /**
   * Weight in kg of the last barrel at the end of the party. Leave undefined
   * if the last barrel was also drained empty.
   */
  gewicht_laatste_vat_kg?: number | null
}

/** Liters actually drawn from the keg(s), derived from the closing weight. */
export function litersUitVat(vat: Vat, weging: VatWeging): number {
  const n = Math.max(0, Math.floor(vat.inhoud_liter > 0 ? weging.aantal_vaten_geopend : 0))
  if (n <= 0) return 0
  let restLiterLaatste = 0
  if (weging.gewicht_laatste_vat_kg != null) {
    const dichtheid = vat.dichtheid > 0 ? vat.dichtheid : 1
    restLiterLaatste = Math.max(0, (weging.gewicht_laatste_vat_kg - vat.leeg_gewicht_kg) / dichtheid)
    // A partial keg can never hold more than a full one.
    restLiterLaatste = Math.min(restLiterLaatste, vat.inhoud_liter)
  }
  return (n - 1) * vat.inhoud_liter + (vat.inhoud_liter - restLiterLaatste)
}

/** Consumptions served from the measured keg weight, after loss. */
export function consumptiesUitVatWeging(
  vat: Vat,
  glaasgrootte_cl: number,
  weging: VatWeging
): number {
  const liters = litersUitVat(vat, weging)
  if (glaasgrootte_cl <= 0) return 0
  return (liters / (glaasgrootte_cl / 100)) * (1 - vat.verlies_percentage / 100)
}

/** Purchase cost of the beer actually drawn, pro-rata by liters. */
export function inkoopkostUitVatWeging(vat: Vat, weging: VatWeging): number {
  const liters = litersUitVat(vat, weging)
  return liters * kostprijsPerLiter(vat.inkoopprijs_per_vat, vat.inhoud_liter)
}

// ---------------------------------------------------------------------------
// Unified derived cost per consumption for any drink (uses its own data).
// For 'uit_vat' the linked Vat must be supplied. Returns 0 when data is
// incomplete rather than throwing, so half-filled forms stay editable.
// ---------------------------------------------------------------------------

export function kostprijsPerConsumptie(drank: Drank, vat?: Vat | null): number {
  switch (drank.schenkwijze) {
    case 'per_stuk':
      return kostprijsPerConsumptiePerStuk(drank.inkoopprijs_per_consumptie ?? 0)
    case 'uit_fles':
      return kostprijsPerConsumptieUitFles(
        drank.inkoopprijs_per_fles ?? 0,
        drank.fles_inhoud_cl ?? 0,
        drank.glaasgrootte_cl
      )
    case 'uit_vat':
      if (!vat) return 0
      return kostprijsPerConsumptieUitVat(
        vat.inkoopprijs_per_vat,
        vat.inhoud_liter,
        drank.glaasgrootte_cl,
        vat.verlies_percentage
      )
    default:
      return 0
  }
}
