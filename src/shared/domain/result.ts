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
import { btwInBedrag } from './btw'

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
  /** Purchase VAT rate in percent (default 21). */
  btw_inkoop?: number | null
}

export interface BtwOverzicht {
  verkoop_tarief: number
  verkoop_incl: number
  verkoop_btw: number
  inkoop_incl: number
  inkoop_btw: number
  /** Purchases broken down per VAT rate. */
  per_tarief: { tarief: number; inkoop_incl: number; btw: number }[]
  /** Output VAT minus input VAT. */
  verschuldigd: number
}

export interface AttributieInput {
  forfait_naam: string
  aantal_personen: number
  forfaitprijs_per_persoon: number
  /** Discount the customer gets on this forfait's price, in percent (0..100). */
  korting_pct?: number | null
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
  /** Total discount given to customers, in euro (before-discount minus actual). */
  totaal_korting: number
  /** VAT overview (prices are incl. BTW). */
  btw: BtwOverzicht

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
  doelmarge: number,
  btw_verkoop = 21
): FeestResultaat {
  const verrijkteRegels: ResultaatRegel[] = regels.map((r) => ({
    ...r,
    inkoopkost: r.consumpties * r.inkoopprijs_per_consumptie,
    alacarte_omzet: r.consumpties * r.menuprijs
  }))

  const aantal_personen = attributies.reduce((s, a) => s + a.aantal_personen, 0)
  // Revenue uses the discounted forfait price (the discount is given to the
  // customer). The discount thus lowers the realized margin.
  const forfait_omzet = attributies.reduce(
    (s, a) =>
      s + a.aantal_personen * a.forfaitprijs_per_persoon * (1 - (a.korting_pct ?? 0) / 100),
    0
  )
  const bruto_forfait_omzet = attributies.reduce(
    (s, a) => s + a.aantal_personen * a.forfaitprijs_per_persoon,
    0
  )
  const totaal_korting = bruto_forfait_omzet - forfait_omzet
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

  // VAT (prices incl. BTW). Output VAT on the (discounted) forfait revenue,
  // input VAT on purchases per drink's rate.
  const tariefMap = new Map<number, { inkoop_incl: number; btw: number }>()
  let inkoop_btw_totaal = 0
  for (const r of verrijkteRegels) {
    const tarief = r.btw_inkoop ?? 21
    const btw = btwInBedrag(r.inkoopkost, tarief)
    inkoop_btw_totaal += btw
    const t = tariefMap.get(tarief) ?? { inkoop_incl: 0, btw: 0 }
    t.inkoop_incl += r.inkoopkost
    t.btw += btw
    tariefMap.set(tarief, t)
  }
  const verkoop_btw = btwInBedrag(forfait_omzet, btw_verkoop)
  const btw: BtwOverzicht = {
    verkoop_tarief: btw_verkoop,
    verkoop_incl: forfait_omzet,
    verkoop_btw,
    inkoop_incl: totaal_inkoopkost,
    inkoop_btw: inkoop_btw_totaal,
    per_tarief: [...tariefMap.entries()]
      .map(([tarief, v]) => ({ tarief, ...v }))
      .sort((a, b) => b.tarief - a.tarief),
    verschuldigd: verkoop_btw - inkoop_btw_totaal
  }

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
    totaal_korting,
    btw,
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
