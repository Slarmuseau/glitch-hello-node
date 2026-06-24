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

// Two transports behind one call: the Electron preload bridge when present,
// otherwise an HTTP POST to the localhost web server. Screens never know which.
const isElectron = typeof window !== 'undefined' && !!window.tapwijs

async function inv<T>(channel: string, payload?: unknown): Promise<T> {
  if (isElectron) return window.tapwijs!.invoke<T>(channel, payload)
  const res = await fetch('/api/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, payload })
  })
  const data = await res.json().catch(() => ({ error: `Fout (${res.status})` }))
  if (!res.ok || data.error) throw new Error(data.error || `Fout (${res.status})`)
  return data.result as T
}

/** Trigger a browser download (web build). */
function download(url: string): void {
  const a = document.createElement('a')
  a.href = url
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** Pick a local file and return its text (web build). */
function pickFile(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => resolve(null)
      reader.readAsText(file)
    }
    input.click()
  })
}

export type DrankInput = Omit<Drank, 'id'> & { id?: number }
export type VatInput = Omit<Vat, 'id'> & { id?: number }
export type ForfaitInput = Omit<Forfait, 'id'> & { id?: number }

export interface Toewijzing {
  id?: number
  forfait_id: number | null
  forfait_naam: string
  aantal_personen: number
  forfaitprijs_per_persoon: number
  korting_pct?: number
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
  gemiddelde_alacarte_per_hoofd: number
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

export interface AlcoholDeel {
  consumpties: number
  omzet: number
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
  btw: {
    verkoop_tarief: number
    verkoop_btw: number
    inkoop_btw: number
    verschuldigd: number
    per_tarief: { tarief: number; inkoop_incl: number; btw: number }[]
  }
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
  net: {
    info: async (): Promise<{ actief: boolean; port: number; urls: string[] }> => {
      if (isElectron) return inv('net:info')
      try {
        const res = await fetch('/api/netinfo')
        const data = await res.json()
        return data.result
      } catch {
        return { actief: false, port: 0, urls: [] }
      }
    }
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
    exportAlles: async (): Promise<{ ok: boolean; pad?: string }> => {
      if (isElectron) return inv('data:export')
      download('/api/export')
      return { ok: true }
    },
    exportCsv: async (): Promise<{ ok: boolean; pad?: string }> => {
      if (isElectron) return inv('data:exportCsv')
      download('/api/export-csv')
      return { ok: true }
    },
    backup: async (): Promise<{ ok: boolean; pad?: string }> => {
      if (isElectron) return inv('data:backup')
      download('/api/backup')
      return { ok: true }
    },
    importAlles: async (): Promise<{ ok: boolean }> => {
      if (isElectron) return inv('data:import')
      const text = await pickFile('.json,application/json')
      if (!text) return { ok: false }
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text
      })
      return { ok: res.ok }
    },
    revealDb: async (): Promise<{ ok: boolean; naam?: string }> => {
      if (isElectron) return inv('data:revealDb')
      // No OS file manager in the browser; surface the path instead.
      const pad = await inv<string>('data:dbPath')
      return { ok: true, naam: pad }
    }
  }
}
