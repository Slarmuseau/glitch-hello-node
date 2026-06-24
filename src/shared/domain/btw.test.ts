import { describe, it, expect } from 'vitest'
import { btwInBedrag, exclBtw } from './btw'

describe('btw on an inclusive amount', () => {
  it('21% in €121 is €21', () => {
    expect(btwInBedrag(121, 21)).toBeCloseTo(21, 6)
    expect(exclBtw(121, 21)).toBeCloseTo(100, 6)
  })

  it('6% in €106 is €6', () => {
    expect(btwInBedrag(106, 6)).toBeCloseTo(6, 6)
  })

  it('0% rate yields no VAT', () => {
    expect(btwInBedrag(100, 0)).toBe(0)
  })
})
