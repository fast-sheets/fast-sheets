// Helpers for semver versions without build metadata, such as 2.0.0 or 2.0.0-beta.1.
// The publish workflow runs them before installing dependencies, so they must not import packages.

const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/

export const isValidVersion = (version) => VERSION_RE.test(version)

/** Whether the version has a pre-release part, such as -beta.0 or -rc.1. */
export const isPrerelease = (version) => VERSION_RE.exec(version)?.[4] !== undefined

const compareIdentifiers = (a, b) => {
  const isNumberA = /^\d+$/.test(a)
  const isNumberB = /^\d+$/.test(b)
  if (isNumberA && isNumberB) {
    return Number(a) - Number(b)
  }
  // Numeric identifiers have lower precedence than alphanumeric ones.
  if (isNumberA !== isNumberB) {
    return isNumberA ? -1 : 1
  }
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Compares two versions by semver precedence.
 * Returns a negative number if a is lower, a positive number if a is higher and 0 if they are equal.
 */
export const compareVersions = (a, b) => {
  const [, ...partsA] = VERSION_RE.exec(a)
  const [, ...partsB] = VERSION_RE.exec(b)

  for (let i = 0; i < 3; i++) {
    const difference = Number(partsA[i]) - Number(partsB[i])
    if (difference) {
      return difference
    }
  }

  const prereleaseA = partsA[3]
  const prereleaseB = partsB[3]
  // A pre-release version has lower precedence than the same version without one.
  if (prereleaseA === undefined || prereleaseB === undefined) {
    return (prereleaseA === undefined) - (prereleaseB === undefined)
  }

  const identifiersA = prereleaseA.split('.')
  const identifiersB = prereleaseB.split('.')
  const length = Math.min(identifiersA.length, identifiersB.length)
  for (let i = 0; i < length; i++) {
    const difference = compareIdentifiers(identifiersA[i], identifiersB[i])
    if (difference) {
      return difference
    }
  }
  // A larger set of identifiers has higher precedence when all the preceding ones are equal.
  return identifiersA.length - identifiersB.length
}
