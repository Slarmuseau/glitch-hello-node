// Registers all IPC handlers. The renderer talks to these channels through the
// thin preload bridge (window.tapwijs.invoke).

import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { writeFileSync, readFileSync, copyFileSync } from 'fs'
import { basename } from 'path'
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
import { forfaitHistoriek } from './services/forfaitHistoriek'
import { buildPrijsMomentopname } from './services/snapshot'
import { seedDemoData } from './services/seed'
import { buildExport, restoreImport, drankenCsv } from './services/dataio'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Handler = (payload: any, event: Electron.IpcMainInvokeEvent) => any

const handlers: Record<string, Handler> = {
  // Dranken
  'dranken:list': () => listDranken(),
  'dranken:upsert': (d) => upsertDrank(d),
  'dranken:delete': (id) => deleteDrank(id),

  // Vaten
  'vaten:list': () => listVaten(),
  'vaten:upsert': (v) => upsertVat(v),
  'vaten:delete': (id) => deleteVat(id),

  // Forfaits
  'forfaits:list': () => listForfaits(),
  'forfaits:upsert': (f) => upsertForfait(f),
  'forfaits:delete': (id) => deleteForfait(id),
  'forfaits:historiek': ({ forfaitId, doelmarge }) => forfaitHistoriek(forfaitId, doelmarge),

  // Feesten
  'feesten:list': () => listFeesten(),
  'feesten:overzicht': () => listFeestOverzicht(),
  'feesten:get': (id) => getFeest(id),
  'feesten:upsert': (f) => upsertFeest(f),
  'feesten:delete': (id) => deleteFeest(id),
  'feesten:saveRegistraties': ({ feestId, registraties }) =>
    saveRegistraties(feestId, registraties),

  // Afgeleide gegevens
  'resultaat:build': (feestId) => buildResultaat(feestId),
  'snapshot:build': () => buildPrijsMomentopname(),

  // Instellingen
  'instellingen:get': () => getInstellingen(),
  'instellingen:save': (s) => saveInstellingen(s),

  // Demo
  'demo:status': () => ({ geladen: isDemoGeladen() }),
  'demo:seed': () => {
    seedDemoData()
    return { ok: true }
  },
  'demo:wis': () => {
    wisAlleData()
    return { ok: true }
  },

  // Data in/uit + back-up
  'data:dbPath': () => getDatabasePath(),
  'data:export': async () => {
    const win = BrowserWindow.getFocusedWindow()
    const res = await dialog.showSaveDialog(win!, {
      title: 'Alle gegevens exporteren',
      defaultPath: `tapwijs-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'Tapwijs back-up', extensions: ['json'] }]
    })
    if (res.canceled || !res.filePath) return { ok: false }
    writeFileSync(res.filePath, JSON.stringify(buildExport(), null, 2), 'utf-8')
    return { ok: true, pad: res.filePath }
  },
  'data:exportCsv': async () => {
    const win = BrowserWindow.getFocusedWindow()
    const res = await dialog.showSaveDialog(win!, {
      title: 'Dranken naar Excel (CSV)',
      defaultPath: `tapwijs-dranken-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (res.canceled || !res.filePath) return { ok: false }
    // BOM so Excel reads the euro sign and accents correctly.
    writeFileSync(res.filePath, '﻿' + drankenCsv(), 'utf-8')
    return { ok: true, pad: res.filePath }
  },
  'data:import': async () => {
    const win = BrowserWindow.getFocusedWindow()
    const res = await dialog.showOpenDialog(win!, {
      title: 'Tapwijs back-up importeren',
      properties: ['openFile'],
      filters: [{ name: 'Tapwijs back-up', extensions: ['json'] }]
    })
    if (res.canceled || res.filePaths.length === 0) return { ok: false }
    const bundle = JSON.parse(readFileSync(res.filePaths[0], 'utf-8'))
    restoreImport(bundle)
    return { ok: true }
  },
  'data:backup': async () => {
    const win = BrowserWindow.getFocusedWindow()
    const dbPath = getDatabasePath()
    const res = await dialog.showSaveDialog(win!, {
      title: 'Reservekopie van het gegevensbestand',
      defaultPath: `tapwijs-${new Date().toISOString().slice(0, 10)}.sqlite`,
      filters: [{ name: 'SQLite', extensions: ['sqlite'] }]
    })
    if (res.canceled || !res.filePath) return { ok: false }
    copyFileSync(dbPath, res.filePath)
    return { ok: true, pad: res.filePath }
  },
  'data:revealDb': () => {
    shell.showItemInFolder(getDatabasePath())
    return { ok: true, naam: basename(getDatabasePath()) }
  }
}

export function registerIpc(): void {
  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, (event, payload) => handler(payload, event))
  }
}
