import { contextBridge, ipcRenderer } from 'electron'

// Thin, safe bridge. The renderer never touches Node or ipcRenderer directly;
// it calls window.tapwijs.invoke(channel, payload) and the typed wrappers in
// the renderer's lib/api.ts give it shape.
const api = {
  invoke: (channel: string, payload?: unknown) => ipcRenderer.invoke(channel, payload)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('tapwijs', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (no context isolation fallback)
  window.tapwijs = api
}
