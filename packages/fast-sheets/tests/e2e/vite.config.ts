import { defineConfig } from 'vite'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

// minimal dev server that serves tests/e2e/index.html and resolves the `lib/*` alias
export default defineConfig({
  root: __dirname,
  server: {
    port: 4173,
    strictPort: true,
    fs: { allow: [path.resolve(__dirname, '../..')] },
  },
  resolve: {
    alias: [{ find: 'lib', replacement: path.resolve(__dirname, '../../lib') }],
  },
})
