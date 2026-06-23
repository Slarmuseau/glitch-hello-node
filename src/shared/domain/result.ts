// Party result ("Resultaat") — the payoff screen's numbers. Always shows the
// working: liters, cost, steps. Never a black box.
//
// The governing measure compares the forfait revenue to what the SAME drinks
// would have earned sold by the glass (à-la-carte, at menu price). The menu
// price already contains the bar's normal margin, so:
//   forfaitmarge = (forfait_omzet - à-la-carte_omzet) / à-la-carte_omzet
//   0%  = exactly as good as selling per glass
//   +x% = the forfait earned x% more (light drinkers paid for what they didn't take)
// The margin on purchase cost is kept too, but only as a secondary insight.

import { inkoopmargeOpOmzet } from './pricing'

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

  /** A-la-carte: what these drinks would have earned sold by the glass. */
  alacarte_omzet: number
  /** forfait_omzet - alacarte_omzet, in euro (the uplift over per-glass). */
  alacarte_verschil: number

  /** PRIMARY margin: (forfait_omzet - alacarte_omzet) / alacarte_omzet.
   *  0 = same as selling per glass; positive = the forfait earned more. */
  forfaitmarge: number
  /** Target uplift over per-glass (a floor on forfaitmarge). */
  doelmarge: number
  marge_gehaald: boolean
  /** forfaitmarge - doelmarge (positive = cleared, negative = missed). */
  marge_verschil: number

  /** SECONDARY insight: gross margin on purchase cost,
   *  (forfait_omzet - inkoopkost) / forfait_omzet. */
  inkoopmarge: number
  /** Profit in euro vs purchase cost: forfait_omzet - inkoopkost. */
  resultaat: number

  inkoopkost_per_persoon: number
  /** Forfait price per head matching the per-glass value plus the target uplift. */
  hindsight_prijs_per_persoon: number

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
  doelmarge: number
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

  // Primary: forfait revenue vs the à-la-carte value of what was drunk.
  const marge = alacarte_omzet > 0 ? (forfait_omzet - alacarte_omzet) / alacarte_omzet : 0
  const alacarte_per_persoon = aantal_personen > 0 ? alacarte_omzet / aantal_personen : 0
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
    alacarte_omzet,
    alacarte_verschil: forfait_omzet - alacarte_omzet,
    forfaitmarge: marge,
    doelmarge,
    marge_gehaald: marge >= doelmarge,
    marge_verschil: marge - doelmarge,
    inkoopmarge: inkoopmargeOpOmzet(forfait_omzet, totaal_inkoopkost),
    resultaat: forfait_omzet - totaal_inkoopkost,
    inkoopkost_per_persoon,
    hindsight_prijs_per_persoon: alacarte_per_persoon * (1 + doelmarge),
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
