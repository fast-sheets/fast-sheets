import { describe, expect, it } from 'vitest'
import { getBelowCell, getRightCell } from 'lib/core/utils/cell.ts'
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
    expect(getBelowCell({ cell: { rowIndex: 2, columnIndex: 0 }, state }).rowIndex).toBe(2)
    // rowIndex = 3 does not exist, should return 2 (last rowIndex)
    expect(getBelowCell({ cell: { rowIndex: 3, columnIndex: 0 }, state }).rowIndex).toBe(2)
  })

  it('stays on row 0 for empty data', () => {
    const state = createState({
      rowsCount: 0,
      columns: [],
      hasHeaderRow: true,
      isRowNumberVisible: true,
    })
    expect(getBelowCell({ cell: { rowIndex: 0, columnIndex: 0 }, state }).rowIndex).toBe(0)
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
    expect(getRightCell({ cell: { rowIndex: 1, columnIndex: 2 }, state }).columnIndex).toBe(2)
    // columnIndex = 3 does not exist, should return 2 (last columnIndex)
    expect(getRightCell({ cell: { rowIndex: 1, columnIndex: 3 }, state }).columnIndex).toBe(2)
  })

  it('stays on row 0 for empty data', () => {
    const state = createState({
      rowsCount: 0,
      columns: [],
      hasHeaderRow: false,
      isRowNumberVisible: false,
    })
    expect(getRightCell({ cell: { rowIndex: 0, columnIndex: 0 }, state }).rowIndex).toBe(0)
  })
})
