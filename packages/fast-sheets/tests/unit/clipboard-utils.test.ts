import { describe, expect, it } from 'vitest'
import { parseClipboardText, stringifyCellsRange } from 'lib/core/utils/clipboard.ts'
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

describe('stringifyCellsRange quoting', () => {
  it('quotes values with line breaks, tabs or quotes and doubles their quotes', () => {
    const data: Data = [['a\nb', 'a\tb', 'say "hi"', 'plain']]
    const range: CellsRange = { rowStart: 0, rowEnd: 0, columnStart: 0, columnEnd: 3 }
    expect(stringifyCellsRange({ data, range })).toEqual('"a\nb"\t"a\tb"\t"say ""hi"""\tplain')
  })
})

describe('parseClipboardText', () => {
  it('splits rows by line breaks and cells by tabs', () => {
    expect(parseClipboardText('a\tb\nc\td')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('accepts \\r\\n and \\r line breaks', () => {
    expect(parseClipboardText('a\tb\r\nc\td\re')).toEqual([['a', 'b'], ['c', 'd'], ['e']])
  })

  it('ignores the line break that ends the last row', () => {
    expect(parseClipboardText('a\tb\r\n')).toEqual([['a', 'b']])
    expect(parseClipboardText('a\n')).toEqual([['a']])
  })

  it('keeps empty cells and empty rows', () => {
    expect(parseClipboardText('a\t\tc\n\nd\t')).toEqual([['a', '', 'c'], [''], ['d', '']])
  })

  it('reads quoted cells with line breaks, tabs, punctuation and doubled quotes', () => {
    expect(parseClipboardText('"hello, world!\nsecond line"\t"a\tb"\nx\t"say ""hi"""')).toEqual([
      ['hello, world!\nsecond line', 'a\tb'],
      ['x', 'say "hi"'],
    ])
  })

  it('turns \\r\\n inside a quoted cell into \\n', () => {
    expect(parseClipboardText('"a\r\nb"\r\n')).toEqual([['a\nb']])
  })

  it('keeps quotes that do not wrap the whole cell', () => {
    expect(parseClipboardText('say "hi"\t"a"b\t"open')).toEqual([['say "hi"', '"a"b', '"open']])
  })

  it('does not treat "/n" as a line break', () => {
    expect(parseClipboardText('https://a/nb')).toEqual([['https://a/nb']])
  })

  it('reads back what stringifyCellsRange writes', () => {
    const data: Data = [
      ['a\nb', 'say "hi"', 'x\ty'],
      ['', '"', 'plain'],
    ]
    const range: CellsRange = { rowStart: 0, rowEnd: 1, columnStart: 0, columnEnd: 2 }
    expect(parseClipboardText(stringifyCellsRange({ data, range }) || '')).toEqual(data)
  })
})
