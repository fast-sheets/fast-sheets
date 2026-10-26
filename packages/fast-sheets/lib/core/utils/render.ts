import { roundToPixels } from 'lib/core/utils/round-to-pixels.ts'
import { getLinesCount } from 'lib/core/utils/string.ts'
import type { CellStyle, RenderCellTextOptions } from 'lib/core/types.ts'

export const renderCellText = ({
  ctx,
  text,
  x,
  y,
  font,
  fill = '#000',
  textAlign = 'left',
  verticalAlign = 'middle',
}: RenderCellTextOptions) => {
  const lineSpacing = font.lineSpacing
  const fontHeight = font.fontHeight
  const linesCount = getLinesCount(text)
  ctx.font = font.font
  ctx.fillStyle = fill
  ctx.textAlign = textAlign

  const textX = x
  let textY: number
  if (verticalAlign === 'middle') {
    const linesHeight = font.getLinesHeight(linesCount)
    textY = y + fontHeight - linesHeight * 0.5 // align text-top to the center of a cell, and then lift text up on its half-height
  } else {
    textY = y
  }

  ctx.save()
  if (linesCount === 1) {
    // most cells have one line
    ctx.fillText(text, roundToPixels(textX), roundToPixels(textY))
  } else {
    text.split('\n').forEach((textLine, i) => {
      ctx.fillText(
        textLine,
        roundToPixels(textX),
        roundToPixels(textY + i * (fontHeight + lineSpacing)),
      )
    })
  }
  ctx.restore()
}

/**
 * Fills the borders around a cell: the strips of `borderWidth` just outside it, without touching the cell itself.
 * The context must be translated so that 0,0 is the top-left corner of the cell.
 */
export const renderCellBorders = (
  ctx: CanvasRenderingContext2D,
  color: string,
  width: number,
  height: number,
  borderWidth: number,
) => {
  ctx.fillStyle = color
  ctx.fillRect(-borderWidth, -borderWidth, width + borderWidth * 2, borderWidth) // top
  ctx.fillRect(-borderWidth, height, width + borderWidth * 2, borderWidth) // bottom
  ctx.fillRect(-borderWidth, 0, borderWidth, height) // left
  ctx.fillRect(width, 0, borderWidth, height) // right
}

/** Returns the x coordinate to pass to `renderCellText` for a cell of this width. */
export const getTextX = (textAlign: CanvasTextAlign, width: number, paddingX: number) => {
  if (textAlign === 'center') {
    return width / 2
  }
  if (textAlign === 'right' || textAlign === 'end') {
    return width - paddingX
  }
  return paddingX
}

/**
 * Returns the y coordinate to pass to `renderCellText` for a cell of this height.
 * For middle alignment it is the center of the cell; otherwise it is the baseline of the first line.
 * `linesHeight` is used only for bottom alignment.
 */
export const getTextY = (
  verticalAlign: CellStyle['verticalAlign'],
  height: number,
  paddingY: number,
  fontHeight: number,
  linesHeight: number,
) => {
  if (verticalAlign === 'middle') {
    return height / 2
  }
  if (verticalAlign === 'top') {
    return paddingY + fontHeight
  }
  return height - paddingY - linesHeight + fontHeight
}

/**
 * Returns where each row (or column) starts: the first one at `firstOffset`,
 * and each next one after the previous size and a border.
 */
export const getOffsets = (sizes: readonly number[], firstOffset: number, borderWidth: number) => {
  const offsets: number[] = []
  let offset = firstOffset
  for (const size of sizes) {
    offsets.push(offset)
    offset += size + borderWidth
  }
  return offsets
}
