/// <reference types="vite/client" />

interface TapwijsBridge {
  invoke<T = unknown>(channel: string, payload?: unknown): Promise<T>
}

interface Window {
  tapwijs: TapwijsBridge
}
