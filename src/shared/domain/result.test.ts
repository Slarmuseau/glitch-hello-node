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
  const r = computeFeestResultaat(regels, attributies, 0.3, 'op_de_omzet')

  it('sums headcount across attributions', () => {
    expect(r.aantal_personen).toBe(100)
  })

  it('computes forfait revenue from the attributions', () => {
    expect(r.forfait_omzet).toBe(80 * 18 + 20 * 10) // 1640
  })

  it('computes total purchase cost from the lines', () => {
    expect(r.totaal_inkoopkost).toBeCloseTo(480 * 0.57 + 200 * (1.3 / 6), 6)
  })

  it('grades against the target floor', () => {
    expect(r.forfaitmarge).toBeCloseTo((1640 - r.totaal_inkoopkost) / 1640, 6)
    expect(r.marge_gehaald).toBe(r.forfaitmarge >= 0.3)
  })

  it('shows the a-la-carte comparison', () => {
    expect(r.alacarte_omzet).toBeCloseTo(480 * 3.5 + 200 * 3.5, 6)
    expect(r.alacarte_verschil).toBeCloseTo(r.forfait_omzet - r.alacarte_omzet, 6)
  })

  it('shows expected vs actual consumptions per head', () => {
    // expected: 80*6 + 20*5 = 580 ; actual: 680
    expect(r.verwachte_consumpties_totaal).toBe(580)
    expect(r.totaal_consumpties).toBe(680)
    expect(r.werkelijke_consumpties_per_persoon).toBeCloseTo(6.8, 6)
    expect(r.consumpties_verschil_per_persoon).toBeCloseTo(1, 6)
  })

  it('offers a hindsight price per head', () => {
    expect(r.hindsight_prijs_per_persoon).toBeGreaterThan(0)
  })

  it('reports the euro result', () => {
    expect(r.resultaat).toBeCloseTo(1640 - r.totaal_inkoopkost, 6)
  })
})
