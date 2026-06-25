// Localhost web server for Tapwijs. Runs the exact same business logic as the
// Electron app (via coreHandlers) but serves the React app in a normal browser
// at http://localhost:3000 — the "run it like my other apps" workflow.
//
//   npm run web      build the renderer + start this server
//
// The SQLite database lives in ./tapwijs-data/tapwijs.sqlite next to where you
// start the app, so it is easy to find and to back up. Override with TAPWIJS_DATA.

import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import { join } from 'path'
import { existsSync, mkdirSync, createReadStream } from 'fs'
import { networkInterfaces } from 'os'
import { openDatabase, getDatabasePath, getDb } from '../main/db/database'
import { isGeinitialiseerd, markGeinitialiseerd } from '../main/db/repo'
import { seedDemoData } from '../main/services/seed'
import { buildExport, restoreImport, drankenCsv } from '../main/services/dataio'
import { coreHandlers } from '../main/handlers'

const dataDir = process.env.TAPWIJS_DATA || join(process.cwd(), 'tapwijs-data')
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
const dbPath = join(dataDir, 'tapwijs.sqlite')

openDatabase(dbPath)
if (!isGeinitialiseerd()) {
  try {
    seedDemoData()
  } catch (e) {
    console.error('Demo seed mislukt:', e)
  }
  markGeinitialiseerd()
}

const app = Fastify({ logger: false, bodyLimit: 50 * 1024 * 1024 })
const port = Number(process.env.PORT || 3000)

// The built renderer. Run `npm run build` first (npm run web does this for you).
const rendererDir = join(process.cwd(), 'out', 'renderer')
if (!existsSync(rendererDir)) {
  console.error(
    `\nDe webversie is nog niet gebouwd (${rendererDir} ontbreekt).\nVoer eerst "npm run build" uit, of gebruik "npm run web".\n`
  )
  process.exit(1)
}
app.register(fastifyStatic, { root: rendererDir, index: ['index.html'] })

// Single RPC endpoint mirroring the Electron preload bridge.
app.post('/api/invoke', async (request, reply) => {
  const { channel, payload } = (request.body ?? {}) as { channel?: string; payload?: unknown }
  const handler = channel ? coreHandlers[channel] : undefined
  if (!handler) {
    reply.code(404)
    return { error: `Onbekend kanaal: ${channel}` }
  }
  try {
    return { result: await handler(payload) }
  } catch (e) {
    reply.code(400)
    return { error: e instanceof Error ? e.message : String(e) }
  }
})

// File transfers (the browser equivalents of the desktop file dialogs).
app.get('/api/export', async (_req, reply) => {
  const naam = `tapwijs-backup-${new Date().toISOString().slice(0, 10)}.json`
  reply.header('Content-Type', 'application/json; charset=utf-8')
  reply.header('Content-Disposition', `attachment; filename="${naam}"`)
  return JSON.stringify(buildExport(), null, 2)
})

app.get('/api/export-csv', async (_req, reply) => {
  const naam = `tapwijs-dranken-${new Date().toISOString().slice(0, 10)}.csv`
  reply.header('Content-Type', 'text/csv; charset=utf-8')
  reply.header('Content-Disposition', `attachment; filename="${naam}"`)
  // BOM so Excel reads the euro sign and accents correctly.
  return '﻿' + drankenCsv()
})

app.get('/api/backup', async (_req, reply) => {
  // Flush the WAL so the copied .sqlite file is complete and self-contained.
  try {
    getDb().pragma('wal_checkpoint(TRUNCATE)')
  } catch {
    // ignore — a checkpoint is best-effort
  }
  const naam = `tapwijs-${new Date().toISOString().slice(0, 10)}.sqlite`
  reply.header('Content-Type', 'application/octet-stream')
  reply.header('Content-Disposition', `attachment; filename="${naam}"`)
  return reply.send(createReadStream(getDatabasePath()))
})

app.get('/api/netinfo', async () => {
  const urls: string[] = []
  const ifs = networkInterfaces()
  for (const naam of Object.keys(ifs)) {
    for (const ni of ifs[naam] ?? []) {
      if (ni.family === 'IPv4' && !ni.internal) urls.push(`http://${ni.address}:${port}`)
    }
  }
  return { result: { actief: true, port, urls } }
})

app.post('/api/import', async (request, reply) => {
  try {
    restoreImport(request.body as Parameters<typeof restoreImport>[0])
    return { ok: true }
  } catch (e) {
    reply.code(400)
    return { error: e instanceof Error ? e.message : String(e) }
  }
})

app
  .listen({ port, host: '0.0.0.0' })
  .then(() => {
    console.log(`\n  Tapwijs draait op http://localhost:${port}`)
    console.log(`  Gegevensbestand: ${getDatabasePath()}\n`)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
