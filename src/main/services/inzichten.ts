// Inzichten — holistic conclusions across all registered parties. Aggregates
// the per-party results (built from each party's own price snapshot) into
// rankings, per-type and per-forfait performance, a discount ledger, and a set
// of plain-language pieces of advice. The owner reads conclusions, not tables.

import { formatPercent, formatEuro, formatNumber } from '@shared/domain'
import { listFeestOverzicht, getInstellingen } from '../db/repo'
import { buildResultaat } from './resultaat'
import { forfaitHistoriek } from './forfaitHistoriek'
import { listForfaits } from '../db/repo'

const TYPE_LABEL: Record<string, string> = {
  huwelijk: 'Huwelijk',
  bedrijfsfeest: 'Bedrijfsfeest',
  communie: 'Communie',
  verjaardag: 'Verjaardag',
  scoutsfeest: 'Scoutsfeest',
  andere: 'Andere'
}

export interface DrankAggregaat {
  drank_id: number
  naam: string
  categorie: string
  consumpties: number
  aandeel_consumpties: number
  inkoopkost: number
  aandeel_kost: number
  kost_per_consumptie: number
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

export interface KortingRegel {
  reden: string
  aantal_feesten: number
  weggegeven: number
}

export interface Advies {
  tone: 'goed' | 'let_op' | 'tip'
  tekst: string
}

export interface Inzichten {
  aantal_feesten: number
  globale_marge: number
  globaal_resultaat: number
  totaal_omzet: number
  totaal_kost: number
  drankRanking: DrankAggregaat[]
  zeldenGedronken: DrankAggregaat[]
  categorieMix: { categorie: string; consumpties: number; inkoopkost: number }[]
  typePrestatie: TypePrestatie[]
  forfaitPrestatie: ForfaitPrestatie[]
  kortingLedger: KortingRegel[]
  kortingTotaal: number
  advies: Advies[]
}

export function buildInzichten(): Inzichten {
  const inst = getInstellingen()
  const overzicht = listFeestOverzicht().filter((f) => f.geregistreerd)
  const forfaits = listForfaits()

  const dranken = new Map<number, DrankAggregaat>()
  const categorie = new Map<string, { consumpties: number; inkoopkost: number }>()
  const perType = new Map<
    string,
    { feesten: number; margeSom: number; verwachtSom: number; werkelijkSom: number }
  >()
  const perForfait = new Map<number, { feesten: number; gehaald: number; margeSom: number }>()
  const korting = new Map<string, { feesten: number; weggegeven: number }>()

  let totaalOmzet = 0
  let totaalKost = 0
  let resultaatSom = 0
  let kortingTotaal = 0

  for (const f of overzicht) {
    const data = buildResultaat(f.id)
    if (!data) continue
    const r = data.resultaat

    totaalOmzet += r.forfait_omzet
    totaalKost += r.totaal_inkoopkost
    resultaatSom += r.resultaat

    for (const regel of r.regels) {
      const agg = dranken.get(regel.drank_id) ?? {
        drank_id: regel.drank_id,
        naam: regel.naam,
        categorie: regel.categorie,
        consumpties: 0,
        aandeel_consumpties: 0,
        inkoopkost: 0,
        aandeel_kost: 0,
        kost_per_consumptie: 0
      }
      agg.consumpties += regel.consumpties
      agg.inkoopkost += regel.inkoopkost
      dranken.set(regel.drank_id, agg)

      const cat = categorie.get(regel.categorie) ?? { consumpties: 0, inkoopkost: 0 }
      cat.consumpties += regel.consumpties
      cat.inkoopkost += regel.inkoopkost
      categorie.set(regel.categorie, cat)
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

    // Discount ledger: margin cushion forgone vs the standard floor.
    if (f.doelmarge < inst.standaard_doelmarge) {
      const weggegeven = r.forfait_omzet * (inst.standaard_doelmarge - f.doelmarge)
      kortingTotaal += weggegeven
      const reden = f.korting_reden?.trim() || 'geen reden opgegeven'
      const k = korting.get(reden) ?? { feesten: 0, weggegeven: 0 }
      k.feesten += 1
      k.weggegeven += weggegeven
      korting.set(reden, k)
    }
  }

  const totaalConsumpties = [...dranken.values()].reduce((s, d) => s + d.consumpties, 0)
  const totaalDrankKost = [...dranken.values()].reduce((s, d) => s + d.inkoopkost, 0)

  const drankList = [...dranken.values()].map((d) => ({
    ...d,
    aandeel_consumpties: totaalConsumpties > 0 ? d.consumpties / totaalConsumpties : 0,
    aandeel_kost: totaalDrankKost > 0 ? d.inkoopkost / totaalDrankKost : 0,
    kost_per_consumptie: d.consumpties > 0 ? d.inkoopkost / d.consumpties : 0
  }))

  const drankRanking = [...drankList].sort((a, b) => b.consumpties - a.consumpties)
  const zeldenGedronken = [...drankList]
    .filter((d) => d.consumpties > 0)
    .sort((a, b) => a.consumpties - b.consumpties)
    .slice(0, 6)

  const typePrestatie: TypePrestatie[] = [...perType.entries()]
    .map(([type, v]) => ({
      type_feest: type,
      label: TYPE_LABEL[type] ?? type,
      aantal_feesten: v.feesten,
      gemiddelde_marge: v.margeSom / v.feesten,
      gemiddeld_verwacht_per_hoofd: v.verwachtSom / v.feesten,
      gemiddeld_werkelijk_per_hoofd: v.werkelijkSom / v.feesten
    }))
    .sort((a, b) => b.aantal_feesten - a.aantal_feesten)

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
    .sort((a, b) => b.aantal_feesten - a.aantal_feesten)

  const kortingLedger: KortingRegel[] = [...korting.entries()]
    .map(([reden, v]) => ({ reden, aantal_feesten: v.feesten, weggegeven: v.weggegeven }))
    .sort((a, b) => b.weggegeven - a.weggegeven)

  const categorieMix = [...categorie.entries()]
    .map(([categorie, v]) => ({ categorie, ...v }))
    .sort((a, b) => b.consumpties - a.consumpties)

  return {
    aantal_feesten: overzicht.length,
    globale_marge: totaalOmzet > 0 ? (totaalOmzet - totaalKost) / totaalOmzet : 0,
    globaal_resultaat: resultaatSom,
    totaal_omzet: totaalOmzet,
    totaal_kost: totaalKost,
    drankRanking,
    zeldenGedronken,
    categorieMix,
    typePrestatie,
    forfaitPrestatie,
    kortingLedger,
    kortingTotaal,
    advies: maakAdvies({
      drankRanking,
      zeldenGedronken,
      typePrestatie,
      forfaitPrestatie,
      kortingTotaal,
      globaleMarge: totaalOmzet > 0 ? (totaalOmzet - totaalKost) / totaalOmzet : 0,
      doelmarge: inst.standaard_doelmarge
    })
  }
}

function maakAdvies(d: {
  drankRanking: DrankAggregaat[]
  zeldenGedronken: DrankAggregaat[]
  typePrestatie: TypePrestatie[]
  forfaitPrestatie: ForfaitPrestatie[]
  kortingTotaal: number
  globaleMarge: number
  doelmarge: number
}): Advies[] {
  const advies: Advies[] = []

  // Overall health.
  if (d.globaleMarge >= d.doelmarge) {
    advies.push({
      tone: 'goed',
      tekst: `Over alle feesten heen haal je een marge van ${formatPercent(
        d.globaleMarge
      )}, boven je doelmarge van ${formatPercent(d.doelmarge)}. Mooi werk.`
    })
  } else {
    advies.push({
      tone: 'let_op',
      tekst: `Je globale marge is ${formatPercent(d.globaleMarge)}, onder je doelmarge van ${formatPercent(
        d.doelmarge
      )}. Bekijk de forfaits hieronder die het vaakst onder de ondergrens duiken.`
    })
  }

  // Forfaits that often miss the floor.
  for (const f of d.forfaitPrestatie) {
    if (f.aantal_feesten < 2) continue
    const ratio = f.aantal_gehaald / f.aantal_feesten
    if (ratio < 0.6) {
      const prijs = f.richtprijs_historiek
        ? ` Een prijs van ${formatEuro(f.richtprijs_historiek)} (uit je historiek) zou je ondergrens halen.`
        : ''
      advies.push({
        tone: 'let_op',
        tekst: `“${f.forfait_naam}” haalt maar in ${f.aantal_gehaald} van ${f.aantal_feesten} feesten je ondergrens.${prijs}`
      })
    } else if (ratio === 1) {
      advies.push({
        tone: 'goed',
        tekst: `“${f.forfait_naam}” haalde in alle ${f.aantal_feesten} feesten je ondergrens — een betrouwbaar forfait.`
      })
    }
  }

  // Crowds that out-drink their forfait.
  for (const t of d.typePrestatie) {
    if (t.aantal_feesten < 2 || t.gemiddeld_verwacht_per_hoofd <= 0) continue
    const verschil =
      (t.gemiddeld_werkelijk_per_hoofd - t.gemiddeld_verwacht_per_hoofd) /
      t.gemiddeld_verwacht_per_hoofd
    if (verschil > 0.15) {
      advies.push({
        tone: 'tip',
        tekst: `${t.label} drinkt gemiddeld ${formatPercent(
          verschil
        )} méér dan verwacht (${formatNumber(t.gemiddeld_werkelijk_per_hoofd)} vs ${formatNumber(
          t.gemiddeld_verwacht_per_hoofd
        )} per hoofd). Verhoog de verwachte consumpties of de prijs voor dit type.`
      })
    }
  }

  // Drinks that weigh most on the margin (popular AND expensive per glass).
  const risico = [...d.drankRanking]
    .filter((x) => x.consumpties > 0)
    .sort((a, b) => b.inkoopkost - a.inkoopkost)[0]
  if (risico) {
    advies.push({
      tone: 'tip',
      tekst: `“${risico.naam}” weegt het zwaarst op je marge: ${formatEuro(
        risico.inkoopkost
      )} inkoopkost (${formatPercent(risico.aandeel_kost)} van alle drankkost), aan ${formatEuro(
        risico.kost_per_consumptie
      )} per consumptie.`
    })
  }

  // Rarely poured drinks.
  if (d.zeldenGedronken.length > 0) {
    const z = d.zeldenGedronken[0]
    advies.push({
      tone: 'tip',
      tekst: `“${z.naam}” werd amper geschonken (${formatNumber(
        z.consumpties,
        0
      )} consumpties in totaal). Overweeg ze te schrappen of net te promoten.`
    })
  }

  // Discounts given.
  if (d.kortingTotaal > 0) {
    advies.push({
      tone: 'tip',
      tekst: `Je gaf dit jaar ongeveer ${formatEuro(
        d.kortingTotaal
      )} aan margebuffer weg via kortingen. Dat is geen verlies, maar wel een bewuste keuze om trots op te zijn.`
    })
  }

  return advies
}
