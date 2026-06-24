// One-click export and import of all data, plus a spreadsheet-friendly CSV, so
// the owner never feels locked in. JSON keeps a full, re-importable backup; the
// CSV opens straight in Excel.

import {
  listDranken,
  listVaten,
  listForfaits,
  listFeesten,
  getFeest,
  getInstellingen,
  upsertVat,
  upsertDrank,
  upsertForfait,
  upsertFeest,
  saveRegistraties,
  saveInstellingen,
  wisAlleData,
  markDemoGeladen
} from '../db/repo'
import { kostprijsPerConsumptie, formatNumber, type Vat } from '@shared/domain'

export interface ExportBundle {
  app: 'tapwijs'
  versie: number
  geexporteerd: string
  dranken: ReturnType<typeof listDranken>
  vaten: ReturnType<typeof listVaten>
  forfaits: ReturnType<typeof listForfaits>
  feesten: NonNullable<ReturnType<typeof getFeest>>[]
  instellingen: ReturnType<typeof getInstellingen>
}

export function buildExport(): ExportBundle {
  const feesten = listFeesten()
    .map((f) => getFeest(f.id))
    .filter((f): f is NonNullable<typeof f> => f != null)
  return {
    app: 'tapwijs',
    versie: 1,
    geexporteerd: new Date().toISOString(),
    dranken: listDranken(),
    vaten: listVaten(),
    forfaits: listForfaits(),
    feesten,
    instellingen: getInstellingen()
  }
}

export function restoreImport(bundle: ExportBundle): void {
  if (bundle.app !== 'tapwijs') {
    throw new Error('Dit bestand is geen Tapwijs-export.')
  }
  wisAlleData()

  // Vaten keep their ids so drink links stay valid. better-sqlite3 lets us
  // pass an explicit id through upsert when present.
  const vatIdMap = new Map<number, number>()
  for (const v of bundle.vaten) {
    const saved = upsertVat({ ...v, id: undefined })
    vatIdMap.set(v.id, saved.id)
  }

  const drankIdMap = new Map<number, number>()
  for (const d of bundle.dranken) {
    const saved = upsertDrank({
      ...d,
      id: undefined,
      vat_id: d.vat_id ? vatIdMap.get(d.vat_id) ?? null : null
    })
    drankIdMap.set(d.id, saved.id)
  }

  for (const f of bundle.forfaits) {
    upsertForfait({
      ...f,
      id: undefined,
      toegestane_drank_ids: f.toegestane_drank_ids
        .map((id) => drankIdMap.get(id))
        .filter((x): x is number => x != null)
    })
  }

  for (const f of bundle.feesten) {
    const saved = upsertFeest({
      naam: f.naam,
      type_feest: f.type_feest,
      datum: f.datum,
      publiek: f.publiek,
      doelmarge: f.doelmarge,
      korting_reden: f.korting_reden,
      prijs_momentopname: f.prijs_momentopname,
      toewijzingen: f.toewijzingen.map((t) => ({
        forfait_id: null,
        forfait_naam: t.forfait_naam,
        aantal_personen: t.aantal_personen,
        forfaitprijs_per_persoon: t.forfaitprijs_per_persoon,
        korting_pct: t.korting_pct ?? 0
      }))
    })
    saveRegistraties(
      saved.id,
      f.registraties.map((r) => ({ ...r, drank_id: drankIdMap.get(r.drank_id) ?? r.drank_id }))
    )
  }

  saveInstellingen(bundle.instellingen)
  markDemoGeladen(false)
}

function csvCell(value: string | number): string {
  const s = String(value)
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Drinks + live margin as a semicolon CSV (Excel-friendly in nl-BE). */
export function drankenCsv(): string {
  const vaten = new Map<number, Vat>(listVaten().map((v) => [v.id, v]))
  const header = [
    'Drank',
    'Categorie',
    'Schenkwijze',
    'Menuprijs',
    'Inkoopprijs/consumptie (afgeleid)',
    'Menumarge'
  ]
  const lines = [header.map(csvCell).join(';')]
  for (const d of listDranken()) {
    const vat = d.vat_id ? vaten.get(d.vat_id) : null
    const kost = kostprijsPerConsumptie(d, vat)
    const marge = d.menuprijs > 0 ? (d.menuprijs - kost) / d.menuprijs : 0
    lines.push(
      [
        d.naam,
        d.categorie,
        d.schenkwijze,
        formatNumber(d.menuprijs, 2),
        formatNumber(kost, 4),
        formatNumber(marge * 100, 1) + '%'
      ]
        .map(csvCell)
        .join(';')
    )
  }
  return lines.join('\n')
}
