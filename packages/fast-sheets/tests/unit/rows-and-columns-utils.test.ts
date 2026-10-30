import { describe, expect, it } from 'vitest'
import {
  clampInsertion,
  clampRemoval,
  getCellAfterColumnInsertion,
  getCellAfterColumnRemoval,
  getCellAfterRowInsertion,
  getCellAfterRowRemoval,
  insertColumn,
  insertRow,
  isValidIndexAndCount,
  removeColumn,
  removeRow,
} from 'lib/core/utils/rows-and-columns.ts'
import type { Column } from 'lib/core/types.ts'
import { generateData } from 'tests/utils/generators.ts'

describe('isValidIndexAndCount', () => {
  it('accepts integers with a positive count', () => {
    expect(isValidIndexAndCount(0, 1)).toBe(true)
    // a negative index is clamped later
    expect(isValidIndexAndCount(-1, 3)).toBe(true)
  })

  it('rejects a count of nothing', () => {
    expect(isValidIndexAndCount(0, 0)).toBe(false)
    expect(isValidIndexAndCount(0, -1)).toBe(false)
  })

  it('rejects fractions and numbers that are not finite', () => {
    expect(isValidIndexAndCount(1.5, 1)).toBe(false)
    expect(isValidIndexAndCount(0, 1.5)).toBe(false)
    expect(isValidIndexAndCount(NaN, 1)).toBe(false)
    expect(isValidIndexAndCount(0, Infinity)).toBe(false)
  })
})

describe('clampInsertion', () => {
  it('keeps an insertion that fits', () => {
    expect(clampInsertion(1, 2, 5)).toEqual({ index: 1, count: 2 })
  })

  it('moves an index past the end to the end', () => {
    expect(clampInsertion(9, 1, 3)).toEqual({ index: 3, count: 1 })
  })

  it('moves a negative index to 0', () => {
    expect(clampInsertion(-2, 1, 5)).toEqual({ index: 0, count: 1 })
  })

  it('inserts into an empty list', () => {
    expect(clampInsertion(0, 1, 0)).toEqual({ index: 0, count: 1 })
  })
})

describe('clampRemoval', () => {
  it('keeps a removal that fits', () => {
    expect(clampRemoval(1, 2, 5)).toEqual({ index: 1, count: 2 })
  })

  it('cuts a removal to the existing items', () => {
    expect(clampRemoval(3, 10, 5)).toEqual({ index: 3, count: 2 })
  })

  it('moves a negative index to 0', () => {
    expect(clampRemoval(-2, 1, 5)).toEqual({ index: 0, count: 1 })
  })

  it('removes nothing past the end or from an empty list', () => {
    expect(clampRemoval(5, 1, 5)).toEqual({ index: 5, count: 0 })
    expect(clampRemoval(0, 1, 0)).toEqual({ index: 0, count: 0 })
  })
})

describe('insertRow', () => {
  it('inserts one empty row with a cell for each column', () => {
    const data = generateData(2, 2)
    insertRow(data, [{ name: 'A' }, { name: 'B' }], 1)
    expect(data).toEqual([
      ['r0\nc0', 'r0c1'],
      ['', ''],
      ['r1c0', 'r1c1'],
    ])
  })

  it('inserts a row at the end', () => {
    const data = generateData(1, 1)
    insertRow(data, [{}], 1)
    expect(data).toEqual([['r0\nc0'], ['']])
  })
})

describe('removeRow', () => {
  it('removes one row', () => {
    const data = generateData(3, 1)
    removeRow(data, 1)
    expect(data).toEqual([['r0\nc0'], ['r2c0']])
  })
})

describe('insertColumn', () => {
  const createColumns = (): Column[] => [
    { name: 'A', width: 80 },
    { name: 'B', minWidth: 120 },
  ]

  it('inserts one empty column that copies the size of the next column, without its name', () => {
    const data = generateData(2, 2)
    const columns = createColumns()
    insertColumn(data, columns, 1)
    expect(data).toEqual([
      ['r0\nc0', '', 'r0c1'],
      ['r1c0', '', 'r1c1'],
    ])
    expect(columns).toEqual([
      { name: 'A', width: 80 },
      { width: undefined, minWidth: 120 },
      { name: 'B', minWidth: 120 },
    ])
  })

  it('inserts a column at the end with the size of the last column', () => {
    const data = generateData(1, 2)
    const columns = createColumns()
    insertColumn(data, columns, 2)
    expect(data).toEqual([['r0\nc0', 'r0c1', '']])
    expect(columns[2]).toEqual({ width: undefined, minWidth: 120 })
  })
})

describe('removeColumn', () => {
  it('removes one column from the data and the columns', () => {
    const data = generateData(2, 3)
    const columns: Column[] = [{ name: 'A' }, { name: 'B' }, { name: 'C' }]
    removeColumn(data, columns, 1)
    expect(data).toEqual([
      ['r0\nc0', 'r0c2'],
      ['r1c0', 'r1c2'],
    ])
    expect(columns).toEqual([{ name: 'A' }, { name: 'C' }])
  })
})

describe('cells after inserting or removing rows and columns', () => {
  const cell = { rowIndex: 2, columnIndex: 3 }

  it('moves a cell at or below an inserted row down, and keeps one above it', () => {
    expect(getCellAfterRowInsertion(cell, 2)).toEqual({ rowIndex: 3, columnIndex: 3 })
    expect(getCellAfterRowInsertion(cell, 3)).toEqual(cell)
  })

  it('moves a cell below a removed row up, and drops one in it', () => {
    expect(getCellAfterRowRemoval(cell, 1)).toEqual({ rowIndex: 1, columnIndex: 3 })
    expect(getCellAfterRowRemoval(cell, 2)).toBeUndefined()
    expect(getCellAfterRowRemoval(cell, 3)).toEqual(cell)
  })

  it('moves a cell at or right of an inserted column right, and keeps one left of it', () => {
    expect(getCellAfterColumnInsertion(cell, 3)).toEqual({ rowIndex: 2, columnIndex: 4 })
    expect(getCellAfterColumnInsertion(cell, 4)).toEqual(cell)
  })

  it('moves a cell right of a removed column left, and drops one in it', () => {
    expect(getCellAfterColumnRemoval(cell, 0)).toEqual({ rowIndex: 2, columnIndex: 2 })
    expect(getCellAfterColumnRemoval(cell, 3)).toBeUndefined()
    expect(getCellAfterColumnRemoval(cell, 4)).toEqual(cell)
  })

  it('returns a copy, leaving the cell unchanged', () => {
    const result = getCellAfterRowInsertion(cell, 9)
    expect(result).not.toBe(cell)
    expect(cell).toEqual({ rowIndex: 2, columnIndex: 3 })
  })

  it('returns undefined without a cell', () => {
    expect(getCellAfterRowInsertion(undefined, 0)).toBeUndefined()
    expect(getCellAfterRowRemoval(undefined, 0)).toBeUndefined()
    expect(getCellAfterColumnInsertion(undefined, 0)).toBeUndefined()
    expect(getCellAfterColumnRemoval(undefined, 0)).toBeUndefined()
  })
})
