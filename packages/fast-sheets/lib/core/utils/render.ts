import { DEFAULT_FONT, DEFAULT_FONT_HEIGHT, DEFAULT_LINE_SPACING } from 'lib/core/constants.ts'
import { roundToPixels } from 'lib/core/utils/round-to-pixels.ts'
import { getLinesHeight } from 'lib/core/utils/font.ts'
import type { RenderCellBackgroundOptions, RenderCellTextOptions } from 'lib/core/types.ts'

export const renderCellBackground = ({
  ctx,
  backgroundColor,
  bordersColor,
  width,
  height,
  borderWidth,
}: RenderCellBackgroundOptions) => {
  if (bordersColor) {
    ctx.fillStyle = bordersColor
    ctx.fillRect(-borderWidth, -borderWidth, width + borderWidth * 2, height + borderWidth * 2)
  }

  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, width, height)
}

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
  const lineSpacing = DEFAULT_LINE_SPACING
  const fontHeight = font?.fontHeight || DEFAULT_FONT_HEIGHT
  const textByLines = text.split('\n')
  ctx.font = font?.font || DEFAULT_FONT
  ctx.fillStyle = fill
  ctx.textAlign = textAlign

  const textX = x
  let textY: number
  if (verticalAlign === 'middle') {
    const linesHeight = getLinesHeight(textByLines.length, fontHeight, lineSpacing)
    textY = y + fontHeight - linesHeight * 0.5 // align text-top to the center of a cell, and then lift text up on its half-height
  } else {
    textY = y
  }

  ctx.save()
  textByLines.forEach((textLine, i) => {
    ctx.fillText(
      textLine,
      roundToPixels(textX),
      roundToPixels(textY + i * (fontHeight + lineSpacing)),
    )
  })
  ctx.restore()
}
