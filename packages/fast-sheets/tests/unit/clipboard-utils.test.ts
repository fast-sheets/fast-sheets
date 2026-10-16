import { describe, expect, it } from 'vitest'
import { stringifyCellsRange } from 'lib/core/utils/clipboard.ts'
import type { CellsRange, Data } from 'lib/core'

describe('stringifyCellsRange', () => {
  it('returns stringified string for cells range', () => {
    const data: Data = [
      ['0 : 0', '0 : 1', '0 : 2'],
      ['1 : 0', '1 : 1', '1 : 2'],
      ['2 : 0', '2 : 1', '2 : 2'],
    ]
    const range: CellsRange = { rowStart: 1, rowEnd: 2, columnStart: 1, columnEnd: 2 }
    const text = stringifyCellsRange({ data, range })
    expect(text).toEqual('1 : 1\t1 : 2\n2 : 1\t2 : 2')
  })

  it('returns stringified string for a single cell', () => {
    const data: Data = [
      ['0 : 0', '0 : 1', '0 : 2'],
      ['1 : 0', '1 : 1', '1 : 2'],
      ['2 : 0', '2 : 1', '2 : 2'],
    ]
    const range: CellsRange = { rowStart: 1, rowEnd: 1, columnStart: 1, columnEnd: 1 }
    const text = stringifyCellsRange({ data, range })
    expect(text).toEqual('1 : 1')
  })

  it('returns undefined for outer range', () => {
    const data: Data = [
      ['0 : 0', '0 : 1', '0 : 2'],
      ['1 : 0', '1 : 1', '1 : 2'],
      ['2 : 0', '2 : 1', '2 : 2'],
    ]
    const range: CellsRange = { rowStart: 4, rowEnd: 5, columnStart: 1, columnEnd: 2 }
    const text = stringifyCellsRange({ data, range })
    expect(text).toBeUndefined()
  })

  it('returns undefined for invalid range', () => {
    const data: Data = [
      ['0 : 0', '0 : 1', '0 : 2'],
      ['1 : 0', '1 : 1', '1 : 2'],
      ['2 : 0', '2 : 1', '2 : 2'],
    ]
    const range: CellsRange = { rowStart: -1, rowEnd: -1, columnStart: -1, columnEnd: -1 }
    const text = stringifyCellsRange({ data, range })
    expect(text).toBeUndefined()
  })
})
