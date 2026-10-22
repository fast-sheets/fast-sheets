import { describe, expect, it } from 'vitest'
import { createPluginHooks, type FastSheetsPlugin } from 'lib/core/utils/plugins.ts'

const createPlugin = (name: string, hooks: Partial<FastSheetsPlugin> = {}): FastSheetsPlugin => ({
  name,
  setup() {},
  destroy() {},
  ...hooks,
})

describe('createPluginHooks', () => {
  it('groups the plugins by the hooks they have, in registration order', () => {
    const background = createPlugin('background', {
      getCellBackgroundColor: (_, color) => color,
      render() {},
    })
    const text = createPlugin('text', { renderCellText() {}, renderCellBackground() {} })
    const headings = createPlugin('headings', {
      getColumnHeadingBackgroundColor: (_, color) => color,
      getRowHeadingBackgroundColor: (_, color) => color,
    })
    const plain = createPlugin('plain')
    const both = createPlugin('both', { render() {}, renderCellBackground() {} })

    const hooks = createPluginHooks([background, text, plain, both, headings])

    expect(hooks.render).toEqual([background, both])
    expect(hooks.getCellBackgroundColor).toEqual([background])
    expect(hooks.renderCellBackground).toEqual([text, both])
    expect(hooks.renderCellText).toEqual([text])
    expect(hooks.getColumnHeadingBackgroundColor).toEqual([headings])
    expect(hooks.getRowHeadingBackgroundColor).toEqual([headings])
  })

  it('has empty groups without plugins', () => {
    const hooks = createPluginHooks([])
    expect(hooks.render).toEqual([])
    expect(hooks.renderCellBackground).toEqual([])
  })
})
