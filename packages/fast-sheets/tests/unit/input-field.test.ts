import { describe, expect, it } from 'vitest'
import { InputField } from 'lib/core/elements/InputField.ts'

describe('InputField', () => {
  it('contains the field and what is inside it, but not other targets', () => {
    const inputField = new InputField({ name: 'elInput', font: '14px Verdana' })
    inputField.value = 'text'
    const elOutside = document.createElement('div')

    expect(inputField.contains(inputField.el)).toBe(true)
    expect(inputField.contains(inputField.el.firstChild)).toBe(true)
    expect(inputField.contains(elOutside)).toBe(false)
    expect(inputField.contains(null)).toBe(false)
    expect(inputField.contains(window)).toBe(false)
  })
})
