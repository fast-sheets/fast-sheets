import type { CellsRange, Data } from 'lib/core'

/**
 * Converts a range of cells into a string for clipboard.
 * For instance, takes this part of data:
 * [
 *  [['1 : 1'], ['1 : 2']],
 *  [['2 : 1'], ['2 : 2']]
 * ]
 * and returns:
 * "1 : 1\t1 : 2\n2 : 1\t2 : 2"
 *
 *
 * @param data - The data containing the cells.
 * @param range - The range of cells to convert.
 * @returns Prepared for clipboard string, or undefined if the range is empty
 */
export const stringifyCellsRange = ({
  data,
  range,
}: {
  data: Data
  range: CellsRange
}): string | undefined => {
  const rows = data
    .slice(range.rowStart, range.rowEnd + 1)
    .map((row) => row.slice(range.columnStart, range.columnEnd + 1).join('\t'))
  if (!rows.length) {
    return undefined
  }
  return rows.join('\n')
}
