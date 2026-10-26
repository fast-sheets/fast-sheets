import { describe, expect, it } from 'vitest'
import { FontsManager } from 'lib/core/FontsManager.ts'
import { DEFAULT_FONT } from 'lib/core/constants.ts'

/** A 2D context that measures fonts by the size in their name, because jsdom has no canvas. */
const createFakeContext = () => {
  const ctx = {
    font: '',
    measureText: () => ({
      actualBoundingBoxAscent: Number.parseInt(ctx.font, 10),
      actualBoundingBoxDescent: 0,
    }),
  }
  return ctx as unknown as CanvasRenderingContext2D
}

describe('FontsManager', () => {
  it('throws for a font requested before the first initFonts', () => {
    expect(() => new FontsManager().getFont(DEFAULT_FONT)).toThrow(
      `Font "${DEFAULT_FONT}" can't be measured before the first layout`,
    )
  })

  it('measures a font on the first request and returns the same font after that', () => {
    const fontsManager = new FontsManager()
    fontsManager.initFonts(createFakeContext())

    const font = fontsManager.getFont('20px serif')
    expect(font.font).toBe('20px serif')
    expect(font.fontHeight).toBe(20)
    expect(fontsManager.getFont('20px serif')).toBe(font)
  })

  it('measures every font again after the next initFonts', () => {
    const fontsManager = new FontsManager()
    fontsManager.initFonts(createFakeContext())
    const defaultFont = fontsManager.getFont(DEFAULT_FONT)
    const customFont = fontsManager.getFont('20px serif')

    fontsManager.initFonts(createFakeContext())

    expect(fontsManager.getFont(DEFAULT_FONT)).not.toBe(defaultFont)
    expect(fontsManager.getFont('20px serif')).not.toBe(customFont)
  })
})
