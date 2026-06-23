/// <reference types="vite/client" />

interface TapwijsBridge {
  invoke<T = unknown>(channel: string, payload?: unknown): Promise<T>
}

interface Window {
  // Present only in the Electron build; absent in the localhost web build.
  tapwijs?: TapwijsBridge
}
