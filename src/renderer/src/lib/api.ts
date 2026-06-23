// Typed wrappers over the preload bridge. One place that knows the channel
// names; screens import these and get fully-typed calls.

import type {
  Drank,
  Vat,
  Forfait,
  Instellingen,
  Feest,
  PrijsMomentopname
} from '@shared/domain'

const inv = <T,>(channel: string, payload?: unknown): Promise<T> =>
  window.tapwijs.invoke<T>(channel, payload)

export type DrankInput = Omit<Drank, 'id'> & { id?: number }
export type VatInput = Omit<Vat, 'id'> & { id?: number }
export type ForfaitInput = Omit<Forfait, 'id'> & { id?: number }

export interface Toewijzing {
  id?: number
  forfait_id: number | null
  forfait_naam: string
  aantal_personen: number
  forfaitprijs_per_persoon: number
}

export interface Registratie {
  drank_id: number
  aantal_empties?: number | null
  aantal_flessen?: number | null
  aantal_vaten_geopend?: number | null
  gewicht_laatste_vat_kg?: number | null
  cocktail_tally?: number | null
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

export interface ForfaitHistoriek {
  aantal_feesten: number
  gemiddelde_kost_per_hoofd: number
  voorgestelde_prijs: number | null
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
  toewijzingen: Toewijzing[]
}

export interface FeestVol extends Feest {
  toewijzingen: (Toewijzing & { id: number })[]
  registraties: Registratie[]
}

export interface RegelToelichting {
  drank_id: number
  naam: string
  schenkwijze: string
  meting: string
  berekening: string
}

import type { FeestResultaat } from '@shared/domain'
export interface ResultaatData {
  feestId: number
  resultaat: FeestResultaat
  toelichtingen: RegelToelichting[]
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

export const api = {
  dranken: {
    list: () => inv<Drank[]>('dranken:list'),
    upsert: (d: DrankInput) => inv<Drank>('dranken:upsert', d),
    remove: (id: number) => inv<void>('dranken:delete', id)
  },
  vaten: {
    list: () => inv<Vat[]>('vaten:list'),
    upsert: (v: VatInput) => inv<Vat>('vaten:upsert', v),
    remove: (id: number) => inv<void>('vaten:delete', id)
  },
  forfaits: {
    list: () => inv<Forfait[]>('forfaits:list'),
    upsert: (f: ForfaitInput) => inv<Forfait>('forfaits:upsert', f),
    remove: (id: number) => inv<void>('forfaits:delete', id),
    historiek: (forfaitId: number, doelmarge: number) =>
      inv<ForfaitHistoriek>('forfaits:historiek', { forfaitId, doelmarge })
  },
  feesten: {
    list: () => inv<Feest[]>('feesten:list'),
    overzicht: () => inv<FeestOverzicht[]>('feesten:overzicht'),
    get: (id: number) => inv<FeestVol | null>('feesten:get', id),
    upsert: (f: FeestInput) => inv<FeestVol>('feesten:upsert', f),
    remove: (id: number) => inv<void>('feesten:delete', id),
    saveRegistraties: (feestId: number, registraties: Registratie[]) =>
      inv<void>('feesten:saveRegistraties', { feestId, registraties })
  },
  resultaat: {
    build: (feestId: number) => inv<ResultaatData | null>('resultaat:build', feestId)
  },
  inzichten: {
    build: () => inv<Inzichten>('inzichten:build')
  },
  snapshot: {
    build: () => inv<PrijsMomentopname>('snapshot:build')
  },
  instellingen: {
    get: () => inv<Instellingen>('instellingen:get'),
    save: (s: Instellingen) => inv<Instellingen>('instellingen:save', s)
  },
  demo: {
    status: () => inv<{ geladen: boolean }>('demo:status'),
    seed: () => inv<{ ok: boolean }>('demo:seed'),
    wis: () => inv<{ ok: boolean }>('demo:wis')
  },
  data: {
    dbPath: () => inv<string>('data:dbPath'),
    exportAlles: () => inv<{ ok: boolean; pad?: string }>('data:export'),
    exportCsv: () => inv<{ ok: boolean; pad?: string }>('data:exportCsv'),
    importAlles: () => inv<{ ok: boolean }>('data:import'),
    backup: () => inv<{ ok: boolean; pad?: string }>('data:backup'),
    revealDb: () => inv<{ ok: boolean; naam?: string }>('data:revealDb')
  }
}
