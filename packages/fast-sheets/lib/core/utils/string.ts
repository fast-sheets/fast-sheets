/**
 * Counts the lines in a string: number of "\n" + 1
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
