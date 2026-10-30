import type { Cell, Column, Data } from 'lib/core/types.ts'

interface Insertion {
  index: number
  count: number
}

interface Removal {
  index: number
  count: number
}

/** Whether `index` and `count` are integers, and `count` is positive, so that there is something to insert or remove. */
export const isValidIndexAndCount = (index: number, count: number) =>
  Number.isInteger(index) && Number.isInteger(count) && count > 0

/**
 * Limits an insertion into a list of `totalCount` rows or columns: it goes between 0 and the end.
 * Any count can be inserted, so `count` stays the same.
 */
export const clampInsertion = (index: number, count: number, totalCount: number): Insertion => ({
  index: Math.min(Math.max(index, 0), totalCount),
  count,
})

/**
 * Limits a removal from a list of `totalCount` rows or columns to the existing ones.
 * The count is 0 when none of them exist.
 */
export const clampRemoval = (index: number, count: number, totalCount: number): Removal => {
  const clampedIndex = Math.min(Math.max(index, 0), totalCount)
  return { index: clampedIndex, count: Math.min(count, totalCount - clampedIndex) }
}

/** Inserts an empty row, with a cell for each column, into `data` before the row at `index`, in place. */
export const insertRow = (data: Data, columns: Column[], index: number) => {
  data.splice(
    index,
    0,
    columns.map(() => ''),
  )
}

/** Removes the row at `index` from `data` in place. */
export const removeRow = (data: Data, index: number) => {
  data.splice(index, 1)
}

/**
 * Inserts an empty column into `data` and `columns` before the column at `index`, in place.
 * It copies the size of the column it's inserted before (or of the last one), without its name.
 */
export const insertColumn = (data: Data, columns: Column[], index: number) => {
  const { width, minWidth } = columns[index] || columns[index - 1] || {}
  columns.splice(index, 0, { width, minWidth })
  for (const row of data) {
    row.splice(index, 0, '')
  }
}

/** Removes the column at `index` from `data` and `columns` in place. */
export const removeColumn = (data: Data, columns: Column[], index: number) => {
  columns.splice(index, 1)
  for (const row of data) {
    row.splice(index, 1)
  }
}

/** A copy of the cell, moved down by one when it's at or below the row inserted at `insertedIndex`. */
export const getCellAfterRowInsertion = (
  cell: Readonly<Cell> | undefined,
  insertedIndex: number,
): Cell | undefined => {
  if (!cell) {
    return undefined
  }
  const { rowIndex, columnIndex } = cell
  return {
    rowIndex: rowIndex < insertedIndex ? rowIndex : rowIndex + 1,
    columnIndex,
  }
}

/** A copy of the cell, moved up by one when it's below the row removed at `removedIndex`, or undefined when it was in that row. */
export const getCellAfterRowRemoval = (
  cell: Readonly<Cell> | undefined,
  removedIndex: number,
): Cell | undefined => {
  if (!cell || cell.rowIndex === removedIndex) {
    return undefined
  }
  const { rowIndex, columnIndex } = cell
  return {
    rowIndex: rowIndex < removedIndex ? rowIndex : rowIndex - 1,
    columnIndex,
  }
}

/** A copy of the cell, moved right by one when it's at or right of the column inserted at `insertedIndex`. */
export const getCellAfterColumnInsertion = (
  cell: Readonly<Cell> | undefined,
  insertedIndex: number,
): Cell | undefined => {
  if (!cell) {
    return undefined
  }
  const { rowIndex, columnIndex } = cell
  return {
    rowIndex,
    columnIndex: columnIndex < insertedIndex ? columnIndex : columnIndex + 1,
  }
}

/** A copy of the cell, moved left by one when it's right of the column removed at `removedIndex`, or undefined when it was in that column. */
export const getCellAfterColumnRemoval = (
  cell: Readonly<Cell> | undefined,
  removedIndex: number,
): Cell | undefined => {
  if (!cell || cell.columnIndex === removedIndex) {
    return undefined
  }
  const { rowIndex, columnIndex } = cell
  return {
    rowIndex,
    columnIndex: columnIndex < removedIndex ? columnIndex : columnIndex - 1,
  }
}
