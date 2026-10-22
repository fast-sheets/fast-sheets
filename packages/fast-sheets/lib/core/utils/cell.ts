import { type StateInstance } from 'lib/core/State.ts'
import { DEFAULT_FONT, DEFAULT_PADDING } from 'lib/core/constants.ts'
import type { Cell, CellInfo, CellsRange, DomRect } from 'lib/core/types.ts'

export const getCellText = ({ cell, state }: { cell: Cell; state: StateInstance }): string => {
  return state.options.data[cell.rowIndex]?.[cell.columnIndex] || ''
}

export const getCellInfo = ({ cell, state }: { cell: Cell; state: StateInstance }): CellInfo => {
  const cellDomRect = getCellDomRect({ cell, state })
  return {
    cell,
    ...cellDomRect,
    center: {
      x: cellDomRect.width / 2,
      y: cellDomRect.height / 2,
    },
    text: getCellText({ cell, state }),
    padding: DEFAULT_PADDING,
    font: DEFAULT_FONT,
  }
}

export const getCellDomRect = ({ cell, state }: { cell: Cell; state: StateInstance }): DomRect => {
  const { rowIndex, columnIndex } = cell
  return {
    top: state.verticalOffsets[rowIndex] || 0,
    left: state.horizontalOffsets[columnIndex] || 0,
    width: state.columnWidths[columnIndex] || 0,
    height: state.rowHeights[rowIndex] || 0,
  }
}

export const getAboveCell = ({ cell }: { cell: Cell }): Cell => {
  return {
    ...cell,
    rowIndex: Math.max(0, cell.rowIndex - 1),
  }
}

export const getBelowCell = ({ cell, state }: { cell: Cell; state: StateInstance }): Cell => {
  return {
    ...cell,
    rowIndex: Math.min(Math.max(state.options.data.length - 1, 0), cell.rowIndex + 1),
  }
}

export const getLeftCell = ({ cell }: { cell: Cell }): Cell => {
  return {
    ...cell,
    columnIndex: Math.max(0, cell.columnIndex - 1),
  }
}

export const getRightCell = ({ cell, state }: { cell: Cell; state: StateInstance }): Cell => {
  return {
    ...cell,
    columnIndex: Math.min((state.options.data[0]?.length || 1) - 1, cell.columnIndex + 1),
  }
}

/**
 * Converts a single cell to a range
 * @param cell
 * @return range
 */
export const convertCellToRange = (cell: Cell): CellsRange => {
  return {
    rowStart: cell.rowIndex,
    rowEnd: cell.rowIndex,
    columnStart: cell.columnIndex,
    columnEnd: cell.columnIndex,
  }
}
