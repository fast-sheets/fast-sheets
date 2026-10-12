/* eslint-disable no-console */
import pico from 'picocolors'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const msgPath = path.resolve('.git/COMMIT_EDITMSG')
const msg = readFileSync(msgPath, 'utf-8').trim()

const commitRE = /^(revert: )?(build|ci|docs|feat|fix|perf|refactor|style|test)(\(.+\))?: .{1,50}/

if (!commitRE.test(msg)) {
  console.log()
  console.error(
    `  ${pico.white(pico.bgRed(' ERROR '))} ${pico.red(`invalid commit message format.`)}\n\n` +
      pico.red(`  Proper commit message format is required. Examples:\n\n`) +
      `    ${pico.green(`feat(editable-plugin): add tap gesture support`)}\n` +
      `    ${pico.green(`fix(search-plugin): incorrect highlight of results`)}\n\n` +
      pico.red(`  See .github/commit-convention.md for more details.\n`),
  )
  process.exit(1)
}
