import { describe, expect, it } from 'vitest'
import {
  getBelowCell,
  getCellText,
  getRightCell,
  isColumnHeading,
  isCornerCell,
  isDataCell,
  isRowNumbering,
} from 'lib/core/utils/cell.ts'
import { createState } from './utils/state'

describe('getBelowCell', () => {
  it('can reach the last data row and not go beyond', () => {
    const state = createState({
      rowsCount: 3,
      columns: [
        { name: 'A', width: 100 },
        { name: 'B', width: 100 },
      ],
      hasHeaderRow: true,
      isRowNumberVisible: true,
    }) // grid rows 0,1,2
    expect(getBelowCell({ rowIndex: 2, columnIndex: 0 }, state).rowIndex).toBe(2)
    // rowIndex = 3 does not exist, should return 2 (last rowIndex)
    expect(getBelowCell({ rowIndex: 3, columnIndex: 0 }, state).rowIndex).toBe(2)
  })

  it('stays on row 0 for empty data', () => {
    const state = createState({
      rowsCount: 0,
      columns: [],
      hasHeaderRow: true,
      isRowNumberVisible: true,
    })
    expect(getBelowCell({ rowIndex: 0, columnIndex: 0 }, state).rowIndex).toBe(0)
  })
})

describe('getRightCell', () => {
  it('can reach the last data row and not go beyond', () => {
    const state = createState({
      rowsCount: 1,
      columns: [
        { name: 'A', width: 100 },
        { name: 'B', width: 100 },
        { name: 'C', width: 100 },
      ],
      hasHeaderRow: true,
      isRowNumberVisible: true,
    }) // grid columns 0,1,2
    expect(getRightCell({ rowIndex: 1, columnIndex: 2 }, state).columnIndex).toBe(2)
    // columnIndex = 3 does not exist, should return 2 (last columnIndex)
    expect(getRightCell({ rowIndex: 1, columnIndex: 3 }, state).columnIndex).toBe(2)
  })

  it('stops at the last column when the rows have more values than columns', () => {
    const state = createState({
      rowsCount: 1,
      columns: [
        { name: 'A', width: 100 },
        { name: 'B', width: 100 },
      ],
      hasHeaderRow: true,
      isRowNumberVisible: true,
    })
    state.options.data = [['a', 'b', 'c', 'd']]
    expect(getRightCell({ rowIndex: 0, columnIndex: 1 }, state).columnIndex).toBe(1)
  })

  it('stays on row 0 for empty data', () => {
    const state = createState({
      rowsCount: 0,
      columns: [],
      hasHeaderRow: false,
      isRowNumberVisible: false,
    })
    expect(getRightCell({ rowIndex: 0, columnIndex: 0 }, state).rowIndex).toBe(0)
  })
})

describe('isColumnHeading', () => {
  it('is true for a row index of -1, but not for the corner', () => {
    expect(isColumnHeading({ rowIndex: -1, columnIndex: 0 })).toBe(true)
    expect(isColumnHeading({ rowIndex: -1, columnIndex: -1 })).toBe(false)
    expect(isColumnHeading({ rowIndex: 0, columnIndex: -1 })).toBe(false)
    expect(isColumnHeading({ rowIndex: 0, columnIndex: 0 })).toBe(false)
  })
})

describe('isRowNumbering', () => {
  it('is true for a column index of -1, but not for the corner', () => {
    expect(isRowNumbering({ rowIndex: 0, columnIndex: -1 })).toBe(true)
    expect(isRowNumbering({ rowIndex: -1, columnIndex: -1 })).toBe(false)
    expect(isRowNumbering({ rowIndex: -1, columnIndex: 0 })).toBe(false)
    expect(isRowNumbering({ rowIndex: 0, columnIndex: 0 })).toBe(false)
  })
})

describe('isDataCell', () => {
  it('is true only when neither index is -1', () => {
    expect(isDataCell({ rowIndex: 0, columnIndex: 0 })).toBe(true)
    expect(isDataCell({ rowIndex: -1, columnIndex: 0 })).toBe(false)
    expect(isDataCell({ rowIndex: 0, columnIndex: -1 })).toBe(false)
    expect(isDataCell({ rowIndex: -1, columnIndex: -1 })).toBe(false)
  })
})

describe('isCornerCell', () => {
  it('is true only when both indexes are -1', () => {
    expect(isCornerCell({ rowIndex: -1, columnIndex: -1 })).toBe(true)
    expect(isCornerCell({ rowIndex: -1, columnIndex: 0 })).toBe(false)
    expect(isCornerCell({ rowIndex: 0, columnIndex: -1 })).toBe(false)
    expect(isCornerCell({ rowIndex: 0, columnIndex: 0 })).toBe(false)
  })
})

describe('getCellText', () => {
  const state = createState({
    rowsCount: 3,
    columns: [
      { name: 'A', width: 100 },
      { name: 'B', width: 100 },
    ],
    hasHeaderRow: true,
    isRowNumberVisible: true,
  })

  it('returns the data of a data cell', () => {
    expect(getCellText({ rowIndex: 1, columnIndex: 1 }, state)).toBe(state.options.data[1]![1])
  })

  it('returns an empty string for a cell outside the data', () => {
    expect(getCellText({ rowIndex: 10, columnIndex: 0 }, state)).toBe('')
  })

  it('returns the column name of a column heading', () => {
    const cell = { rowIndex: -1, columnIndex: 1 }
    expect(getCellText(cell, state)).toBe('B')
  })

  it('returns the row number, counted from 1, of a row numbering cell', () => {
    const cell = { rowIndex: 2, columnIndex: -1 }
    expect(getCellText(cell, state)).toBe('3')
  })

  it('returns an empty string for the corner', () => {
    const cell = { rowIndex: -1, columnIndex: -1 }
    expect(getCellText(cell, state)).toBe('')
  })
})
