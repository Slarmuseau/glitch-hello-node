// Builds the party result from stored measurements + the price snapshot,
// using the pure domain logic. Also produces a plain-language explanation of
// how each consumption count was derived, so the screen can show the working.

import {
  computeFeestResultaat,
  consumptiesUitFles,
  consumptiesUitVatWeging,
  litersUitVat,
  duurFactor,
  formatNumber,
  type FeestResultaat,
  type ResultaatRegelInput,
  type AttributieInput,
  type Vat
} from '@shared/domain'
import { getFeest, listDranken, listVaten, listForfaits, getInstellingen } from '../db/repo'

export interface RegelToelichting {
  drank_id: number
  naam: string
  schenkwijze: string
  meting: string
  berekening: string
}

export interface ResultaatData {
  feestId: number
  resultaat: FeestResultaat
  toelichtingen: RegelToelichting[]
}

export function buildResultaat(feestId: number): ResultaatData | null {
  const feest = getFeest(feestId)
  if (!feest) return null

  const dranken = new Map(listDranken().map((d) => [d.id, d]))
  const vaten = new Map<number, Vat>(listVaten().map((v) => [v.id, v]))
  const forfaits = new Map(listForfaits().map((f) => [f.id, f]))

  const regels: ResultaatRegelInput[] = []
  const toelichtingen: RegelToelichting[] = []

  for (const reg of feest.registraties) {
    const drank = dranken.get(reg.drank_id)
    if (!drank) continue

    let consumpties = 0
    let meting = ''
    let berekening = ''

    if (drank.is_cocktail) {
      consumpties = reg.cocktail_tally ?? 0
      meting = `${formatNumber(consumpties)} geteld bij bereiding`
      berekening = `${formatNumber(consumpties)} consumpties`
    } else if (drank.schenkwijze === 'per_stuk') {
      consumpties = reg.aantal_empties ?? 0
      meting = `${formatNumber(consumpties)} leeggoed geteld`
      berekening = `1 leeg = 1 consumptie → ${formatNumber(consumpties)}`
    } else if (drank.schenkwijze === 'uit_fles') {
      const flessen = reg.aantal_flessen ?? 0
      consumpties = consumptiesUitFles(flessen, drank.fles_inhoud_cl ?? 0, drank.glaasgrootte_cl)
      meting = `${formatNumber(flessen)} flessen leeg`
      berekening = `${formatNumber(flessen)} × (${formatNumber(drank.fles_inhoud_cl ?? 0)}cl ÷ ${formatNumber(
        drank.glaasgrootte_cl
      )}cl) = ${formatNumber(consumpties)}`
    } else if (drank.schenkwijze === 'uit_vat') {
      const vat = drank.vat_id ? vaten.get(drank.vat_id) : undefined
      if (vat) {
        const weging = {
          aantal_vaten_geopend: reg.aantal_vaten_geopend ?? 0,
          gewicht_laatste_vat_kg: reg.gewicht_laatste_vat_kg
        }
        const liters = litersUitVat(vat, weging)
        consumpties = consumptiesUitVatWeging(vat, drank.glaasgrootte_cl, weging)
        meting = `${formatNumber(weging.aantal_vaten_geopend)} vaten, laatste ${
          weging.gewicht_laatste_vat_kg != null ? formatNumber(weging.gewicht_laatste_vat_kg) + ' kg' : 'leeg'
        }`
        berekening = `${formatNumber(liters)} L getapt ÷ ${formatNumber(
          drank.glaasgrootte_cl / 100
        )} L × (1 − ${formatNumber(vat.verlies_percentage)}%) = ${formatNumber(consumpties)}`
      }
    }

    const snapshot = feest.prijs_momentopname[reg.drank_id]
    const inkoop = snapshot?.inkoopprijs ?? 0
    const menu = snapshot?.menuprijs ?? drank.menuprijs

    if (consumpties > 0 || snapshot) {
      regels.push({
        drank_id: drank.id,
        naam: drank.naam,
        categorie: drank.categorie,
        consumpties,
        inkoopprijs_per_consumptie: inkoop,
        menuprijs: menu
      })
      toelichtingen.push({ drank_id: drank.id, naam: drank.naam, schenkwijze: drank.schenkwijze, meting, berekening })
    }
  }

  const inst = getInstellingen()
  const attributies: AttributieInput[] = feest.toewijzingen.map((t) => {
    const forfait = t.forfait_id ? forfaits.get(t.forfait_id) : undefined
    // Expected consumptions scale with the group's duration (same factor as the
    // price suggestion), front-loaded vs the forfait's standard duration.
    const factor = duurFactor(
      t.duur_uur ?? 1.5,
      forfait?.standaardduur_uur ?? 1.5,
      inst.duur_gewicht_eerste_uur,
      inst.duur_gewicht_extra_uur
    )
    const verwacht =
      forfait?.verwachte_consumpties_per_persoon != null
        ? forfait.verwachte_consumpties_per_persoon * factor
        : null
    return {
      forfait_naam: t.forfait_naam,
      aantal_personen: t.aantal_personen,
      forfaitprijs_per_persoon: t.forfaitprijs_per_persoon,
      korting_pct: t.korting_pct ?? 0,
      verwachte_consumpties_per_persoon: verwacht
    }
  })

  const resultaat = computeFeestResultaat(regels, attributies, feest.doelmarge)

  return { feestId, resultaat, toelichtingen }
}
