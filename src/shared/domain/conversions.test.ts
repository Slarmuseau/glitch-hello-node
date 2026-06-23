import { describe, it, expect } from 'vitest'
import {
  brutoConsumptiesPerVat,
  nettoConsumptiesPerVat,
  kostprijsPerConsumptieUitVat,
  consumptiesPerFles,
  kostprijsPerConsumptieUitFles,
  consumptiesUitFles,
  litersUitVat,
  consumptiesUitVatWeging,
  inkoopkostUitVatWeging,
  kostprijsPerConsumptie
} from './conversions'
import type { Drank, Vat } from './types'

// The brief's worked example: 30L barrel, 10kg tare, 5% loss.
const stellaVat: Vat = {
  id: 1,
  naam: 'Stella vat',
  gekoppelde_drank_id: 1,
  leeg_gewicht_kg: 10,
  inhoud_liter: 30,
  dichtheid: 1.0,
  inkoopprijs_per_vat: 65,
  verlies_percentage: 5
}

describe('uit vat — barrel maths (brief worked example)', () => {
  it('25cl pours 114 glasses after 5% loss', () => {
    expect(brutoConsumptiesPerVat(30, 25)).toBe(120)
    expect(Math.round(nettoConsumptiesPerVat(30, 25, 5))).toBe(114)
  })

  it('33cl pours 86 glasses after 5% loss', () => {
    expect(Math.round(nettoConsumptiesPerVat(30, 33, 5))).toBe(86)
  })

  it('50cl pours 57 glasses after 5% loss', () => {
    expect(brutoConsumptiesPerVat(30, 50)).toBe(60)
    expect(Math.round(nettoConsumptiesPerVat(30, 50, 5))).toBe(57)
  })

  it('a €65 keg at 25cl costs about €0,57 per served glass', () => {
    const cost = kostprijsPerConsumptieUitVat(65, 30, 25, 5)
    expect(cost).toBeCloseTo(0.57, 2)
  })

  it('cost per served glass rises when loss rises (he pays for the foam)', () => {
    const noLoss = kostprijsPerConsumptieUitVat(65, 30, 25, 0)
    const withLoss = kostprijsPerConsumptieUitVat(65, 30, 25, 5)
    expect(withLoss).toBeGreaterThan(noLoss)
  })
})

describe('uit vat — closing-weight measurement', () => {
  it('a full keg drained empty draws all its liters', () => {
    expect(litersUitVat(stellaVat, { aantal_vaten_geopend: 1, gewicht_laatste_vat_kg: 10 })).toBe(
      30
    )
  })

  it('a half-full closing weight means half the keg was drawn', () => {
    // 25kg gross - 10kg tare = 15L remaining, so 15L drawn from a 30L keg.
    expect(
      litersUitVat(stellaVat, { aantal_vaten_geopend: 1, gewicht_laatste_vat_kg: 25 })
    ).toBe(15)
  })

  it('two kegs opened, last one half full = 45L drawn', () => {
    expect(
      litersUitVat(stellaVat, { aantal_vaten_geopend: 2, gewicht_laatste_vat_kg: 25 })
    ).toBe(45)
  })

  it('derives served consumptions and pro-rata cost from the weight', () => {
    // One full 30L keg at 25cl => 114 served glasses, €65 cost.
    const cons = consumptiesUitVatWeging(stellaVat, 25, {
      aantal_vaten_geopend: 1,
      gewicht_laatste_vat_kg: 10
    })
    expect(Math.round(cons)).toBe(114)
    expect(inkoopkostUitVatWeging(stellaVat, { aantal_vaten_geopend: 1, gewicht_laatste_vat_kg: 10 })).toBeCloseTo(
      65,
      6
    )
  })
})

describe('uit fles — bottle maths', () => {
  it('a 150cl bottle poured in 25cl glasses yields 6 consumptions', () => {
    expect(consumptiesPerFles(150, 25)).toBe(6)
  })

  it('cost per consumption splits the bottle price across its glasses', () => {
    // €1,30 cola bottle / 6 glasses ≈ €0,2167
    expect(kostprijsPerConsumptieUitFles(1.3, 150, 25)).toBeCloseTo(1.3 / 6, 6)
  })

  it('3 emptied bottles = 18 consumptions', () => {
    expect(consumptiesUitFles(3, 150, 25)).toBe(18)
  })

  it('changing glaasgrootte changes both consumptions and cost', () => {
    // Wine: 75cl bottle in 12,5cl glasses = 6 glasses.
    expect(consumptiesPerFles(75, 12.5)).toBe(6)
    // Champagne flute 10cl from 75cl = 7,5 glasses.
    expect(consumptiesPerFles(75, 10)).toBe(7.5)
  })
})

describe('kostprijsPerConsumptie — unified dispatch', () => {
  it('per stuk returns the typed unit cost', () => {
    const d: Drank = {
      id: 1,
      naam: 'Duvel',
      categorie: 'Bier',
      menuprijs: 6,
      glaasgrootte_cl: 33,
      schenkwijze: 'per_stuk',
      is_cocktail: false,
      inkoopprijs_per_consumptie: 1.1
    }
    expect(kostprijsPerConsumptie(d)).toBe(1.1)
  })

  it('uit vat needs the linked keg', () => {
    const d: Drank = {
      id: 1,
      naam: 'Stella 25cl',
      categorie: 'Bier',
      menuprijs: 3.5,
      glaasgrootte_cl: 25,
      schenkwijze: 'uit_vat',
      is_cocktail: false,
      vat_id: 1
    }
    expect(kostprijsPerConsumptie(d, stellaVat)).toBeCloseTo(0.57, 2)
    // Without the keg, it degrades to 0 instead of throwing.
    expect(kostprijsPerConsumptie(d, null)).toBe(0)
  })
})
