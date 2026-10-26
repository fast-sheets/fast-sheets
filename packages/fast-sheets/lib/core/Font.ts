import { DEFAULT_LINE_SPACING } from 'lib/core/constants.ts'

export class Font {
  readonly font: string
  readonly textMetrics: TextMetrics
  readonly fontHeight: number
  readonly lineSpacing: number

  constructor({
    font,
    ctx,
    lineSpacing = DEFAULT_LINE_SPACING,
  }: {
    font: string
    ctx: CanvasRenderingContext2D
    lineSpacing?: number
  }) {
    this.font = font
    this.textMetrics = this.#getTextMetrics(ctx)
    this.fontHeight = this.#getFontHeight()
    this.lineSpacing = lineSpacing
  }

  #getTextMetrics(ctx: CanvasRenderingContext2D) {
    ctx.font = this.font
    return ctx.measureText('X')
  }

  #getFontHeight() {
    return this.textMetrics.actualBoundingBoxAscent + this.textMetrics.actualBoundingBoxDescent
  }

  getLinesHeight(linesCount: number) {
    return linesCount * (this.fontHeight + this.lineSpacing) - this.lineSpacing
  }
}
