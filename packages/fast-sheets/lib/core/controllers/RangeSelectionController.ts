import type { Cell, CellsRange, CellsRangeWithPivot } from 'lib/core/types.ts'

const EMPTY_RANGE: CellsRange = {
  rowStart: -1,
  rowEnd: -1,
  columnStart: -1,
  columnEnd: -1,
}
const EMPTY_RANGE_WITH_PIVOT: CellsRangeWithPivot = {
  rowPivot: -1,
  columnPivot: -1,
  ...EMPTY_RANGE,
}

export class RangeSelectionController {
  hasStarted = false
  selectionRange: CellsRangeWithPivot = { ...EMPTY_RANGE_WITH_PIVOT }

  selectionStart(cell: Cell) {
    this.hasStarted = true
    this.selectionRange.rowPivot = cell.rowIndex
    this.selectionRange.columnPivot = cell.columnIndex
  }

  selectionUpdate(cell: Cell) {
    if (this.hasStarted) {
      // column
      if (cell.columnIndex > this.selectionRange.columnPivot) {
        this.selectionRange.columnStart = this.selectionRange.columnPivot
        this.selectionRange.columnEnd = cell.columnIndex
      } else {
        this.selectionRange.columnStart = cell.columnIndex
        this.selectionRange.columnEnd = this.selectionRange.columnPivot
      }
      // row
      if (cell.rowIndex > this.selectionRange.rowPivot) {
        this.selectionRange.rowStart = this.selectionRange.rowPivot
        this.selectionRange.rowEnd = cell.rowIndex
      } else {
        this.selectionRange.rowStart = cell.rowIndex
        this.selectionRange.rowEnd = this.selectionRange.rowPivot
      }
      return true
    }
    return false
  }

  selectionEnd() {
    this.hasStarted = false
  }

  isCellSelected(cell: Cell) {
    return (
      cell.rowIndex >= this.selectionRange.rowStart &&
      cell.rowIndex <= this.selectionRange.rowEnd &&
      cell.columnIndex >= this.selectionRange.columnStart &&
      cell.columnIndex <= this.selectionRange.columnEnd
    )
  }

  selectedCellsCount() {
    return (
      (Math.abs(this.selectionRange.columnEnd - this.selectionRange.columnStart) + 1) *
      (Math.abs(this.selectionRange.rowEnd - this.selectionRange.rowStart) + 1)
    )
  }

  reset() {
    this.hasStarted = false
    this.selectionRange = { ...EMPTY_RANGE_WITH_PIVOT }
  }
}
