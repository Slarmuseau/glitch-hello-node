// Data-access layer. Maps SQLite rows to/from the shared domain types. All
// reads/writes for the renderer go through these functions (via IPC).

import type {
  Drank,
  Vat,
  Forfait,
  Feest,
  Toewijzing,
  Instellingen,
  PrijsMomentopname
} from '@shared/domain'
import { getDb } from './database'

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapDrank(row: any): Drank {
  return {
    id: row.id,
    naam: row.naam,
    categorie: row.categorie,
    menuprijs: row.menuprijs,
    glaasgrootte_cl: row.glaasgrootte_cl,
    schenkwijze: row.schenkwijze,
    is_cocktail: !!row.is_cocktail,
    inkoopprijs_per_consumptie: row.inkoopprijs_per_consumptie,
    fles_inhoud_cl: row.fles_inhoud_cl,
    inkoopprijs_per_fles: row.inkoopprijs_per_fles,
    vat_id: row.vat_id,
    btw_inkoop: row.btw_inkoop,
    btw_verkoop: row.btw_verkoop
  }
}

function mapVat(row: any): Vat {
  return {
    id: row.id,
    naam: row.naam,
    gekoppelde_drank_id: row.gekoppelde_drank_id,
    leeg_gewicht_kg: row.leeg_gewicht_kg,
    inhoud_liter: row.inhoud_liter,
    dichtheid: row.dichtheid,
    inkoopprijs_per_vat: row.inkoopprijs_per_vat,
    verlies_percentage: row.verlies_percentage
  }
}

// ---------------------------------------------------------------------------
// Vaten
// ---------------------------------------------------------------------------

export function listVaten(): Vat[] {
  return getDb().prepare('SELECT * FROM vaten ORDER BY naam').all().map(mapVat)
}

export function upsertVat(v: Omit<Vat, 'id'> & { id?: number }): Vat {
  const db = getDb()
  if (v.id) {
    db.prepare(
      `UPDATE vaten SET naam=@naam, gekoppelde_drank_id=@gekoppelde_drank_id,
        leeg_gewicht_kg=@leeg_gewicht_kg, inhoud_liter=@inhoud_liter, dichtheid=@dichtheid,
        inkoopprijs_per_vat=@inkoopprijs_per_vat, verlies_percentage=@verlies_percentage
       WHERE id=@id`
    ).run(v)
    return mapVat(db.prepare('SELECT * FROM vaten WHERE id=?').get(v.id))
  }
  const info = db
    .prepare(
      `INSERT INTO vaten (naam, gekoppelde_drank_id, leeg_gewicht_kg, inhoud_liter, dichtheid,
        inkoopprijs_per_vat, verlies_percentage)
       VALUES (@naam, @gekoppelde_drank_id, @leeg_gewicht_kg, @inhoud_liter, @dichtheid,
        @inkoopprijs_per_vat, @verlies_percentage)`
    )
    .run({ gekoppelde_drank_id: null, ...v })
  return mapVat(db.prepare('SELECT * FROM vaten WHERE id=?').get(info.lastInsertRowid))
}

export function deleteVat(id: number): void {
  getDb().prepare('DELETE FROM vaten WHERE id=?').run(id)
}

// ---------------------------------------------------------------------------
// Dranken
// ---------------------------------------------------------------------------

export function listDranken(): Drank[] {
  return getDb()
    .prepare('SELECT * FROM dranken ORDER BY sort_order, categorie, naam')
    .all()
    .map(mapDrank)
}

export function upsertDrank(d: Omit<Drank, 'id'> & { id?: number }): Drank {
  const db = getDb()
  const params = {
    naam: d.naam,
    categorie: d.categorie,
    menuprijs: d.menuprijs,
    glaasgrootte_cl: d.glaasgrootte_cl,
    schenkwijze: d.schenkwijze,
    is_cocktail: d.is_cocktail ? 1 : 0,
    inkoopprijs_per_consumptie: d.inkoopprijs_per_consumptie ?? null,
    fles_inhoud_cl: d.fles_inhoud_cl ?? null,
    inkoopprijs_per_fles: d.inkoopprijs_per_fles ?? null,
    vat_id: d.vat_id ?? null,
    btw_inkoop: d.btw_inkoop ?? 21,
    btw_verkoop: d.btw_verkoop ?? 21,
    id: d.id
  }
  if (d.id) {
    db.prepare(
      `UPDATE dranken SET naam=@naam, categorie=@categorie, menuprijs=@menuprijs,
        glaasgrootte_cl=@glaasgrootte_cl, schenkwijze=@schenkwijze, is_cocktail=@is_cocktail,
        inkoopprijs_per_consumptie=@inkoopprijs_per_consumptie, fles_inhoud_cl=@fles_inhoud_cl,
        inkoopprijs_per_fles=@inkoopprijs_per_fles, vat_id=@vat_id, btw_inkoop=@btw_inkoop,
        btw_verkoop=@btw_verkoop WHERE id=@id`
    ).run(params)
    return mapDrank(db.prepare('SELECT * FROM dranken WHERE id=?').get(d.id))
  }
  const info = db
    .prepare(
      `INSERT INTO dranken (naam, categorie, menuprijs, glaasgrootte_cl, schenkwijze, is_cocktail,
        inkoopprijs_per_consumptie, fles_inhoud_cl, inkoopprijs_per_fles, vat_id, btw_inkoop, btw_verkoop)
       VALUES (@naam, @categorie, @menuprijs, @glaasgrootte_cl, @schenkwijze, @is_cocktail,
        @inkoopprijs_per_consumptie, @fles_inhoud_cl, @inkoopprijs_per_fles, @vat_id, @btw_inkoop, @btw_verkoop)`
    )
    .run(params)
  return mapDrank(db.prepare('SELECT * FROM dranken WHERE id=?').get(info.lastInsertRowid))
}

