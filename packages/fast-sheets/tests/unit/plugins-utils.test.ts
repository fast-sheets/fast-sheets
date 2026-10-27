import { describe, expect, it } from 'vitest'
import {
  createGridEvent,
  createPluginHooks,
  dispatchToPlugins,
  hasLayoutHooks,
  type FastSheetsPlugin,
} from 'lib/core/utils/plugins.ts'

const createPlugin = (name: string, hooks: Partial<FastSheetsPlugin> = {}): FastSheetsPlugin => ({
  name,
  setup() {},
  destroy() {},
  ...hooks,
})

describe('createPluginHooks', () => {
  it('groups the plugins by the hooks they have, in registration order', () => {
    const style = createPlugin('style', { cellStyle() {}, afterFrameRender() {} })
    const content = createPlugin('content', { renderCellContent() {}, renderCellBackground() {} })
    const plain = createPlugin('plain')
    const both = createPlugin('both', { afterFrameRender() {}, renderCellBackground() {} })

    const hooks = createPluginHooks([style, content, plain, both])

    expect(hooks.cellStyle).toEqual([style])
    expect(hooks.afterFrameRender).toEqual([style, both])
    expect(hooks.renderCellBackground).toEqual([content, both])
    expect(hooks.renderCellContent).toEqual([content])
    expect(hooks.renderCellBorders).toEqual([])
  })

  it('puts the last registered plugin first for input hooks', () => {
    const first = createPlugin('first', { onMouseDown() {}, onKeyDown() {}, afterLayout() {} })
    const second = createPlugin('second', { onMouseDown() {}, onKeyDown() {}, afterLayout() {} })

    const hooks = createPluginHooks([first, second])

    expect(hooks.onMouseDown).toEqual([second, first])
    expect(hooks.onKeyDown).toEqual([second, first])
    expect(hooks.afterLayout).toEqual([first, second])
  })

  it('has empty groups without plugins', () => {
    const hooks = createPluginHooks([])
    expect(hooks.afterFrameRender).toEqual([])
    expect(hooks.cellStyle).toEqual([])
    expect(hooks.onMouseDown).toEqual([])
  })
})

describe('hasLayoutHooks', () => {
  it('is true for a plugin that changes sizes', () => {
    expect(hasLayoutHooks(createPlugin('rows', { getRowHeight: (_, height) => height }))).toBe(true)
    expect(hasLayoutHooks(createPlugin('columns', { getColumnWidth: (_, width) => width }))).toBe(
      true,
    )
  })

  it('is false for a plugin that only renders', () => {
    expect(hasLayoutHooks(createPlugin('style', { cellStyle() {}, afterLayout() {} }))).toBe(false)
  })
})

describe('createGridEvent', () => {
  it('keeps the native event and is not stopped until stop() is called', () => {
    const native = new KeyboardEvent('keydown')
    const event = createGridEvent(native)

    expect(event.native).toBe(native)
    expect(event.isStopped).toBe(false)
    event.stop()
    expect(event.isStopped).toBe(true)
  })
})

describe('dispatchToPlugins', () => {
  it('calls the plugins in order until one stops the event', () => {
    const event = createGridEvent(new KeyboardEvent('keydown'))
    const called: string[] = []

    dispatchToPlugins(['top', 'middle', 'bottom'], event, (plugin) => {
      called.push(plugin)
      if (plugin === 'middle') {
        event.stop()
      }
    })

    expect(called).toEqual(['top', 'middle'])
  })
})
