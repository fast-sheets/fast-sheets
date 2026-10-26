import { describe, expect, it } from 'vitest'
import { getOffsets, getTextX, getTextY } from 'lib/core/utils/render.ts'
import { getLinesCount } from 'lib/core/utils/string.ts'

describe('getOffsets', () => {
  it('starts at the first offset and adds each size and a border', () => {
    expect(getOffsets([20, 30, 40], 2, 2)).toEqual([2, 24, 56])
  })

  it('keeps an offset of 0 when there are no borders', () => {
    expect(getOffsets([20, 30, 40], 0, 0)).toEqual([0, 20, 50])
  })

  it('returns no offsets for no sizes', () => {
    expect(getOffsets([], 1, 1)).toEqual([])
  })
})

describe('getLinesCount', () => {
  it('counts the line breaks plus one', () => {
    expect(getLinesCount('')).toBe(1)
    expect(getLinesCount('one')).toBe(1)
    expect(getLinesCount('one\ntwo')).toBe(2)
    expect(getLinesCount('\n\n')).toBe(3)
  })
})

describe('getTextX', () => {
  it('starts after the padding for left alignment', () => {
    expect(getTextX('left', 100, 2)).toBe(2)
    expect(getTextX('start', 100, 2)).toBe(2)
  })

  it('is the middle of the cell for center alignment', () => {
    expect(getTextX('center', 100, 2)).toBe(50)
  })

  it('ends before the padding for right alignment', () => {
    expect(getTextX('right', 100, 2)).toBe(98)
    expect(getTextX('end', 100, 2)).toBe(98)
  })
})

describe('getTextY', () => {
  it('middle alignment', () => {
    expect(getTextY('middle', 40, 5, 0, 10)).toBe(20)
  })

  it('top alignment', () => {
    expect(getTextY('top', 40, 5, 10, 10)).toBe(15)
  })

  it('bottom alignment', () => {
    expect(getTextY('bottom', 40, 5, 5, 10)).toBe(30)
  })
})
