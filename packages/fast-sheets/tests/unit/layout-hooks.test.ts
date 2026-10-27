import { describe, expect, it } from 'vitest'
import { createPluginHooks, type FastSheetsPlugin } from 'lib/core/utils/plugins.ts'
import { createState } from './utils/state'
import { createMeasuringLayout } from './utils/layout'

const createPlugin = (name: string, hooks: Partial<FastSheetsPlugin> = {}): FastSheetsPlugin => ({
  name,
  setup() {},
  destroy() {},
  ...hooks,
})

const createLayout = (plugins: FastSheetsPlugin[] = []) => {
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
  const layout = createMeasuringLayout(state)
  layout.setPluginHooks(createPluginHooks(plugins))
  return { state, layout }
}

/** Calculates the sizes the way `init` does, which needs a canvas context that jsdom does not have. */
const layOut = ({ state, layout }: ReturnType<typeof createLayout>) => {
  state.headerRowHeight = layout.getHeaderRowHeight()
  state.numberingColumnWidth = layout.getNumberingColumnWidth()
  state.rowHeights = layout.getRowHeights()
  state.columnWidths = layout.getColumnWidths()
  state.verticalOffsets = layout.getVerticalOffsets()
  state.horizontalOffsets = layout.getHorizontalOffsets()
  state.totalHeight = layout.getTotalHeight()
  state.viewport = { left: 0, top: 0, right: 1000, bottom: 1000 }
}

describe('layout hooks', () => {
  it('change the sizes, each plugin getting the result of the previous one', () => {
    const { layout } = createLayout([
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
    const { layout: plainLayout } = createLayout()

    const rowHeights = layout.getRowHeights()
    const plainRowHeights = plainLayout.getRowHeights()
    expect(rowHeights[0]).toBe(plainRowHeights[0]! + 1)
    expect(rowHeights[1]).toBe(plainRowHeights[1]! * 2 + 1)
    expect(layout.getColumnWidths()).toEqual([200, 100])
    expect(layout.getHeaderRowHeight()).toBe(plainLayout.getHeaderRowHeight() + 10)
    expect(layout.getNumberingColumnWidth()).toBe(80)
  })

  it('are used again when an edited row is measured', () => {
    let extraHeight = 0
    const context = createLayout([
      createPlugin('extra', { getRowHeight: (_, height) => height + extraHeight }),
    ])
    layOut(context)
    const { state, layout } = context
    const height = state.rowHeights[2]!

    extraHeight = 20
    layout.updateRows([2])

    expect(state.rowHeights[2]).toBe(height + 20)
    expect(state.verticalOffsets[3]).toBe(state.verticalOffsets[2]! + height + 20 + 1)
  })
})

describe('afterLayout', () => {
  it('runs when an edited row changes its height', () => {
    let calls = 0
    const context = createLayout([createPlugin('layout', { afterLayout: () => calls++ })])
    layOut(context)
    const { state, layout } = context

    state.options.data[1]![0] = 'two\nlines'
    layout.updateRows([1])

    expect(calls).toBe(1)
  })

  it('does not run when the edited rows keep their height', () => {
    let calls = 0
    const context = createLayout([createPlugin('layout', { afterLayout: () => calls++ })])
    layOut(context)

    context.state.options.data[1]![0] = 'one line'
    context.layout.updateRows([1])

    expect(calls).toBe(0)
  })
})

describe('findCellAtPoint', () => {
  // jsdom puts every element at 0,0, so a point relative to the window is also relative to the grid
  it('finds the corner, the headings, the numbering cells and the data cells', () => {
    const context = createLayout()
    layOut(context)
    const { state, layout } = context
    const cellLeft = state.horizontalOffsets[1]!
    const cellTop = state.verticalOffsets[2]!

    expect(layout.findCellAtPoint(10, 10)).toStrictEqual({ rowIndex: -1, columnIndex: -1 })
    expect(layout.findCellAtPoint(cellLeft + 5, 10)).toStrictEqual({
      rowIndex: -1,
      columnIndex: 1,
    })
    expect(layout.findCellAtPoint(10, cellTop + 3)).toStrictEqual({
      rowIndex: 2,
      columnIndex: -1,
    })
    expect(layout.findCellAtPoint(cellLeft + 4, cellTop + 6)).toStrictEqual({
      rowIndex: 2,
      columnIndex: 1,
    })
  })

  it('finds nothing past the visible part of the grid', () => {
    const context = createLayout()
    layOut(context)
    context.state.viewport = { left: 0, top: 0, right: 100, bottom: 100 }

    expect(context.layout.findCellAtPoint(150, 50)).toBeUndefined()
    expect(context.layout.findCellAtPoint(50, 150)).toBeUndefined()
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
    const layout = createMeasuringLayout(state)
    layOut({ state, layout })

    expect(layout.findCellAtPoint(0, 0)).toBeUndefined()
    expect(layout.findCellAtPoint(1, 1)).toStrictEqual({ rowIndex: 0, columnIndex: 0 })
  })
})
