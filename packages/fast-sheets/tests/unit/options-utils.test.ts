import { describe, expect, it } from 'vitest'
import { mergeOptions } from 'lib/core/utils/options.ts'

describe('mergeOptions', () => {
  it('overrides defaults with the given options', () => {
    expect(mergeOptions({ a: 1, b: 2 }, { b: 3 })).toEqual({ a: 1, b: 3 })
  })

  it('keeps the default when an option is undefined', () => {
    expect(mergeOptions({ borderWidth: 1 }, { borderWidth: undefined })).toEqual({ borderWidth: 1 })
  })

  it('keeps falsy values that are given', () => {
    expect(mergeOptions({ a: 1, b: true, c: 'x' }, { a: 0, b: false, c: '' })).toEqual({
      a: 0,
      b: false,
      c: '',
    })
  })

  it('keeps options that have no default', () => {
    expect(mergeOptions({ a: 1 }, { z: 'z' })).toEqual({ a: 1, z: 'z' })
  })

  it('does not change its arguments', () => {
    const defaults = { a: 1 }
    mergeOptions(defaults, { a: 2 })
    expect(defaults).toEqual({ a: 1 })
  })
})