export function deleteDrank(id: number): void {
  getDb().prepare('DELETE FROM dranken WHERE id=?').run(id)
}

// ---------------------------------------------------------------------------
// Forfaits
// ---------------------------------------------------------------------------

function mapForfait(row: any): Forfait {
  const koppelingen = getDb()
    .prepare('SELECT drank_id, glaasgrootte_override FROM forfait_dranken WHERE forfait_id=?')
    .all(row.id) as { drank_id: number; glaasgrootte_override: number | null }[]
  const overrides: Record<number, number> = {}
  for (const k of koppelingen) {
    if (k.glaasgrootte_override != null) overrides[k.drank_id] = k.glaasgrootte_override
  }
  return {
    id: row.id,
    naam: row.naam,
    verwachte_consumpties_per_persoon: row.verwachte_consumpties_per_persoon,
    handmatige_prijs: row.handmatige_prijs,
    toegestane_drank_ids: koppelingen.map((k) => k.drank_id),
    glaasgrootte_overrides: overrides
  }
}

export function listForfaits(): Forfait[] {
  return getDb().prepare('SELECT * FROM forfaits ORDER BY sort_order, naam').all().map(mapForfait)
}

export function upsertForfait(f: Omit<Forfait, 'id'> & { id?: number }): Forfait {
  const db = getDb()
  const tx = db.transaction(() => {
    let id = f.id
    if (id) {
      db.prepare(
        `UPDATE forfaits SET naam=@naam,
          verwachte_consumpties_per_persoon=@verwachte_consumpties_per_persoon,
          handmatige_prijs=@handmatige_prijs WHERE id=@id`
      ).run({
        naam: f.naam,
        verwachte_consumpties_per_persoon: f.verwachte_consumpties_per_persoon ?? null,
        handmatige_prijs: f.handmatige_prijs ?? null,
        id
      })
    } else {
      const info = db
        .prepare(
          `INSERT INTO forfaits (naam, verwachte_consumpties_per_persoon, handmatige_prijs)
           VALUES (@naam, @verwachte_consumpties_per_persoon, @handmatige_prijs)`
        )
        .run({
          naam: f.naam,
          verwachte_consumpties_per_persoon: f.verwachte_consumpties_per_persoon ?? null,
          handmatige_prijs: f.handmatige_prijs ?? null
        })
      id = Number(info.lastInsertRowid)
    }
    db.prepare('DELETE FROM forfait_dranken WHERE forfait_id=?').run(id)
    const ins = db.prepare(
      'INSERT INTO forfait_dranken (forfait_id, drank_id, glaasgrootte_override) VALUES (?,?,?)'
    )
    for (const drankId of f.toegestane_drank_ids) {
      ins.run(id, drankId, f.glaasgrootte_overrides?.[drankId] ?? null)
    }
    return id
  })
  const id = tx()
  return mapForfait(db.prepare('SELECT * FROM forfaits WHERE id=?').get(id))
}

export function deleteForfait(id: number): void {
  getDb().prepare('DELETE FROM forfaits WHERE id=?').run(id)
}

// ---------------------------------------------------------------------------
// Feesten + toewijzingen + registraties
// ---------------------------------------------------------------------------

export interface Registratie {
  drank_id: number
  aantal_empties?: number | null
  aantal_flessen?: number | null
  aantal_vaten_geopend?: number | null
  gewicht_laatste_vat_kg?: number | null
  cocktail_tally?: number | null
}

export interface FeestVol extends Feest {
  toewijzingen: Toewijzing[]
  registraties: Registratie[]
}

