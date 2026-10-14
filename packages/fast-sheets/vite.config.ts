import { defineConfig } from 'vite'
import path from 'node:path'
import url from 'node:url'
import dts from 'unplugin-dts/vite'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    dts({
      // bundleTypes: true,
      tsconfigPath: path.resolve(__dirname, 'tsconfig.app.json'),
    }),
  ],
  build: {
    minify: false,
    lib: {
      entry: {
        core: path.resolve(__dirname, 'lib/core/index.ts'),
        editable: path.resolve(__dirname, 'lib/plugins/editable/index.ts'),
        search: path.resolve(__dirname, 'lib/plugins/search/index.ts'),
      },
      name: 'fast-sheets',
      fileName: (format, entryName) =>
        format === 'es' ? `fast-sheets-${entryName}.es.js` : `fast-sheets-${entryName}.cjs`,
    },
  },
  resolve: {
    alias: [{ find: 'lib', replacement: path.resolve(__dirname, './lib') }],
  },
})
