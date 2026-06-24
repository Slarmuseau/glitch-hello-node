// Inzichten — factual figures across all registered parties. No written advice;
// the numbers speak for themselves. Aggregates each party's snapshot-based
// result into rankings, per-type and per-forfait performance, an alcohol split,
// the highest-margin drinks (to promote), and a discount ledger.

import { kostprijsPerConsumptie, type Vat } from '@shared/domain'
import {
  listFeestOverzicht,
  getInstellingen,
  listForfaits,
  listDranken,
  listVaten
} from '../db/repo'
import { buildResultaat } from './resultaat'
import { forfaitHistoriek } from './forfaitHistoriek'

const TYPE_LABEL: Record<string, string> = {
  huwelijk: 'Huwelijk',
  bedrijfsfeest: 'Bedrijfsfeest',
  communie: 'Communie',
  verjaardag: 'Verjaardag',
  scoutsfeest: 'Scoutsfeest',
  andere: 'Andere'
}

// Heuristic split by category (refine later with a per-drink flag if needed).
const NON_ALCOHOLISCH = new Set(['Soft', 'Warm', 'Alcoholvrij bier', 'Mocktails'])
function isAlcoholisch(categorie: string): boolean {
  return !NON_ALCOHOLISCH.has(categorie)
}

export interface DrankAggregaat {
  drank_id: number
  naam: string
  categorie: string
  consumpties: number
  aandeel_consumpties: number
  omzet: number
  inkoopkost: number
  aandeel_kost: number
  kost_per_consumptie: number
}

export interface MargeRegel {
  drank_id: number
  naam: string
  categorie: string
  menuprijs: number
  kost: number
  marge_per_glas: number
  marge_pct: number
}

export interface TypePrestatie {
  type_feest: string
  label: string
  aantal_feesten: number
  gemiddelde_marge: number
  gemiddeld_verwacht_per_hoofd: number
  gemiddeld_werkelijk_per_hoofd: number
}

export interface ForfaitPrestatie {
  forfait_id: number
  forfait_naam: string
  aantal_feesten: number
  aantal_gehaald: number
  gemiddelde_marge: number
  richtprijs_historiek: number | null
}

export interface FeestRanking {
  feest_id: number
  naam: string
  type_feest: string
  label: string
  datum: string
  aantal_personen: number
  forfaitmarge: number
  alacarte_verschil: number
  resultaat: number
}

export interface KortingRegel {
  reden: string
  aantal_feesten: number
  weggegeven: number
}

export interface AlcoholDeel {
  consumpties: number
  omzet: number
}

export interface Inzichten {
  aantal_feesten: number
  globale_marge: number
  globaal_resultaat: number
  totaal_omzet: number
  totaal_kost: number
  totaal_alacarte: number
  totaal_consumpties: number
  consumpties_per_persoon: number
  alcohol: { alcoholisch: AlcoholDeel; nonalcoholisch: AlcoholDeel }
  drankRanking: DrankAggregaat[]
  zeldenGedronken: DrankAggregaat[]
  margeRanking: MargeRegel[]
  categorieMix: { categorie: string; consumpties: number; omzet: number; inkoopkost: number }[]
  typePrestatie: TypePrestatie[]
  forfaitPrestatie: ForfaitPrestatie[]
  feestRanking: FeestRanking[]
  kortingLedger: KortingRegel[]
  kortingTotaal: number
}

