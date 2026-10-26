import type { State } from 'lib/core/State.ts'
import { DEFAULT_FONT, DEFAULT_PADDING } from 'lib/core/constants.ts'
import type { Cell, CellInfo, CellsRange, DomRect } from 'lib/core/types.ts'

/**
 * Type-detection utils
 */

/** A cell of the header-row (with the column name) */
export const isColumnHeading = (cell: Readonly<Cell>) =>
  cell.rowIndex === -1 && cell.columnIndex !== -1

/** A cell of the numbering-column (with the row number) */
export const isRowNumbering = (cell: Readonly<Cell>) =>
  cell.columnIndex === -1 && cell.rowIndex !== -1

/** The top-left cell (corner) between the header-row and the numbering-column. */
export const isCornerCell = (cell: Readonly<Cell>) =>
  cell.rowIndex === -1 && cell.columnIndex === -1

/** Cell is neither a column-heading / row-numbering nor the corner. */
export const isDataCell = (cell: Readonly<Cell>) => cell.rowIndex !== -1 && cell.columnIndex !== -1

/**
 * Text & geometry utils
 */

/** The raw text of a cell: the data, the column name, the row number, or nothing for the corner. */
export const getCellText = (cell: Readonly<Cell>, state: Readonly<State>): string => {
  const { options } = state
  if (isCornerCell(cell)) {
    return ''
  }
  if (isColumnHeading(cell)) {
    return options.columns[cell.columnIndex]?.name || ''
  }
  if (isRowNumbering(cell)) {
    return (cell.rowIndex + 1).toString()
  }
  return options.data[cell.rowIndex]?.[cell.columnIndex] || ''
}

export const getCellInfo = (cell: Readonly<Cell>, state: Readonly<State>): CellInfo => {
  const cellDomRect = getCellDomRect(cell, state)
  return {
    cell,
    ...cellDomRect,
    center: {
      x: cellDomRect.width / 2,
      y: cellDomRect.height / 2,
    },
    text: getCellText(cell, state),
    padding: DEFAULT_PADDING,
    font: DEFAULT_FONT,
  }
}

export const getCellDomRect = (cell: Readonly<Cell>, state: Readonly<State>): DomRect => {
  const { rowIndex, columnIndex } = cell
  return {
    top: state.verticalOffsets[rowIndex] || 0,
    left: state.horizontalOffsets[columnIndex] || 0,
    width: state.columnWidths[columnIndex] || 0,
    height: state.rowHeights[rowIndex] || 0,
  }
}

/**
 * Neighbor-detection utils
 */

export const getAboveCell = (cell: Readonly<Cell>): Cell => {
  return {
    ...cell,
    rowIndex: Math.max(0, cell.rowIndex - 1),
  }
}

export const getBelowCell = (cell: Readonly<Cell>, state: Readonly<State>): Cell => {
  return {
    ...cell,
    rowIndex: Math.min(Math.max(state.options.data.length - 1, 0), cell.rowIndex + 1),
  }
}

export const getLeftCell = (cell: Readonly<Cell>): Cell => {
  return {
    ...cell,
    columnIndex: Math.max(0, cell.columnIndex - 1),
  }
}

export const getRightCell = (cell: Readonly<Cell>, state: Readonly<State>): Cell => {
  return {
    ...cell,
    columnIndex: Math.min((state.options.data[0]?.length || 1) - 1, cell.columnIndex + 1),
  }
}

/**
 * Conversion utils
 */

/**
 * Converts a single cell to a range
 * @param cell
 * @return range
 */
export const convertCellToRange = (cell: Readonly<Cell>): CellsRange => {
  return {
    rowStart: cell.rowIndex,
    rowEnd: cell.rowIndex,
    columnStart: cell.columnIndex,
    columnEnd: cell.columnIndex,
  }
}
