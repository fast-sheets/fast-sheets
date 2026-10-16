import type { Data } from 'lib/core'

export const generateData = (rowsCount: number, columnsCount: number): Data =>
  Array.from({ length: rowsCount }, (_, i) =>
    Array.from({ length: columnsCount }, (_, j) =>
      i === 0 && j === 0 ? `r${i}\nc${j}` : `r${i}c${j}`,
    ),
  )
