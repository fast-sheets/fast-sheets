/**
 * Counts the lines in a text: number of "\n" + 1
 */
export const getLinesCount = (text: string) => {
  let linesCount = 1
  let index = text.indexOf('\n')
  while (index !== -1) {
    linesCount++
    index = text.indexOf('\n', index + 1)
  }
  return linesCount
}

export const getLinesHeight = (linesLength: number, fontHeight: number, lineSpacing: number) => {
  return linesLength * (fontHeight + lineSpacing) - lineSpacing
}
