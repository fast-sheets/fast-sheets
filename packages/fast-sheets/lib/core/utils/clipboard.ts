import type { CellsRange, Data } from 'lib/core/types.ts'

const COLUMN_SEPARATOR = '\t'
const ROW_SEPARATOR = '\n'
const QUOTE = '"'

/**
 * Quotes a cell value the way spreadsheets do when they copy to the clipboard:
 * a value with a tab, a line break, or a quote is wrapped in quotes, and its quotes are doubled.
 */
const stringifyCellValue = (value: string) => {
  if (!/[\t\n\r"]/.test(value)) {
    return value
  }
  return `${QUOTE}${value.replaceAll(QUOTE, QUOTE + QUOTE)}${QUOTE}`
}

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
 * Values with tabs, line breaks or quotes are quoted, so `parseClipboardText` (and spreadsheet apps)
 * read them back as one cell.
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
  const rows = data.slice(range.rowStart, range.rowEnd + 1).map((row) =>
    row
      .slice(range.columnStart, range.columnEnd + 1)
      .map(stringifyCellValue)
      .join(COLUMN_SEPARATOR),
  )
  if (!rows.length) {
    return undefined
  }
  return rows.join(ROW_SEPARATOR)
}

/** Whether a field ends at `index`: at a tab, a line break or the end of the text. */
const isFieldEnd = (text: string, index: number) =>
  index >= text.length || text[index] === '\t' || text[index] === '\n' || text[index] === '\r'

/**
 * Reads a quoted field that starts at `start` (the opening quote).
 * Returns its value and the index right after the closing quote,
 * or undefined when the field is not a well-formed quoted field.
 */
const readQuotedField = (text: string, start: number) => {
  let value = ''
  let index = start + 1
  while (index < text.length) {
    const char = text[index]
    if (char === QUOTE) {
      if (text[index + 1] === QUOTE) {
        // an escaped quote
        value += QUOTE
        index += 2
        continue
      }
      // the closing quote must end the field, as in `"a"\t`, and not `"a"b`
      return isFieldEnd(text, index + 1) ? { value, end: index + 1 } : undefined
    }
    if (char === '\r') {
      // keep line breaks inside a cell as `\n`
      value += '\n'
      index += text[index + 1] === '\n' ? 2 : 1
      continue
    }
    value += char
    index += 1
  }
  // no closing quote
  return undefined
}

/**
 * Parses tab-separated text from the clipboard, as spreadsheet apps write it, into rows of cells.
 * - Cells are separated by tabs, rows by `\n`, `\r\n` or `\r`.
 * - A cell wrapped in quotes may contain tabs, line breaks and doubled quotes (`""`).
 *   A cell that only looks quoted, such as `"a"b` or `"a`, is read as it is.
 * - The line break that ends the last row (Excel adds one) does not add an empty row.
 */
export const parseClipboardText = (text: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let index = 0

  while (index <= text.length) {
    let value: string
    const quoted = text[index] === QUOTE ? readQuotedField(text, index) : undefined
    if (quoted) {
      value = quoted.value
      index = quoted.end
    } else {
      let end = index
      while (!isFieldEnd(text, end)) {
        end += 1
      }
      value = text.slice(index, end)
      index = end
    }
    row.push(value)

    if (index >= text.length) {
      rows.push(row)
      break
    }
    if (text[index] === '\t') {
      index += 1
      continue
    }
    // a line break ends the row
    index += text[index] === '\r' && text[index + 1] === '\n' ? 2 : 1
    rows.push(row)
    row = []
    if (index >= text.length) {
      // the text ends with a line break
      break
    }
  }

  return rows
}