export function buildInzichten(): Inzichten {
  const inst = getInstellingen()
  const overzicht = listFeestOverzicht().filter((f) => f.geregistreerd)
  const forfaits = listForfaits()

  const dranken = new Map<number, DrankAggregaat>()
  const categorie = new Map<string, { consumpties: number; omzet: number; inkoopkost: number }>()
  const perType = new Map<
    string,
    { feesten: number; margeSom: number; verwachtSom: number; werkelijkSom: number }
  >()
  const perForfait = new Map<number, { feesten: number; gehaald: number; margeSom: number }>()
  const korting = new Map<string, { feesten: number; weggegeven: number }>()
  const feestRanking: FeestRanking[] = []
  const alcohol = { alcoholisch: { consumpties: 0, omzet: 0 }, nonalcoholisch: { consumpties: 0, omzet: 0 } }

  let totaalOmzet = 0
  let totaalKost = 0
  let totaalAlacarte = 0
  let totaalConsumpties = 0
  let totaalPersonen = 0
  let resultaatSom = 0
  let kortingTotaal = 0

  for (const f of overzicht) {
    const data = buildResultaat(f.id)
    if (!data) continue
    const r = data.resultaat

    totaalOmzet += r.forfait_omzet
    totaalKost += r.totaal_inkoopkost
    totaalAlacarte += r.alacarte_omzet
    totaalConsumpties += r.totaal_consumpties
    totaalPersonen += r.aantal_personen
    resultaatSom += r.resultaat

    for (const regel of r.regels) {
      const agg = dranken.get(regel.drank_id) ?? {
        drank_id: regel.drank_id,
        naam: regel.naam,
        categorie: regel.categorie,
        consumpties: 0,
        aandeel_consumpties: 0,
        omzet: 0,
        inkoopkost: 0,
        aandeel_kost: 0,
        kost_per_consumptie: 0
      }
      agg.consumpties += regel.consumpties
      agg.omzet += regel.alacarte_omzet
      agg.inkoopkost += regel.inkoopkost
      dranken.set(regel.drank_id, agg)

      const cat = categorie.get(regel.categorie) ?? { consumpties: 0, omzet: 0, inkoopkost: 0 }
      cat.consumpties += regel.consumpties
      cat.omzet += regel.alacarte_omzet
      cat.inkoopkost += regel.inkoopkost
      categorie.set(regel.categorie, cat)

      const bak = isAlcoholisch(regel.categorie) ? alcohol.alcoholisch : alcohol.nonalcoholisch
      bak.consumpties += regel.consumpties
      bak.omzet += regel.alacarte_omzet
    }

    const t = perType.get(f.type_feest) ?? { feesten: 0, margeSom: 0, verwachtSom: 0, werkelijkSom: 0 }
    t.feesten += 1
    t.margeSom += r.forfaitmarge
    t.verwachtSom += r.verwachte_consumpties_per_persoon
    t.werkelijkSom += r.werkelijke_consumpties_per_persoon
    perType.set(f.type_feest, t)

    for (const forfaitNaam of new Set(f.forfait_namen)) {
      const forfait = forfaits.find((x) => x.naam === forfaitNaam)
      if (!forfait) continue
      const p = perForfait.get(forfait.id) ?? { feesten: 0, gehaald: 0, margeSom: 0 }
      p.feesten += 1
      if (r.marge_gehaald) p.gehaald += 1
      p.margeSom += r.forfaitmarge
      perForfait.set(forfait.id, p)
    }

    feestRanking.push({
      feest_id: f.id,
      naam: f.naam,
      type_feest: f.type_feest,
      label: TYPE_LABEL[f.type_feest] ?? f.type_feest,
      datum: f.datum,
      aantal_personen: r.aantal_personen,
      forfaitmarge: r.forfaitmarge,
      alacarte_verschil: r.alacarte_verschil,
      resultaat: r.resultaat
    })

    if (r.totaal_korting > 0) {
      kortingTotaal += r.totaal_korting
      const reden = f.korting_reden?.trim() || 'geen reden opgegeven'
      const k = korting.get(reden) ?? { feesten: 0, weggegeven: 0 }
      k.feesten += 1
      k.weggegeven += r.totaal_korting
      korting.set(reden, k)
    }
  }

  const totaalDrankConsumpties = [...dranken.values()].reduce((s, d) => s + d.consumpties, 0)
  const totaalDrankKost = [...dranken.values()].reduce((s, d) => s + d.inkoopkost, 0)

  const drankList = [...dranken.values()].map((d) => ({
    ...d,
    aandeel_consumpties: totaalDrankConsumpties > 0 ? d.consumpties / totaalDrankConsumpties : 0,
    aandeel_kost: totaalDrankKost > 0 ? d.inkoopkost / totaalDrankKost : 0,
    kost_per_consumptie: d.consumpties > 0 ? d.inkoopkost / d.consumpties : 0
  }))

  const drankRanking = [...drankList].sort((a, b) => b.consumpties - a.consumpties)
  const zeldenGedronken = [...drankList]
    .filter((d) => d.consumpties > 0)
    .sort((a, b) => a.consumpties - b.consumpties)
    .slice(0, 8)

  // Highest margin per glass, from TODAY's prices (what to promote).
  const vaten = new Map<number, Vat>(listVaten().map((v) => [v.id, v]))
  const margeRanking: MargeRegel[] = listDranken()
    .filter((d) => d.menuprijs > 0)
    .map((d) => {
      const kost = kostprijsPerConsumptie(d, d.vat_id ? vaten.get(d.vat_id) ?? null : null)
      return {
        drank_id: d.id,
        naam: d.naam,
        categorie: d.categorie,
        menuprijs: d.menuprijs,
        kost,
        marge_per_glas: d.menuprijs - kost,
        marge_pct: (d.menuprijs - kost) / d.menuprijs
      }
    })
    .sort((a, b) => b.marge_per_glas - a.marge_per_glas)

  const typePrestatie: TypePrestatie[] = [...perType.entries()]
    .map(([type, v]) => ({
      type_feest: type,
      label: TYPE_LABEL[type] ?? type,
      aantal_feesten: v.feesten,
      gemiddelde_marge: v.margeSom / v.feesten,
      gemiddeld_verwacht_per_hoofd: v.verwachtSom / v.feesten,
      gemiddeld_werkelijk_per_hoofd: v.werkelijkSom / v.feesten
    }))
    .sort((a, b) => b.gemiddelde_marge - a.gemiddelde_marge)

  const forfaitPrestatie: ForfaitPrestatie[] = [...perForfait.entries()]
    .map(([id, v]) => {
      const forfait = forfaits.find((x) => x.id === id)
      const hist = forfaitHistoriek(id, inst.standaard_doelmarge)
      return {
        forfait_id: id,
        forfait_naam: forfait?.naam ?? '—',
        aantal_feesten: v.feesten,
        aantal_gehaald: v.gehaald,
        gemiddelde_marge: v.margeSom / v.feesten,
        richtprijs_historiek: hist.voorgestelde_prijs
      }
    })
    .sort((a, b) => b.gemiddelde_marge - a.gemiddelde_marge)

  const kortingLedger: KortingRegel[] = [...korting.entries()]
    .map(([reden, v]) => ({ reden, aantal_feesten: v.feesten, weggegeven: v.weggegeven }))
    .sort((a, b) => b.weggegeven - a.weggegeven)

  const categorieMix = [...categorie.entries()]
    .map(([categorie, v]) => ({ categorie, ...v }))
    .sort((a, b) => b.consumpties - a.consumpties)

  feestRanking.sort((a, b) => b.forfaitmarge - a.forfaitmarge)

  return {
    aantal_feesten: overzicht.length,
    globale_marge: totaalAlacarte > 0 ? (totaalOmzet - totaalAlacarte) / totaalAlacarte : 0,
    globaal_resultaat: resultaatSom,
    totaal_omzet: totaalOmzet,
    totaal_kost: totaalKost,
    totaal_alacarte: totaalAlacarte,
    totaal_consumpties: totaalConsumpties,
    consumpties_per_persoon: totaalPersonen > 0 ? totaalConsumpties / totaalPersonen : 0,
    alcohol,
    drankRanking,
    zeldenGedronken,
    margeRanking,
    categorieMix,
    typePrestatie,
    forfaitPrestatie,
    feestRanking,
    kortingLedger,
    kortingTotaal
  }
}
