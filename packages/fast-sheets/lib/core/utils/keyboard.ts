export const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

export const isArrowKey = (e: KeyboardEvent) => ARROW_KEYS.includes(e.key)

/**
 * Whether the key types a character, as opposed to keys such as "Home", "F2" or "CapsLock",
 * whose `key` is a name, and to shortcuts such as Ctrl+C.
 * AltGr (reported as Ctrl+Alt on Windows) still types characters on many layouts.
 */
export const isCharacterKey = (e: KeyboardEvent) => {
  // spread to count code points, so an astral character such as an emoji is one character
  if ([...e.key].length !== 1) {
    return false
  }
  const isAltGraph = e.getModifierState('AltGraph')
  return isAltGraph || !(e.ctrlKey || e.metaKey || e.altKey)
}
