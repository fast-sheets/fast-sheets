/* eslint-disable no-console, no-undef */
import { appendFileSync, readFileSync } from 'node:fs'
import { isPrerelease } from './utils/version.js'

// Checks the GitHub release against the version of the fast-sheets package, and chooses its npm dist-tag.
// Pre-release versions such as 2.0.0-beta.0 go to the `next` tag, so that `latest` keeps the last stable version.
//
// The publish workflow passes the release in RELEASE_TAG and RELEASE_IS_PRERELEASE.
// Without them, for example when run locally, the script only prints the tag.

const fail = (message) => {
  // GitHub Actions shows ::error:: lines as annotations on the run.
  console.log(`::error::${message}`)
  process.exit(1)
}

const packageJsonUrl = new URL('../packages/fast-sheets/package.json', import.meta.url)
const { version } = JSON.parse(readFileSync(packageJsonUrl, 'utf-8'))
const isPrereleaseVersion = isPrerelease(version)
const tag = isPrereleaseVersion ? 'next' : 'latest'

const { RELEASE_TAG, RELEASE_IS_PRERELEASE } = process.env

if (RELEASE_TAG !== undefined && RELEASE_TAG !== `v${version}`) {
  fail(
    `The release tag ${RELEASE_TAG} does not match the package version ${version}. ` +
      `Set "version" in packages/fast-sheets/package.json to the version of the tag.`,
  )
}

if (
  RELEASE_IS_PRERELEASE !== undefined &&
  (RELEASE_IS_PRERELEASE === 'true') !== isPrereleaseVersion
) {
  fail(
    isPrereleaseVersion
      ? `${version} is a pre-release version, but the release is not marked as a pre-release.`
      : `${version} is a stable version, but the release is marked as a pre-release.`,
  )
}

console.log(`Publishing ${version} with the ${tag} tag`)

// In GitHub Actions, the tag becomes the step output `tag`.
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `tag=${tag}\n`)
}
