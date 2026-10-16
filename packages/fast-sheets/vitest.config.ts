import { defineConfig } from 'vitest/config'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: 'lib', replacement: path.resolve(__dirname, './lib') },
      { find: 'tests', replacement: path.resolve(__dirname, './tests') },
    ],
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
  },
})
