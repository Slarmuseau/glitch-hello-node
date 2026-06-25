// Core request handlers, shared by both the Electron IPC layer and the
// localhost web server. These touch only the database and the pure services —
// no Electron, no file dialogs — so the exact same business logic runs in the
// desktop app and in the browser-on-localhost build.

import {
  listDranken,
  upsertDrank,
  deleteDrank,
  listVaten,
  upsertVat,
  deleteVat,
  listForfaits,
  upsertForfait,
  deleteForfait,
  listFeesten,
  listFeestOverzicht,
  getFeest,
  upsertFeest,
  deleteFeest,
  saveRegistraties,
  getInstellingen,
  saveInstellingen,
  isDemoGeladen,
  wisAlleData
} from './db/repo'
import { getDatabasePath } from './db/database'
import { buildResultaat } from './services/resultaat'
import { buildInzichten } from './services/inzichten'
import { forfaitHistoriek } from './services/forfaitHistoriek'
import { buildPrijsMomentopname } from './services/snapshot'
import { seedDemoData } from './services/seed'

/* eslint-disable @typescript-eslint/no-explicit-any */
export type CoreHandler = (payload: any) => any

export const coreHandlers: Record<string, CoreHandler> = {
  'dranken:list': () => listDranken(),
  'dranken:upsert': (d) => upsertDrank(d),
  'dranken:delete': (id) => deleteDrank(id),

  'vaten:list': () => listVaten(),
  'vaten:upsert': (v) => upsertVat(v),
  'vaten:delete': (id) => deleteVat(id),

  'forfaits:list': () => listForfaits(),
  'forfaits:upsert': (f) => upsertForfait(f),
  'forfaits:delete': (id) => deleteForfait(id),
  'forfaits:historiek': ({ forfaitId, doelmarge }) => forfaitHistoriek(forfaitId, doelmarge),

  'feesten:list': () => listFeesten(),
  'feesten:overzicht': () => listFeestOverzicht(),
  'feesten:get': (id) => getFeest(id),
  'feesten:upsert': (f) => upsertFeest(f),
  'feesten:delete': (id) => deleteFeest(id),
  'feesten:saveRegistraties': ({ feestId, registraties }) =>
    saveRegistraties(feestId, registraties),

  'resultaat:build': (feestId) => buildResultaat(feestId),
  'inzichten:build': (p) => buildInzichten(p?.van, p?.tot),
  'snapshot:build': () => buildPrijsMomentopname(),

  'instellingen:get': () => getInstellingen(),
  'instellingen:save': (s) => saveInstellingen(s),

  'demo:status': () => ({ geladen: isDemoGeladen() }),
  'demo:seed': () => {
    seedDemoData()
    return { ok: true }
  },
  'demo:wis': () => {
    wisAlleData()
    return { ok: true }
  },

  'data:dbPath': () => getDatabasePath()
}
