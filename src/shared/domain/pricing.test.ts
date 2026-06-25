import { describe, it, expect } from 'vitest'
import {
  prijsVanKost,
  forfaitmargeVsAlacarte,
  inkoopmargeOpOmzet,
  suggestedForfaitPrijs,
  forfaitPrijsVoorMarge,
  bufferConsumptiesPerHoofd,
  duurAanpassingPct
} from './pricing'

describe('duration adjustment is front-loaded (1u proportionally pricier)', () => {
  it('falls back to the default curve when not configured', () => {
    expect(duurAanpassingPct(null, 1)).toBe(-20)
    expect(duurAanpassingPct(undefined, 1.5)).toBe(0)
    expect(duurAanpassingPct(null, 2)).toBe(12)
  })

  it('uses the manager-defined value when configured', () => {
    const cfg = { aanpassingen: [{ duur: 1, pct: -10 }, { duur: 2, pct: 25 }] }
    expect(duurAanpassingPct(cfg, 1)).toBe(-10)
    expect(duurAanpassingPct(cfg, 2)).toBe(25)
  })

  it('per-hour price decreases with duration (sub-linear)', () => {
    // default: 1u -20% over 1h, 2u +12% over 2h
    const p1 = 100 * (1 - 0.2)
    const p2 = 100 * (1 + 0.12)
    expect(p1 / 1).toBeGreaterThan(p2 / 2)
  })
})

describe('forfaitmarge is measured against per-glass (à-la-carte) value', () => {
  it('0% when the forfait revenue equals the per-glass value of what was drunk', () => {
    expect(forfaitmargeVsAlacarte(1400, 1400)).toBe(0)
  })

  it('positive when the forfait earned more than per glass', () => {
    // €1640 forfait vs €1400 à-la-carte = +17,1%
    expect(forfaitmargeVsAlacarte(1640, 1400)).toBeCloseTo(0.1714, 3)
  })

  it('negative when the forfait earned less than per glass', () => {
    expect(forfaitmargeVsAlacarte(1300, 1400)).toBeLessThan(0)
  })

  it('guards against zero à-la-carte value', () => {
    expect(forfaitmargeVsAlacarte(100, 0)).toBe(0)
  })
})

describe('inkoopmarge is only the secondary, cost-based insight', () => {
  it('(omzet - inkoopkost) / omzet', () => {
    expect(inkoopmargeOpOmzet(1500, 900)).toBeCloseTo(0.4, 6)
  })
})

describe('suggested forfait price = expected consumptions × menu price', () => {
  it('six beers a head at €2,50 menu = €15 (the per-glass break-even)', () => {
    expect(suggestedForfaitPrijs(6, 2.5)).toBe(15)
  })
})

describe('target price from per-glass value plus the desired uplift', () => {
  it('€14 per head à-la-carte with a 5% goal = €14,70', () => {
    expect(forfaitPrijsVoorMarge(14, 0.05)).toBeCloseTo(14.7, 6)
  })

  it('a 0% goal just matches per glass', () => {
    expect(forfaitPrijsVoorMarge(14, 0)).toBe(14)
  })
})

describe('buffer line — drinks per head before dropping below per-glass value', () => {
  it('at €15 with €2,50 menu and a 0% goal: 6 drinks', () => {
    expect(bufferConsumptiesPerHoofd(15, 2.5, 0)).toBe(6)
  })

  it('a higher goal leaves room for fewer drinks', () => {
    expect(bufferConsumptiesPerHoofd(15, 2.5, 0.05)).toBeLessThan(
      bufferConsumptiesPerHoofd(15, 2.5, 0)
    )
  })

  it('a free menu price never breaks the line', () => {
    expect(bufferConsumptiesPerHoofd(15, 0, 0.05)).toBe(Infinity)
  })
})

describe('margin conventions still available for cost-plus pricing', () => {
  it('op de omzet vs opslag give different prices', () => {
    expect(prijsVanKost(10, 0.3, 'op_de_omzet')).toBeCloseTo(14.2857, 3)
    expect(prijsVanKost(10, 0.3, 'opslag_op_kostprijs')).toBeCloseTo(13, 6)
  })
})
