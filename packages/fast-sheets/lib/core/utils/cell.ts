import type { Cell, CellInfo, DomRect } from 'lib/core/types.ts'
import { type StateInstance } from 'lib/core/State.ts'
import { DEFAULT_FONT, DEFAULT_PADDING } from 'lib/core/constants.ts'

export const getCellKey = (cell: Cell) => `${cell.rowIndex}:${cell.columnIndex}`

export const getCellText = ({ cell, state }: { cell: Cell; state: StateInstance }): string => {
  const isRowNumberVisible = !!state.options.isRowNumberVisible
  const hasColumnNames = state.hasColumnNames
  const isRowNumber = isRowNumberVisible && cell.columnIndex === 0
  const isColumnName = hasColumnNames && cell.rowIndex === 0

  if (isRowNumber && isColumnName) {
    return ''
  } else if (isRowNumber) {
    return (hasColumnNames ? cell.rowIndex : cell.rowIndex + 1).toString()
  } else if (isColumnName) {
    return state.options.columns[cell.columnIndex]?.name || ''
  }

  const dataRowIndex = hasColumnNames ? cell.rowIndex - 1 : cell.rowIndex
  const dataColumnIndex = isRowNumberVisible ? cell.columnIndex - 1 : cell.columnIndex
  return state.options.data[dataRowIndex]?.[dataColumnIndex] || ''
}

export const getCellInfo = ({ cell, state }: { cell: Cell; state: StateInstance }): CellInfo => {
  const isRowNumberVisible = !!state.options.isRowNumberVisible
  const hasColumnNames = state.hasColumnNames
  const isRowNumber = isRowNumberVisible && cell.columnIndex === 0
  const isColumnName = hasColumnNames && cell.rowIndex === 0

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
    isRowNumber,
    isColumnName,
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

export const getAboveCell = ({ cell, state }: { cell: Cell; state: StateInstance }): Cell => {
  const minRowIndex = state.hasColumnNames ? 1 : 0
  return {
    ...cell,
    rowIndex: Math.max(minRowIndex, cell.rowIndex - 1),
  }
}

export const getBelowCell = ({ cell, state }: { cell: Cell; state: StateInstance }): Cell => {
  const maxRowIndex = (state.options.data.length || 2) - 1
  return {
    ...cell,
    rowIndex: Math.min(maxRowIndex, cell.rowIndex + 1),
  }
}

export const getLeftCell = ({ cell, state }: { cell: Cell; state: StateInstance }): Cell => {
  const minColumnIndex = state.options.isRowNumberVisible ? 1 : 0
  return {
    ...cell,
    columnIndex: Math.max(minColumnIndex, cell.columnIndex - 1),
  }
}

export const getRightCell = ({ cell, state }: { cell: Cell; state: StateInstance }): Cell => {
  let maxColumnIndex = (state.options.data[0]?.length || 2) - 1
  if (state.options.isRowNumberVisible) {
    maxColumnIndex++
  }
  return {
    ...cell,
    columnIndex: Math.min(maxColumnIndex, cell.columnIndex + 1),
  }
}
