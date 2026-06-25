// A tiny HTTP server embedded in the desktop app, so a phone on the SAME Wi-Fi
// can open Tapwijs in its browser and fill in the post-party registration. It
// shares the very same SQLite database as the desktop app (coreHandlers use the
// open connection), so what the phone saves appears in the app on the PC.
//
// No authentication: it is meant for the venue's own local network only.

import { createServer } from 'http'
import { readFileSync, existsSync, statSync } from 'fs'
import { join, normalize, extname } from 'path'
import { networkInterfaces } from 'os'
import { coreHandlers } from './handlers'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
}

export interface LanInfo {
  actief: boolean
  port: number
  urls: string[]
}

let info: LanInfo = { actief: false, port: 0, urls: [] }

export function getLanInfo(): LanInfo {
  return info
}

function lanUrls(port: number): string[] {
  const out: string[] = []
  const ifs = networkInterfaces()
  for (const naam of Object.keys(ifs)) {
    for (const ni of ifs[naam] ?? []) {
      if (ni.family === 'IPv4' && !ni.internal) out.push(`http://${ni.address}:${port}`)
    }
  }
  return out
}

function sendJson(res: import('http').ServerResponse, code: number, body: unknown): void {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

export function startLanServer(rendererDir: string, port = Number(process.env.TAPWIJS_PORT) || 3000): void {
  const server = createServer((req, res) => {
    const url = (req.url ?? '/').split('?')[0]

    if (req.method === 'POST' && url === '/api/invoke') {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        try {
          const { channel, payload } = JSON.parse(body || '{}')
          const handler = channel ? coreHandlers[channel] : undefined
          if (!handler) return sendJson(res, 404, { error: `Onbekend kanaal: ${channel}` })
          Promise.resolve(handler(payload))
            .then((result) => sendJson(res, 200, { result }))
            .catch((e) => sendJson(res, 400, { error: e instanceof Error ? e.message : String(e) }))
        } catch (e) {
          sendJson(res, 400, { error: e instanceof Error ? e.message : String(e) })
        }
      })
      return
    }

    if (req.method === 'GET' && url === '/api/netinfo') {
      return sendJson(res, 200, { result: info })
    }

    // Static renderer files (asar-aware via Electron's patched fs).
    const rel = url === '/' ? '/index.html' : normalize(url).replace(/^(\.\.[/\\])+/, '')
    const file = join(rendererDir, rel)
    if (existsSync(file) && statSync(file).isFile()) {
      try {
        res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' })
        res.end(readFileSync(file))
        return
      } catch {
        // fall through to SPA fallback
      }
    }
    // SPA fallback.
    try {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(readFileSync(join(rendererDir, 'index.html')))
    } catch {
      res.writeHead(404)
      res.end('Niet gevonden')
    }
  })

  server.on('error', (e) => console.error('LAN-server fout:', e))
  server.listen(port, '0.0.0.0', () => {
    info = { actief: true, port, urls: lanUrls(port) }
    console.log('LAN-server (gsm) op', info.urls.join(', ') || `poort ${port}`)
  })
}
