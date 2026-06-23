import { defineConfig } from 'vitest/config'

// The domain layer is framework-agnostic pure TypeScript, so it can be
// tested in a plain Node environment without Electron or a browser.
export default defineConfig({
  test: {
    include: ['src/shared/**/*.test.ts'],
    environment: 'node'
  }
})
