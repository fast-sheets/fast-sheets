/* eslint-disable no-console, no-undef */
import { appendFileSync, readFileSync } from 'node:fs'

// Chooses the npm dist-tag for the fast-sheets package from its version.
// Pre-release versions such as 2.0.0-beta.0 go to the `next` tag, so that `latest` keeps the last stable version.
const packageJsonUrl = new URL('../packages/fast-sheets/package.json', import.meta.url)
const { version } = JSON.parse(readFileSync(packageJsonUrl, 'utf-8'))
const isPrerelease = /^\d+\.\d+\.\d+-/.test(version)
const tag = isPrerelease ? 'next' : 'latest'

console.log(`Publishing ${version} with the ${tag} tag`)

// In GitHub Actions, the tag becomes the step output `tag`.
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `tag=${tag}\n`)
}
