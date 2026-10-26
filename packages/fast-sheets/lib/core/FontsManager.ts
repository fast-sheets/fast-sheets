import { Font } from 'lib/core/Font.ts'
import { DEFAULT_FONT, COLUMN_HEADING_FONT, ROW_NUMBERING_FONT } from 'lib/core/constants.ts'

/** Measures fonts on the canvas context and keeps them until the context is set again. */
export class FontsManager {
  /** The fonts the core renders with, measured as soon as there is a context. */
  readonly #defaultFonts = [DEFAULT_FONT, COLUMN_HEADING_FONT, ROW_NUMBERING_FONT]
  #ctx: CanvasRenderingContext2D | null = null
  #fontsCache = new Map<string, Font>()

  /** Measures the default fonts on this context and forgets every font measured before. */
  initFonts(ctx: CanvasRenderingContext2D) {
    this.#ctx = ctx
    this.#fontsCache = new Map()
    for (const font of this.#defaultFonts) {
      this.getFont(font)
    }
  }

  /** Returns a font measured on the first request and cached until the next `initFonts`. */
  getFont(fontName: string): Font {
    let font = this.#fontsCache.get(fontName)
    if (!font) {
      if (!this.#ctx) {
        throw new Error(`Font "${fontName}" can't be measured before the first layout`)
      }
      font = new Font({ font: fontName, ctx: this.#ctx })
      this.#fontsCache.set(fontName, font)
    }
    return font
  }
}
