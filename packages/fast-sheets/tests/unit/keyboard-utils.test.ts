import { describe, expect, it } from 'vitest'
import { isArrowKey, isCharacterKey, isSelectAllShortcut } from 'lib/core/utils/keyboard.ts'

const keydown = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init)

describe('isCharacterKey', () => {
  it('is true for keys that type a character', () => {
    expect(isCharacterKey(keydown({ key: 'x' }))).toBe(true)
    expect(isCharacterKey(keydown({ key: 'X', shiftKey: true }))).toBe(true)
    expect(isCharacterKey(keydown({ key: ' ' }))).toBe(true)
    expect(isCharacterKey(keydown({ key: 'ж' }))).toBe(true)
    expect(isCharacterKey(keydown({ key: '😀' }))).toBe(true)
  })

  it('is false for named keys', () => {
    for (const key of ['Home', 'F2', 'CapsLock', 'Delete', 'Enter', 'Dead', 'Unidentified']) {
      expect(isCharacterKey(keydown({ key }))).toBe(false)
    }
  })

  it('is false for shortcuts', () => {
    expect(isCharacterKey(keydown({ key: 'c', ctrlKey: true }))).toBe(false)
    expect(isCharacterKey(keydown({ key: 'v', metaKey: true }))).toBe(false)
    expect(isCharacterKey(keydown({ key: 'f', altKey: true }))).toBe(false)
  })

  it('is true for characters typed with AltGr', () => {
    const event = keydown({ key: '@', ctrlKey: true, altKey: true, modifierAltGraph: true })
    expect(isCharacterKey(event)).toBe(true)
  })
})

describe('isArrowKey', () => {
  it('is true only for arrow keys', () => {
    expect(isArrowKey(keydown({ key: 'ArrowLeft' }))).toBe(true)
    expect(isArrowKey(keydown({ key: 'Tab' }))).toBe(false)
  })
})

describe('isSelectAllShortcut', () => {
  it('is true for Ctrl+A and Cmd+A', () => {
    expect(isSelectAllShortcut(keydown({ key: 'a', code: 'KeyA', ctrlKey: true }))).toBe(true)
    expect(isSelectAllShortcut(keydown({ key: 'a', code: 'KeyA', metaKey: true }))).toBe(true)
    expect(isSelectAllShortcut(keydown({ key: 'A', code: 'KeyA', ctrlKey: true }))).toBe(true)
  })

  it('finds the A key by its place on a layout without Latin letters', () => {
    expect(isSelectAllShortcut(keydown({ key: 'ф', code: 'KeyA', ctrlKey: true }))).toBe(true)
  })

  it('follows the letter, not the place, on a Latin layout', () => {
    // AZERTY: the key in the place of A types "q", and the A key is in the place of Q
    expect(isSelectAllShortcut(keydown({ key: 'q', code: 'KeyA', ctrlKey: true }))).toBe(false)
    expect(isSelectAllShortcut(keydown({ key: 'a', code: 'KeyQ', ctrlKey: true }))).toBe(true)
  })

  it('is false without Ctrl or Cmd, or with other modifiers', () => {
    expect(isSelectAllShortcut(keydown({ key: 'a', code: 'KeyA' }))).toBe(false)
    expect(
      isSelectAllShortcut(keydown({ key: 'a', code: 'KeyA', ctrlKey: true, altKey: true })),
    ).toBe(false)
    expect(
      isSelectAllShortcut(keydown({ key: 'A', code: 'KeyA', ctrlKey: true, shiftKey: true })),
    ).toBe(false)
  })
})
