export class Font {
  public readonly font: string
  public readonly textMetrics: TextMetrics
  public readonly fontHeight: number

  constructor(font: string, ctx: CanvasRenderingContext2D) {
    this.font = font
    this.textMetrics = this.getTextMetrics(ctx)
    this.fontHeight = this.getFontHeight()
  }

  private getTextMetrics(ctx: CanvasRenderingContext2D) {
    ctx.font = this.font
    return ctx.measureText('X')
  }

  private getFontHeight() {
    return this.textMetrics.actualBoundingBoxAscent + this.textMetrics.actualBoundingBoxDescent
  }
}
