// Registers all IPC handlers for the Electron app. The business logic lives in
// the shared coreHandlers; here we add only the desktop-specific operations
// that need native file dialogs and the OS file manager.

import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { writeFileSync, readFileSync, copyFileSync } from 'fs'
import { basename } from 'path'
import { coreHandlers } from './handlers'
import { getDatabasePath } from './db/database'
import { getLanInfo } from './lanServer'
import { buildExport, restoreImport, drankenCsv } from './services/dataio'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Handler = (payload: any, event: Electron.IpcMainInvokeEvent) => any

const electronHandlers: Record<string, Handler> = {
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
  },
  'net:info': () => getLanInfo()
}

export function registerIpc(): void {
  const all: Record<string, Handler> = { ...coreHandlers, ...electronHandlers }
  for (const [channel, handler] of Object.entries(all)) {
    ipcMain.handle(channel, (event, payload) => handler(payload, event))
  }
}