function mapFeest(row: any): Feest {
  return {
    id: row.id,
    naam: row.naam,
    type_feest: row.type_feest,
    datum: row.datum,
    publiek: row.publiek,
    doelmarge: row.doelmarge,
    korting_reden: row.korting_reden,
    prijs_momentopname: JSON.parse(row.prijs_momentopname) as PrijsMomentopname
  }
}

export function listFeesten(): Feest[] {
  return getDb().prepare('SELECT * FROM feesten ORDER BY datum DESC, id DESC').all().map(mapFeest)
}

export interface FeestOverzicht {
  id: number
  naam: string
  type_feest: string
  datum: string
  publiek: string | null
  doelmarge: number
  korting_reden: string | null
  aantal_personen: number
  geregistreerd: boolean
  forfait_namen: string[]
}

export function listFeestOverzicht(): FeestOverzicht[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM feesten ORDER BY datum DESC, id DESC').all() as any[]
  return rows.map((row) => {
    const personen = db
      .prepare('SELECT COALESCE(SUM(aantal_personen),0) AS n FROM toewijzingen WHERE feest_id=?')
      .get(row.id) as { n: number }
    const namen = db
      .prepare('SELECT forfait_naam FROM toewijzingen WHERE feest_id=?')
      .all(row.id) as { forfait_naam: string }[]
    const reg = db
      .prepare('SELECT COUNT(*) AS n FROM consumptieregistraties WHERE feest_id=?')
      .get(row.id) as { n: number }
    return {
      id: row.id,
      naam: row.naam,
      type_feest: row.type_feest,
      datum: row.datum,
      publiek: row.publiek,
      doelmarge: row.doelmarge,
      korting_reden: row.korting_reden,
      aantal_personen: personen.n,
      geregistreerd: reg.n > 0,
      forfait_namen: namen.map((x) => x.forfait_naam)
    }
  })
}

export function getFeest(id: number): FeestVol | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM feesten WHERE id=?').get(id)
  if (!row) return null
  const toewijzingen = db
    .prepare('SELECT * FROM toewijzingen WHERE feest_id=?')
    .all(id) as Toewijzing[]
  const registraties = db
    .prepare('SELECT * FROM consumptieregistraties WHERE feest_id=?')
    .all(id) as Registratie[]
  return { ...mapFeest(row), toewijzingen, registraties }
}

export interface FeestInput {
  id?: number
  naam: string
  type_feest: string
  datum: string
  publiek?: string | null
  doelmarge: number
  korting_reden?: string | null
  prijs_momentopname: PrijsMomentopname
  toewijzingen: {
    forfait_id: number | null
    forfait_naam: string
    aantal_personen: number
    forfaitprijs_per_persoon: number
    korting_pct?: number
  }[]
}

export function upsertFeest(f: FeestInput): FeestVol {
  const db = getDb()
  const tx = db.transaction(() => {
    let id = f.id
    const base = {
      naam: f.naam,
      type_feest: f.type_feest,
      datum: f.datum,
      publiek: f.publiek ?? null,
      doelmarge: f.doelmarge,
      korting_reden: f.korting_reden ?? null,
      prijs_momentopname: JSON.stringify(f.prijs_momentopname)
    }
    if (id) {
      db.prepare(
        `UPDATE feesten SET naam=@naam, type_feest=@type_feest, datum=@datum, publiek=@publiek,
          doelmarge=@doelmarge, korting_reden=@korting_reden,
          prijs_momentopname=@prijs_momentopname WHERE id=@id`
      ).run({ ...base, id })
    } else {
      const info = db
        .prepare(
          `INSERT INTO feesten (naam, type_feest, datum, publiek, doelmarge, korting_reden, prijs_momentopname)
           VALUES (@naam, @type_feest, @datum, @publiek, @doelmarge, @korting_reden, @prijs_momentopname)`
        )
        .run(base)
      id = Number(info.lastInsertRowid)
    }
    db.prepare('DELETE FROM toewijzingen WHERE feest_id=?').run(id)
    const ins = db.prepare(
      `INSERT INTO toewijzingen (feest_id, forfait_id, forfait_naam, aantal_personen, forfaitprijs_per_persoon, korting_pct)
       VALUES (?,?,?,?,?,?)`
    )
    for (const t of f.toewijzingen) {
      ins.run(
        id,
        t.forfait_id,
        t.forfait_naam,
        t.aantal_personen,
        t.forfaitprijs_per_persoon,
        t.korting_pct ?? 0
      )
    }
    return id
  })
  const id = tx()
  return getFeest(id!)!
}

export function deleteFeest(id: number): void {
  getDb().prepare('DELETE FROM feesten WHERE id=?').run(id)
}

