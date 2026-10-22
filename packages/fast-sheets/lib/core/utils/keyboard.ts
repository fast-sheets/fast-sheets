export const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

export const isArrowKey = (e: KeyboardEvent) => ARROW_KEYS.includes(e.key)

/**
 * Whether the keys are the "select all" shortcut: Ctrl+A, or Cmd+A on macOS.
 * On a layout without Latin letters (such as Russian) the A key is found by its place on the keyboard.
 */
export const isSelectAllShortcut = (e: KeyboardEvent) => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) {
    return false
  }
  const isLatinLetter = /^[a-z]$/i.test(e.key)
  return isLatinLetter ? e.key.toLowerCase() === 'a' : e.code === 'KeyA'
}

/**
 * Whether the key types a character, as opposed to keys such as "Home", "F2" or "CapsLock",
 * whose `key` is a name, and to shortcuts such as Ctrl+C.
 * AltGr (Ctrl+Alt on Windows) still types characters on many layouts.
 */
export const isCharacterKey = (e: KeyboardEvent) => {
  // spread to count code points, so an astral character such as an emoji is one character
  if ([...e.key].length !== 1) {
    return false
  }
  const isAltGraph = e.getModifierState('AltGraph')
  return isAltGraph || !(e.ctrlKey || e.metaKey || e.altKey)
}
