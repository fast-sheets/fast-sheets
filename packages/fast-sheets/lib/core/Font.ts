export class Font {
  readonly font: string
  readonly textMetrics: TextMetrics
  readonly fontHeight: number

  constructor(font: string, ctx: CanvasRenderingContext2D) {
    this.font = font
    this.textMetrics = this.#getTextMetrics(ctx)
    this.fontHeight = this.#getFontHeight()
  }

  #getTextMetrics(ctx: CanvasRenderingContext2D) {
    ctx.font = this.font
    return ctx.measureText('X')
  }

  #getFontHeight() {
    return this.textMetrics.actualBoundingBoxAscent + this.textMetrics.actualBoundingBoxDescent
  }
}