export function saveRegistraties(feestId: number, registraties: Registratie[]): void {
  const db = getDb()
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM consumptieregistraties WHERE feest_id=?').run(feestId)
    const ins = db.prepare(
      `INSERT INTO consumptieregistraties
        (feest_id, drank_id, aantal_empties, aantal_flessen, aantal_vaten_geopend, gewicht_laatste_vat_kg, cocktail_tally)
       VALUES (@feest_id, @drank_id, @aantal_empties, @aantal_flessen, @aantal_vaten_geopend, @gewicht_laatste_vat_kg, @cocktail_tally)`
    )
    for (const r of registraties) {
      ins.run({
        feest_id: feestId,
        drank_id: r.drank_id,
        aantal_empties: r.aantal_empties ?? null,
        aantal_flessen: r.aantal_flessen ?? null,
        aantal_vaten_geopend: r.aantal_vaten_geopend ?? null,
        gewicht_laatste_vat_kg: r.gewicht_laatste_vat_kg ?? null,
        cocktail_tally: r.cocktail_tally ?? null
      })
    }
  })
  tx()
}

// ---------------------------------------------------------------------------
// Instellingen
// ---------------------------------------------------------------------------

export function getInstellingen(): Instellingen {
  const row = getDb().prepare('SELECT * FROM instellingen WHERE id=1').get() as any
  return {
    standaard_doelmarge: row.standaard_doelmarge,
    marge_conventie: row.marge_conventie,
    btw_verkoop: row.btw_verkoop ?? 21,
    bedrijfsnaam: row.bedrijfsnaam,
    bedrijfsgegevens: row.bedrijfsgegevens,
    logo_pad: row.logo_pad,
    backup_locatie: row.backup_locatie,
    categorieen: JSON.parse(row.categorieen),
    standaard_glaasgrootte_per_categorie: JSON.parse(row.standaard_glaasgrootte_per_categorie),
    standaard_inkoopmarge_per_categorie: JSON.parse(row.standaard_inkoopmarge_per_categorie),
    anthropic_api_key: row.anthropic_api_key
  }
}

export function saveInstellingen(s: Instellingen): Instellingen {
  getDb()
    .prepare(
      `UPDATE instellingen SET standaard_doelmarge=@standaard_doelmarge,
        marge_conventie=@marge_conventie, btw_verkoop=@btw_verkoop, bedrijfsnaam=@bedrijfsnaam,
        bedrijfsgegevens=@bedrijfsgegevens, logo_pad=@logo_pad, backup_locatie=@backup_locatie,
        categorieen=@categorieen,
        standaard_glaasgrootte_per_categorie=@standaard_glaasgrootte_per_categorie,
        standaard_inkoopmarge_per_categorie=@standaard_inkoopmarge_per_categorie,
        anthropic_api_key=@anthropic_api_key WHERE id=1`
    )
    .run({
      standaard_doelmarge: s.standaard_doelmarge,
      marge_conventie: s.marge_conventie,
      btw_verkoop: s.btw_verkoop ?? 21,
      bedrijfsnaam: s.bedrijfsnaam,
      bedrijfsgegevens: s.bedrijfsgegevens,
      logo_pad: s.logo_pad ?? null,
      backup_locatie: s.backup_locatie ?? null,
      categorieen: JSON.stringify(s.categorieen),
      standaard_glaasgrootte_per_categorie: JSON.stringify(s.standaard_glaasgrootte_per_categorie),
      standaard_inkoopmarge_per_categorie: JSON.stringify(s.standaard_inkoopmarge_per_categorie),
      anthropic_api_key: s.anthropic_api_key ?? null
    })
  return getInstellingen()
}

export function isDemoGeladen(): boolean {
  const row = getDb().prepare('SELECT demo_geladen FROM instellingen WHERE id=1').get() as any
  return !!row?.demo_geladen
}

export function markDemoGeladen(value: boolean): void {
  getDb().prepare('UPDATE instellingen SET demo_geladen=? WHERE id=1').run(value ? 1 : 0)
}

/** First-run flag. Set once after the initial seed; never auto-reset, so wiping
 * the demo or importing a backup does not re-trigger the seed. */
export function isGeinitialiseerd(): boolean {
  const row = getDb().prepare('SELECT geinitialiseerd FROM instellingen WHERE id=1').get() as any
  return !!row?.geinitialiseerd
}

export function markGeinitialiseerd(): void {
  getDb().prepare('UPDATE instellingen SET geinitialiseerd=1 WHERE id=1').run()
}

export function wisAlleData(): void {
  const db = getDb()
  const tx = db.transaction(() => {
    db.exec(`
      DELETE FROM consumptieregistraties;
      DELETE FROM toewijzingen;
      DELETE FROM feesten;
      DELETE FROM forfait_dranken;
      DELETE FROM forfaits;
      DELETE FROM dranken;
      DELETE FROM vaten;
    `)
    markDemoGeladen(false)
  })
  tx()
}
