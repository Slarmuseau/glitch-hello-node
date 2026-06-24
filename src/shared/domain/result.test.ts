import { describe, it, expect } from 'vitest'
import { computeFeestResultaat } from './result'
import type { ResultaatRegelInput, AttributieInput } from './result'

// A wedding: 80 adults on a €18 alcohol forfait, 20 on a €10 non-alcoholic one.
const attributies: AttributieInput[] = [
  { forfait_naam: 'Streek', aantal_personen: 80, forfaitprijs_per_persoon: 18, verwachte_consumpties_per_persoon: 6 },
  { forfait_naam: 'Fris', aantal_personen: 20, forfaitprijs_per_persoon: 10, verwachte_consumpties_per_persoon: 5 }
]

const regels: ResultaatRegelInput[] = [
  // 480 beers drunk at €0,57 cost, €3,50 menu
  { drank_id: 1, naam: 'Stella 25cl', categorie: 'Bier', consumpties: 480, inkoopprijs_per_consumptie: 0.57, menuprijs: 3.5 },
  // 200 softs at €0,2167 cost, €3,50 menu
  { drank_id: 2, naam: 'Cola', categorie: 'Soft', consumpties: 200, inkoopprijs_per_consumptie: 1.3 / 6, menuprijs: 3.5 }
]

describe('computeFeestResultaat', () => {
  const r = computeFeestResultaat(regels, attributies, 0.05)

  it('sums headcount and forfait revenue', () => {
    expect(r.aantal_personen).toBe(100)
    expect(r.forfait_omzet).toBe(80 * 18 + 20 * 10) // 1640
  })

  it('computes the à-la-carte value of what was drunk', () => {
    // 680 consumptions all at €3,50 = €2380
    expect(r.alacarte_omzet).toBeCloseTo(680 * 3.5, 6)
    expect(r.alacarte_verschil).toBeCloseTo(r.forfait_omzet - r.alacarte_omzet, 6)
  })

  it('forfaitmarge is forfait vs per-glass value (here the forfait earned LESS)', () => {
    // €1640 forfait vs €2380 per glass -> negative
    expect(r.forfaitmarge).toBeCloseTo((1640 - 2380) / 2380, 6)
    expect(r.marge_gehaald).toBe(false)
  })

  it('a forfait priced at the per-glass value lands exactly at 0%', () => {
    // Price each head at the à-la-carte value: total = €2380 over 100 heads.
    const even: AttributieInput[] = [
      { forfait_naam: 'X', aantal_personen: 100, forfaitprijs_per_persoon: 23.8 }
    ]
    const r2 = computeFeestResultaat(regels, even, 0)
    expect(r2.forfait_omzet).toBeCloseTo(2380, 6)
    expect(r2.forfaitmarge).toBeCloseTo(0, 6)
    expect(r2.marge_gehaald).toBe(true)
  })

  it('keeps the cost-based margin as a secondary insight', () => {
    expect(r.inkoopmarge).toBeCloseTo((1640 - r.totaal_inkoopkost) / 1640, 6)
  })

  it('hindsight price per head = à-la-carte value per head + target uplift', () => {
    // à-la-carte per head = 2380/100 = 23.8 ; +5% = 24.99
    expect(r.hindsight_prijs_per_persoon).toBeCloseTo(23.8 * 1.05, 6)
  })

  it('shows expected vs actual consumptions per head', () => {
    expect(r.verwachte_consumpties_totaal).toBe(580)
    expect(r.totaal_consumpties).toBe(680)
    expect(r.werkelijke_consumpties_per_persoon).toBeCloseTo(6.8, 6)
    expect(r.consumpties_verschil_per_persoon).toBeCloseTo(1, 6)
  })

  it('reports the euro result vs cost', () => {
    expect(r.resultaat).toBeCloseTo(1640 - r.totaal_inkoopkost, 6)
  })

  it('with no discount, totaal_korting is zero', () => {
    expect(r.totaal_korting).toBe(0)
  })

  it('a discount lowers the forfait revenue and the margin', () => {
    const metKorting: AttributieInput[] = [
      { forfait_naam: 'Streek', aantal_personen: 80, forfaitprijs_per_persoon: 18, korting_pct: 10 },
      { forfait_naam: 'Fris', aantal_personen: 20, forfaitprijs_per_persoon: 10, korting_pct: 0 }
    ]
    const rk = computeFeestResultaat(regels, metKorting, 0.05)
    // 80*18*0.9 = 1296 ; 20*10 = 200 -> 1496 ; korting = 1640 - 1496 = 144
    expect(rk.forfait_omzet).toBeCloseTo(1496, 6)
    expect(rk.totaal_korting).toBeCloseTo(144, 6)
    expect(rk.forfaitmarge).toBeLessThan(r.forfaitmarge)
  })
})
