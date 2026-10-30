import { describe, expect, it } from 'vitest'
import { formatNounWithNumber, getLinesCount } from 'lib/core/utils/string.ts'

describe('getLinesCount', () => {
  it('counts one line for text without a line break', () => {
    expect(getLinesCount('abc')).toBe(1)
  })

  it('counts one line for an empty string', () => {
    expect(getLinesCount('')).toBe(1)
  })

  it('counts a line for each line break, plus one', () => {
    expect(getLinesCount('a\nb')).toBe(2)
    expect(getLinesCount('a\nb\nc')).toBe(3)
  })

  it('counts the empty lines around and between line breaks', () => {
    expect(getLinesCount('\n')).toBe(2)
    expect(getLinesCount('a\n')).toBe(2)
    expect(getLinesCount('a\n\nb')).toBe(3)
  })

  it('counts only "\\n" as a line break', () => {
    // "\r" alone is not a line break, and "\r\n" is one
    expect(getLinesCount('a\rb')).toBe(1)
    expect(getLinesCount('a\r\nb')).toBe(2)
  })
})

describe('formatNounWithNumber', () => {
  it('returns the count with the singular for one', () => {
    expect(formatNounWithNumber(1, 'row', 'rows')).toBe('1 row')
  })

  it('returns the count with the plural for other counts', () => {
    expect(formatNounWithNumber(3, 'row', 'rows')).toBe('3 rows')
    expect(formatNounWithNumber(0, 'row', 'rows')).toBe('0 rows')
    expect(formatNounWithNumber(1.5, 'row', 'rows')).toBe('1.5 rows')
  })

  it('groups the digits of large counts', () => {
    expect(formatNounWithNumber(1000, 'row', 'rows')).toBe('1,000 rows')
    expect(formatNounWithNumber(1234567, 'column', 'columns')).toBe('1,234,567 columns')
  })

  it('takes the noun form that fits the rounded number shown', () => {
    expect(formatNounWithNumber(1.0001, 'row', 'rows')).toBe('1 row')
  })
})
