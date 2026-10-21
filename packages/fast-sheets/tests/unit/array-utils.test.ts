import { describe, expect, it } from 'vitest'
import { findLastIndexLessOrEqual } from 'lib/core/utils/array.ts'

const linear = (arr: number[], value: number) => arr.findLastIndex((x) => x <= value)

describe('findLastIndexLessOrEqual', () => {
  it('returns -1 for an empty array', () => {
    expect(findLastIndexLessOrEqual([], 0)).toBe(-1)
    expect(findLastIndexLessOrEqual([], 100)).toBe(-1)
  })

  it('handles a single element', () => {
    expect(findLastIndexLessOrEqual([10], 9)).toBe(-1)
    expect(findLastIndexLessOrEqual([10], 10)).toBe(0)
    expect(findLastIndexLessOrEqual([10], 11)).toBe(0)
  })

  it('returns -1 when value is below the first element', () => {
    expect(findLastIndexLessOrEqual([5, 10, 15], 4)).toBe(-1)
    expect(findLastIndexLessOrEqual([5, 10, 15], -Infinity)).toBe(-1)
  })

  it('returns the exact index on a match', () => {
    const offsets = [0, 100, 200, 300]
    expect(findLastIndexLessOrEqual(offsets, 0)).toBe(0)
    expect(findLastIndexLessOrEqual(offsets, 100)).toBe(1)
    expect(findLastIndexLessOrEqual(offsets, 200)).toBe(2)
    expect(findLastIndexLessOrEqual(offsets, 300)).toBe(3)
  })

  it('returns the previous index for values between elements', () => {
    const offsets = [0, 100, 200, 300]
    expect(findLastIndexLessOrEqual(offsets, 0.5)).toBe(0)
    expect(findLastIndexLessOrEqual(offsets, 99.99)).toBe(0)
    expect(findLastIndexLessOrEqual(offsets, 150)).toBe(1)
    expect(findLastIndexLessOrEqual(offsets, 299)).toBe(2)
  })

  it('returns the last index when value is beyond the last element', () => {
    expect(findLastIndexLessOrEqual([0, 100, 200], 1000)).toBe(2)
    expect(findLastIndexLessOrEqual([0, 100, 200], Infinity)).toBe(2)
  })

  it('returns the last of duplicate values', () => {
    const offsets = [0, 100, 100, 100, 200]
    expect(findLastIndexLessOrEqual(offsets, 100)).toBe(3)
    expect(findLastIndexLessOrEqual(offsets, 150)).toBe(3)
    expect(findLastIndexLessOrEqual(offsets, 99)).toBe(0)
  })

  it('matches findLastIndex on random sorted arrays', () => {
    for (let n = 0; n < 50; n++) {
      const arr: number[] = []
      let acc = 0
      for (let i = 0; i < n; i++) {
        acc += Math.floor(Math.random() * 3) * 10 // includes zero steps (duplicates)
        arr.push(acc)
      }
      for (let value = -10; value <= acc + 10; value += 5) {
        expect(findLastIndexLessOrEqual(arr, value)).toBe(linear(arr, value))
      }
    }
  })

  it('works on large arrays', () => {
    const offsets = Array.from({ length: 1_000_000 }, (_, i) => i * 20)
    expect(findLastIndexLessOrEqual(offsets, 0)).toBe(0)
    expect(findLastIndexLessOrEqual(offsets, 19)).toBe(0)
    expect(findLastIndexLessOrEqual(offsets, 12_345_678)).toBe(617_283)
    expect(findLastIndexLessOrEqual(offsets, 20_000_000)).toBe(999_999)
  })
})
