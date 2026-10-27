/* eslint-disable no-console, no-undef */
import pico from 'picocolors'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compareVersions, isPrerelease, isValidVersion } from './utils/version.js'

// Releases a new version.
// It sets the version in both package.json files, commits and tags them, pushes the commit and the tag,
// and prints a link to the GitHub form for the release.
// Publishing the GitHub release starts .github/workflows/publish.yml, which publishes the package to npm.
//
// Usage: pnpm release <version> [--dry-run]
// Example: pnpm release 2.0.0-beta.1

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLISHED_PACKAGE_JSON_PATH = 'packages/fast-sheets/package.json'
const PACKAGE_JSON_PATHS = ['package.json', PUBLISHED_PACKAGE_JSON_PATH]
const RELEASE_BRANCH = 'main'
const REMOTE = 'origin'

// The top-level "version" field, indented by Prettier with 2 spaces.
const VERSION_FIELD_RE = /^( {2}"version": ")([^"]*)(")/m

const fail = (message) => {
  console.error(`\n  ${pico.white(pico.bgRed(' ERROR '))} ${pico.red(message)}\n`)
  process.exit(1)
}

const git = (...args) => {
  try {
    return execFileSync('git', args, { cwd: ROOT_DIR, encoding: 'utf-8' }).trim()
  } catch {
    fail(`git ${args.join(' ')} failed.`)
  }
}

// Shows git's output as it runs, such as the commit hooks and the push.
const runGitWithOutput = (...args) => {
  execFileSync('git', args, { cwd: ROOT_DIR, stdio: 'inherit' })
}

const readPackageJson = (relativePath) => readFileSync(path.join(ROOT_DIR, relativePath), 'utf-8')

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const version = args.find((arg) => !arg.startsWith('--'))?.replace(/^v/, '')

if (!version) {
  fail('Pass the version to release, for example: pnpm release 2.0.0-beta.1')
}
if (!isValidVersion(version)) {
  fail(`"${version}" is not a valid version. Use a version such as 2.0.0 or 2.0.0-beta.1.`)
}

const tag = `v${version}`
const commitMessage = `release: ${tag}`
const publishedPackage = JSON.parse(readPackageJson(PUBLISHED_PACKAGE_JSON_PATH))

if (compareVersions(version, publishedPackage.version) <= 0) {
  fail(`${version} must be higher than the current version ${publishedPackage.version}.`)
}

const branch = git('branch', '--show-current')
if (branch !== RELEASE_BRANCH) {
  fail(`Releases are made from ${RELEASE_BRANCH}, but the current branch is ${branch || 'none'}.`)
}

if (git('status', '--porcelain')) {
  fail('The working tree has uncommitted changes. Commit or stash them first.')
}

console.log(`Fetching ${REMOTE}/${RELEASE_BRANCH}...`)
git('fetch', REMOTE, RELEASE_BRANCH)
if (git('rev-parse', 'HEAD') !== git('rev-parse', `${REMOTE}/${RELEASE_BRANCH}`)) {
  fail(`${RELEASE_BRANCH} differs from ${REMOTE}/${RELEASE_BRANCH}. Pull or push it first.`)
}

if (git('tag', '--list', tag) || git('ls-remote', '--tags', REMOTE, `refs/tags/${tag}`)) {
  fail(`The tag ${tag} already exists.`)
}

const packageJsonTexts = PACKAGE_JSON_PATHS.map((relativePath) => {
  const text = readPackageJson(relativePath)
  if (!VERSION_FIELD_RE.test(text)) {
    fail(`${relativePath} has no top-level "version" field.`)
  }
  return text
})

if (isDryRun) {
  console.log(`
${pico.green('All checks passed.')} Without --dry-run, the release would:

  1. Change the version from ${publishedPackage.version} to ${version} in ${PACKAGE_JSON_PATHS.join(' and ')}
  2. Commit them as "${commitMessage}" (the commit hooks run the checks and the tests)
  3. Create the tag ${tag}
  4. Push ${RELEASE_BRANCH} and ${tag} to ${REMOTE}
`)
  process.exit(0)
}

PACKAGE_JSON_PATHS.forEach((relativePath, i) => {
  const text = packageJsonTexts[i].replace(VERSION_FIELD_RE, `$1${version}$3`)
  writeFileSync(path.join(ROOT_DIR, relativePath), text)
})

git('add', ...PACKAGE_JSON_PATHS)
try {
  runGitWithOutput('commit', '-m', commitMessage)
} catch {
  git('restore', '--staged', '--worktree', ...PACKAGE_JSON_PATHS)
  fail(
    'The commit failed, so the version change was reverted. Fix the problem and run the release again.',
  )
}

git('tag', '-a', tag, '-m', commitMessage)

try {
  runGitWithOutput('push', '--atomic', REMOTE, RELEASE_BRANCH, tag)
} catch {
  fail(
    `The push failed, so the release commit and the tag ${tag} exist only locally.\n` +
      `  Fix the problem and push them with: git push --atomic ${REMOTE} ${RELEASE_BRANCH} ${tag}`,
  )
}

const repositoryUrl = publishedPackage.repository.url.replace(/^git\+/, '').replace(/\.git$/, '')
const releaseUrl = new URL(`${repositoryUrl}/releases/new`)
releaseUrl.searchParams.set('tag', tag)
releaseUrl.searchParams.set('title', tag)
if (isPrerelease(version)) {
  releaseUrl.searchParams.set('prerelease', '1')
}

console.log(`
${pico.green(`Pushed ${tag}.`)} Open this link, generate the release notes and publish the release:

  ${releaseUrl}

Publishing the release starts the workflow that publishes ${publishedPackage.name}@${version} to npm${isPrerelease(version) ? ' under the next tag' : ''}.
`)
