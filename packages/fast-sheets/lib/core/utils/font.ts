export const getLinesHeight = (linesLength: number, fontHeight: number, lineSpacing: number) => {
  return linesLength * (fontHeight + lineSpacing) - lineSpacing
}
