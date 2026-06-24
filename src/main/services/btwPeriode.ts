// VAT due for a period (typically a quarter). Sums the per-party VAT over all
// registered parties whose date falls in [van, tot] (inclusive, ISO dates).

import { buildResultaat } from './resultaat'
import { listFeestOverzicht } from '../db/repo'

export interface BtwPeriodeFeest {
  feest_id: number
  naam: string
  datum: string
  verkoop_btw: number
  inkoop_btw: number
  verschuldigd: number
}

export interface BtwPeriode {
  van: string
  tot: string
  verkoop_btw: number
  inkoop_btw: number
  verschuldigd: number
  per_tarief: { tarief: number; inkoop_incl: number; btw: number }[]
  feesten: BtwPeriodeFeest[]
}

export function btwPeriode(van: string, tot: string): BtwPeriode {
  const tariefMap = new Map<number, { inkoop_incl: number; btw: number }>()
  const feesten: BtwPeriodeFeest[] = []
  let verkoop_btw = 0
  let inkoop_btw = 0

  for (const f of listFeestOverzicht()) {
    if (!f.geregistreerd) continue
    if (f.datum < van || f.datum > tot) continue
    const data = buildResultaat(f.id)
    if (!data) continue
    const b = data.resultaat.btw

    verkoop_btw += b.verkoop_btw
    inkoop_btw += b.inkoop_btw
    for (const pt of b.per_tarief) {
      const acc = tariefMap.get(pt.tarief) ?? { inkoop_incl: 0, btw: 0 }
      acc.inkoop_incl += pt.inkoop_incl
      acc.btw += pt.btw
      tariefMap.set(pt.tarief, acc)
    }
    feesten.push({
      feest_id: f.id,
      naam: f.naam,
      datum: f.datum,
      verkoop_btw: b.verkoop_btw,
      inkoop_btw: b.inkoop_btw,
      verschuldigd: b.verschuldigd
    })
  }

  feesten.sort((a, b) => a.datum.localeCompare(b.datum))

  return {
    van,
    tot,
    verkoop_btw,
    inkoop_btw,
    verschuldigd: verkoop_btw - inkoop_btw,
    per_tarief: [...tariefMap.entries()]
      .map(([tarief, v]) => ({ tarief, ...v }))
      .sort((a, b) => b.tarief - a.tarief),
    feesten
  }
}
