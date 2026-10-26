import { describe, expect, it } from 'vitest'
import { createPluginHooks, type FastSheetsPlugin } from 'lib/core/utils/plugins.ts'
import { createState } from './utils/state'
import { createMeasuringRenderer } from './utils/renderer'

const createPlugin = (name: string, hooks: Partial<FastSheetsPlugin> = {}): FastSheetsPlugin => ({
  name,
  setup() {},
  destroy() {},
  ...hooks,
})

const createRenderer = (plugins: FastSheetsPlugin[] = []) => {
  const state = createState({
    rowsCount: 4,
    columns: [
      { name: 'A', width: 100 },
      { name: 'B', width: 100 },
    ],
    hasHeaderRow: true,
    isRowNumberVisible: true,
  })
  // fonts are measured before the plugins are set, so that afterLayout counts only what the tests do
  const renderer = createMeasuringRenderer(state)
  renderer.setPluginHooks(createPluginHooks(plugins))
  return { state, renderer }
}

/** Calculates the sizes the way `init` does, which needs a canvas context that jsdom does not have. */
const layOut = ({ state, renderer }: ReturnType<typeof createRenderer>) => {
  state.headerRowHeight = renderer.getHeaderRowHeight()
  state.numberingColumnWidth = renderer.getNumberingColumnWidth()
  state.rowHeights = renderer.getRowHeights()
  state.columnWidths = renderer.getColumnWidths()
  state.verticalOffsets = renderer.getVerticalOffsets()
  state.horizontalOffsets = renderer.getHorizontalOffsets()
  state.totalHeight = renderer.getTotalHeight()
  state.viewport = { left: 0, top: 0, right: 1000, bottom: 1000 }
}

describe('layout hooks', () => {
  it('change the sizes, each plugin getting the result of the previous one', () => {
    const { renderer } = createRenderer([
      createPlugin('double', {
        getRowHeight: (rowIndex, height) => (rowIndex === 1 ? height * 2 : height),
        getColumnWidth: (columnIndex, width) => (columnIndex === 0 ? width * 2 : width),
      }),
      createPlugin('add', {
        getRowHeight: (_, height) => height + 1,
        getHeaderRowHeight: (height) => height + 10,
        getNumberingColumnWidth: () => 80,
      }),
    ])
    const { renderer: plainRenderer } = createRenderer()

    const rowHeights = renderer.getRowHeights()
    const plainRowHeights = plainRenderer.getRowHeights()
    expect(rowHeights[0]).toBe(plainRowHeights[0]! + 1)
    expect(rowHeights[1]).toBe(plainRowHeights[1]! * 2 + 1)
    expect(renderer.getColumnWidths()).toEqual([200, 100])
    expect(renderer.getHeaderRowHeight()).toBe(plainRenderer.getHeaderRowHeight() + 10)
    expect(renderer.getNumberingColumnWidth()).toBe(80)
  })

  it('are used again when an edited row is measured', () => {
    let extraHeight = 0
    const context = createRenderer([
      createPlugin('extra', { getRowHeight: (_, height) => height + extraHeight }),
    ])
    layOut(context)
    const { state, renderer } = context
    const height = state.rowHeights[2]!

    extraHeight = 20
    renderer.updateRows([2])

    expect(state.rowHeights[2]).toBe(height + 20)
    expect(state.verticalOffsets[3]).toBe(state.verticalOffsets[2]! + height + 20 + 1)
  })
})

describe('afterLayout', () => {
  it('runs when an edited row changes its height', () => {
    let calls = 0
    const context = createRenderer([createPlugin('layout', { afterLayout: () => calls++ })])
    layOut(context)
    const { state, renderer } = context

    state.options.data[1]![0] = 'two\nlines'
    renderer.updateRows([1])

    expect(calls).toBe(1)
  })

  it('does not run when the edited rows keep their height', () => {
    let calls = 0
    const context = createRenderer([createPlugin('layout', { afterLayout: () => calls++ })])
    layOut(context)

    context.state.options.data[1]![0] = 'one line'
    context.renderer.updateRows([1])

    expect(calls).toBe(0)
  })
})

describe('findCellAtPoint', () => {
  // jsdom puts every element at 0,0, so a point relative to the window is also relative to the grid
  it('finds the corner, the headings, the numbering cells and the data cells', () => {
    const context = createRenderer()
    layOut(context)
    const { state, renderer } = context
    const cellLeft = state.horizontalOffsets[1]!
    const cellTop = state.verticalOffsets[2]!

    expect(renderer.findCellAtPoint(10, 10)).toStrictEqual({ rowIndex: -1, columnIndex: -1 })
    expect(renderer.findCellAtPoint(cellLeft + 5, 10)).toStrictEqual({
      rowIndex: -1,
      columnIndex: 1,
    })
    expect(renderer.findCellAtPoint(10, cellTop + 3)).toStrictEqual({
      rowIndex: 2,
      columnIndex: -1,
    })
    expect(renderer.findCellAtPoint(cellLeft + 4, cellTop + 6)).toStrictEqual({
      rowIndex: 2,
      columnIndex: 1,
    })
  })

  it('finds nothing past the visible part of the grid', () => {
    const context = createRenderer()
    layOut(context)
    context.state.viewport = { left: 0, top: 0, right: 100, bottom: 100 }

    expect(context.renderer.findCellAtPoint(150, 50)).toBeUndefined()
    expect(context.renderer.findCellAtPoint(50, 150)).toBeUndefined()
  })

  it('finds nothing on the outer border when there are no headings', () => {
    const state = createState({
      rowsCount: 2,
      columns: [{ width: 100 }],
      hasHeaderRow: false,
      isRowNumberVisible: false,
    })
    // createState keeps the columns only for a header row
    state.options.columns = [{ width: 100 }]
    const renderer = createMeasuringRenderer(state)
    layOut({ state, renderer })

    expect(renderer.findCellAtPoint(0, 0)).toBeUndefined()
    expect(renderer.findCellAtPoint(1, 1)).toStrictEqual({ rowIndex: 0, columnIndex: 0 })
  })
})
