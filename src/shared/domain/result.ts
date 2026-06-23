// Party result ("Resultaat") — the payoff screen's numbers. Always shows the
// working: liters, cost, steps. Never a black box.

import type { MargeConventie } from './types'
import { forfaitmarge, hindsightPrijsPerPersoon } from './pricing'

/** One drink's contribution, with consumptions already derived from measurement. */
export interface ResultaatRegelInput {
  drank_id: number
  naam: string
  categorie: string
  /** Consumptions actually drunk (already converted from empties/weights/tally). */
  consumpties: number
  /** Snapshot purchase cost per consumption on the party date. */
  inkoopprijs_per_consumptie: number
  /** Snapshot menu price per consumption on the party date. */
  menuprijs: number
}

export interface AttributieInput {
  forfait_naam: string
  aantal_personen: number
  forfaitprijs_per_persoon: number
  /** Expected consumptions per head for this tier, if set. */
  verwachte_consumpties_per_persoon?: number | null
}

export interface ResultaatRegel extends ResultaatRegelInput {
  inkoopkost: number
  alacarte_omzet: number
}

export interface FeestResultaat {
  regels: ResultaatRegel[]
  aantal_personen: number

  forfait_omzet: number
  totaal_inkoopkost: number
  totaal_consumpties: number

  forfaitmarge: number
  doelmarge: number
  marge_gehaald: boolean
  /** forfaitmarge - doelmarge (positive = cleared, negative = missed). */
  marge_verschil: number
  /** Profit in euro: omzet - inkoopkost. */
  resultaat: number

  inkoopkost_per_persoon: number
  /** Price per head that would have exactly met the floor in hindsight. */
  hindsight_prijs_per_persoon: number

  /** A-la-carte: what these drinks would have earned sold by the glass. */
  alacarte_omzet: number
  /** forfait_omzet - alacarte_omzet (positive = forfait earned more). */
  alacarte_verschil: number

  /** Expected vs actual consumptions. */
  verwachte_consumpties_totaal: number
  verwachte_consumpties_per_persoon: number
  werkelijke_consumpties_per_persoon: number
  /** werkelijk - verwacht, per head (positive = drank more than expected). */
  consumpties_verschil_per_persoon: number
}

export function computeFeestResultaat(
  regels: ResultaatRegelInput[],
  attributies: AttributieInput[],
  doelmarge: number,
  conventie: MargeConventie
): FeestResultaat {
  const verrijkteRegels: ResultaatRegel[] = regels.map((r) => ({
    ...r,
    inkoopkost: r.consumpties * r.inkoopprijs_per_consumptie,
    alacarte_omzet: r.consumpties * r.menuprijs
  }))

  const aantal_personen = attributies.reduce((s, a) => s + a.aantal_personen, 0)
  const forfait_omzet = attributies.reduce(
    (s, a) => s + a.aantal_personen * a.forfaitprijs_per_persoon,
    0
  )
  const totaal_inkoopkost = verrijkteRegels.reduce((s, r) => s + r.inkoopkost, 0)
  const totaal_consumpties = verrijkteRegels.reduce((s, r) => s + r.consumpties, 0)
  const alacarte_omzet = verrijkteRegels.reduce((s, r) => s + r.alacarte_omzet, 0)

  const marge = forfaitmarge(forfait_omzet, totaal_inkoopkost)
  const inkoopkost_per_persoon = aantal_personen > 0 ? totaal_inkoopkost / aantal_personen : 0

  const verwachte_consumpties_totaal = attributies.reduce(
    (s, a) => s + a.aantal_personen * (a.verwachte_consumpties_per_persoon ?? 0),
    0
  )

  return {
    regels: verrijkteRegels,
    aantal_personen,
    forfait_omzet,
    totaal_inkoopkost,
    totaal_consumpties,
    forfaitmarge: marge,
    doelmarge,
    marge_gehaald: marge >= doelmarge,
    marge_verschil: marge - doelmarge,
    resultaat: forfait_omzet - totaal_inkoopkost,
    inkoopkost_per_persoon,
    hindsight_prijs_per_persoon: hindsightPrijsPerPersoon(
      inkoopkost_per_persoon,
      doelmarge,
      conventie
    ),
    alacarte_omzet,
    alacarte_verschil: forfait_omzet - alacarte_omzet,
    verwachte_consumpties_totaal,
    verwachte_consumpties_per_persoon:
      aantal_personen > 0 ? verwachte_consumpties_totaal / aantal_personen : 0,
    werkelijke_consumpties_per_persoon:
      aantal_personen > 0 ? totaal_consumpties / aantal_personen : 0,
    consumpties_verschil_per_persoon:
      aantal_personen > 0
        ? (totaal_consumpties - verwachte_consumpties_totaal) / aantal_personen
        : 0
  }
}
