import { describe, it, expect } from 'vitest'
import {
  prijsVanKost,
  forfaitmarge,
  suggestedForfaitPrijs,
  bufferConsumptiesPerHoofd,
  hindsightPrijsPerPersoon
} from './pricing'

describe('margin conventions give different prices', () => {
  it('op de omzet: prijs = kost / (1 - marge)', () => {
    expect(prijsVanKost(10, 0.3, 'op_de_omzet')).toBeCloseTo(14.2857, 3)
  })

  it('opslag op de kostprijs: prijs = kost * (1 + marge)', () => {
    expect(prijsVanKost(10, 0.3, 'opslag_op_kostprijs')).toBeCloseTo(13, 6)
  })

  it('the two conventions disagree on purpose', () => {
    const omzet = prijsVanKost(10, 0.3, 'op_de_omzet')
    const opslag = prijsVanKost(10, 0.3, 'opslag_op_kostprijs')
    expect(omzet).not.toBeCloseTo(opslag, 2)
  })
})

describe('forfaitmarge is always measured op de omzet', () => {
  it('(omzet - kost) / omzet', () => {
    expect(forfaitmarge(1500, 900)).toBeCloseTo(0.4, 6)
  })

  it('a forfait that exactly covers the cost has 0% margin', () => {
    expect(forfaitmarge(900, 900)).toBe(0)
  })

  it('guards against zero revenue', () => {
    expect(forfaitmarge(0, 100)).toBe(0)
  })
})

describe('suggested forfait price = expected consumptions × menu price', () => {
  it('six beers a head at €2,50 menu = €15', () => {
    expect(suggestedForfaitPrijs(6, 2.5)).toBe(15)
  })
})

describe('buffer line — how many drinks a head before the floor breaks', () => {
  it('at €15 with €0,57 cost and a 0% floor', () => {
    // 15 * (1 - 0) / 0.57 = 26.3 -> 26
    expect(bufferConsumptiesPerHoofd(15, 0.57, 0)).toBe(26)
  })

  it('a higher floor leaves room for fewer drinks', () => {
    const floor0 = bufferConsumptiesPerHoofd(15, 0.57, 0)
    const floor30 = bufferConsumptiesPerHoofd(15, 0.57, 0.3)
    expect(floor30).toBeLessThan(floor0)
  })

  it('a free (zero-cost) drink never breaks the floor', () => {
    expect(bufferConsumptiesPerHoofd(15, 0, 0.3)).toBe(Infinity)
  })
})

describe('hindsight price uses the chosen convention', () => {
  it('matches prijsVanKost on the per-head cost', () => {
    expect(hindsightPrijsPerPersoon(8, 0.3, 'op_de_omzet')).toBeCloseTo(
      prijsVanKost(8, 0.3, 'op_de_omzet'),
      6
    )
  })
})
