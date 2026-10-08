import type { Cell, CellInfo, DomRect } from 'lib/core/types.ts'
import { type StateInstance } from 'lib/core/State.ts'
import { DEFAULT_FONT, DEFAULT_PADDING } from 'lib/core/constants.ts'

export const getCellKey = (cell: Cell) => `key${cell.rowIndex}${cell.columnIndex}`

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
