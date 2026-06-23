// The third pricing path: once enough parties exist, propose a forfait price
// from history — recomputed at TODAY's menu prices — that reaches the target
// uplift over selling per glass.
//
// Consumptions are measured per party, not per attribution, so we attribute a
// party's à-la-carte value per head to every forfait it used. Rough but honest,
// and it only surfaces once there is real history.

import {
  consumptiesUitFles,
  consumptiesUitVatWeging,
  forfaitPrijsVoorMarge,
  type Vat
} from '@shared/domain'
import { listDranken, listVaten, listFeesten, getFeest } from '../db/repo'

export interface ForfaitHistoriek {
  aantal_feesten: number
  /** Average à-la-carte value per head (at today's menu prices). */
  gemiddelde_alacarte_per_hoofd: number
  voorgestelde_prijs: number | null
}

export function forfaitHistoriek(forfaitId: number, doelmarge: number): ForfaitHistoriek {
  const dranken = new Map(listDranken().map((d) => [d.id, d]))
  const vaten = new Map<number, Vat>(listVaten().map((v) => [v.id, v]))

  const alacartePerHoofd: number[] = []

  for (const f of listFeesten()) {
    const feest = getFeest(f.id)
    if (!feest) continue
    if (!feest.toewijzingen.some((t) => t.forfait_id === forfaitId)) continue
    if (feest.registraties.length === 0) continue

    const personen = feest.toewijzingen.reduce((s, t) => s + t.aantal_personen, 0)
    if (personen <= 0) continue

    let alacarteVandaag = 0
    for (const reg of feest.registraties) {
      const drank = dranken.get(reg.drank_id)
      if (!drank) continue
      let cons = 0
      if (drank.is_cocktail) cons = reg.cocktail_tally ?? 0
      else if (drank.schenkwijze === 'per_stuk') cons = reg.aantal_empties ?? 0
      else if (drank.schenkwijze === 'uit_fles')
        cons = consumptiesUitFles(reg.aantal_flessen ?? 0, drank.fles_inhoud_cl ?? 0, drank.glaasgrootte_cl)
      else if (drank.schenkwijze === 'uit_vat') {
        const vat = drank.vat_id ? vaten.get(drank.vat_id) : undefined
        if (vat)
          cons = consumptiesUitVatWeging(vat, drank.glaasgrootte_cl, {
            aantal_vaten_geopend: reg.aantal_vaten_geopend ?? 0,
            gewicht_laatste_vat_kg: reg.gewicht_laatste_vat_kg
          })
      }
      // Value at today's menu price (per-glass value).
      alacarteVandaag += cons * drank.menuprijs
    }
    alacartePerHoofd.push(alacarteVandaag / personen)
  }

  if (alacartePerHoofd.length === 0) {
    return { aantal_feesten: 0, gemiddelde_alacarte_per_hoofd: 0, voorgestelde_prijs: null }
  }

  const gem = alacartePerHoofd.reduce((s, x) => s + x, 0) / alacartePerHoofd.length
  return {
    aantal_feesten: alacartePerHoofd.length,
    gemiddelde_alacarte_per_hoofd: gem,
    voorgestelde_prijs: forfaitPrijsVoorMarge(gem, doelmarge)
  }
}
