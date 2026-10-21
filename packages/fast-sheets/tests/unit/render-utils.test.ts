import { describe, expect, it } from 'vitest'
import { getOffsets } from 'lib/core/utils/render.ts'

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
