import { describe, expect, it } from 'vitest'
import { Layout } from 'lib/core/Layout.ts'
import { createState } from './utils/state'
import { createMeasuringLayout } from './utils/layout'

describe('layout', () => {
  it('computes row heights correctly', () => {
    const state = createState({
      rowsCount: 4,
      columns: [
        { name: 'A', width: 100 },
        { name: 'B', width: 100 },
      ],
      hasHeaderRow: true,
      isRowNumberVisible: true,
    })
    const layout = createMeasuringLayout(state)

    const rowHeights = layout.getRowHeights()
    expect(rowHeights).toHaveLength(4)

    const rowHeightsSum = rowHeights.reduce((a, b) => a + b, 0)
    expect(rowHeightsSum).toBe(95)
  })

  it('computes column widths correctly', () => {
    const state = createState({
      rowsCount: 4,
      columns: [
        { name: 'A', width: 100 },
        { name: 'B', width: 100 },
      ],
      hasHeaderRow: true,
      isRowNumberVisible: true,
    })
    const layout = new Layout(state)

    const columnWidths = layout.getColumnWidths()
    expect(columnWidths).toHaveLength(2)

    const columnWidthsSum = columnWidths.reduce((a, b) => a + b, 0)
    expect(columnWidthsSum).toBe(200)
  })

  it('computes vertical offsets correctly', () => {
    const state = createState({
      rowsCount: 4,
      columns: [
        { name: 'A', width: 100 },
        { name: 'B', width: 100 },
      ],
      hasHeaderRow: true,
      isRowNumberVisible: true,
    })
    const layout = createMeasuringLayout(state)
    state.rowHeights = layout.getRowHeights()

    const verticalOffsets = layout.getVerticalOffsets()
    expect(verticalOffsets).toHaveLength(4)

    const verticalOffsetsSum = verticalOffsets.reduce((a, b) => a + b, 0)
    expect(verticalOffsetsSum).toBe(299)
  })

  it('computes horizontal offsets correctly', () => {
    const state = createState({
      rowsCount: 1,
      columns: [
        { name: 'A', width: 100 },
        { name: 'B', width: 100 },
      ],
      hasHeaderRow: true,
      isRowNumberVisible: true,
    })
    const layout = new Layout(state)

    // the offsets start after the numbering column that the state already holds
    state.numberingColumnWidth = layout.getNumberingColumnWidth()
    state.columnWidths = layout.getColumnWidths()

    const horizontalOffsets = layout.getHorizontalOffsets()
    expect(horizontalOffsets).toHaveLength(2)

    const horizontalOffsetsSum = horizontalOffsets.reduce((a, b) => a + b, 0)
    expect(horizontalOffsetsSum).toBe(205)
  })

  it('computes total width correctly', () => {
    const state = createState({
      rowsCount: 3,
      columns: [
        { name: 'A', width: 100 },
        { name: 'B', width: 100 },
      ],
      hasHeaderRow: true,
      isRowNumberVisible: true,
    })
    const layout = new Layout(state)
    state.columnWidths = layout.getColumnWidths()
    state.numberingColumnWidth = layout.getNumberingColumnWidth()

    const widthsSum = state.columnWidths.reduce((a, b) => a + b, 0)
    // 2 columns + numbering column -> 1 border between them + 1 closing border
    expect(layout.getTotalWidth()).toBe(
      widthsSum +
        state.numberingColumnWidth +
        state.options.borderWidth +
        state.options.borderWidth,
    )
  })

  it('computes total height correctly', () => {
    const state = createState({
      rowsCount: 3,
      columns: [
        { name: 'A', width: 100 },
        { name: 'B', width: 100 },
      ],
      hasHeaderRow: true,
      isRowNumberVisible: true,
    })
    const layout = createMeasuringLayout(state)
    state.rowHeights = layout.getRowHeights()
    state.headerRowHeight = layout.getHeaderRowHeight()

    const heightsSum = state.rowHeights.reduce((a, b) => a + b, 0)
    // 3 rows + header row -> 3 borders between them + 1 closing border
    expect(layout.getTotalHeight()).toBe(
      heightsSum +
        state.headerRowHeight +
        state.options.borderWidth * 3 +
        state.options.borderWidth,
    )
  })

  it('gives the last data columns a horizontal offset', () => {
    const state = createState({
      rowsCount: 2,
      columns: [
        { name: 'A', width: 100 },
        { name: 'B', width: 100 },
      ],
      hasHeaderRow: true,
      isRowNumberVisible: true,
    })
    const layout = new Layout(state)
    state.columnWidths = layout.getColumnWidths()
    state.horizontalOffsets = layout.getHorizontalOffsets()

    expect(state.horizontalOffsets).toHaveLength(2)
  })

  describe('with borderWidth 0', () => {
    const createBorderlessState = () =>
      createState({
        rowsCount: 3,
        columns: [{ width: 100 }, { width: 50 }, { width: 70 }],
        hasHeaderRow: false,
        isRowNumberVisible: false,
        borderWidth: 0,
      })

    it('starts the first row at 0 and each next row right after the previous one', () => {
      const state = createBorderlessState()
      state.rowHeights = [20, 30, 40]
      const layout = new Layout(state)

      expect(layout.getVerticalOffsets()).toEqual([0, 20, 50])
    })

    it('starts the first column at 0 and each next column right after the previous one', () => {
      const state = createBorderlessState()
      state.columnWidths = [100, 50, 70]
      const layout = new Layout(state)

      expect(layout.getHorizontalOffsets()).toEqual([0, 100, 150])
    })
  })

  it('adds a border before each row and column', () => {
    const state = createState({
      rowsCount: 3,
      columns: [{ width: 100 }, { width: 50 }, { width: 70 }],
      hasHeaderRow: false,
      isRowNumberVisible: false,
      borderWidth: 2,
    })
    state.rowHeights = [20, 30, 40]
    state.columnWidths = [100, 50, 70]
    const layout = new Layout(state)

    expect(layout.getVerticalOffsets()).toEqual([2, 24, 56])
    expect(layout.getHorizontalOffsets()).toEqual([2, 104, 156])
  })

  it('has no offsets when there are no rows', () => {
    const state = createState({
      rowsCount: 0,
      columns: [{ width: 100 }],
      hasHeaderRow: false,
      isRowNumberVisible: false,
    })
    state.rowHeights = []
    const layout = new Layout(state)

    expect(layout.getVerticalOffsets()).toEqual([])
  })

  describe('updateRows', () => {
    const createLaidOutState = () => {
      const state = createState({
        rowsCount: 4,
        columns: [{ width: 100 }, { width: 100 }],
        hasHeaderRow: false,
        isRowNumberVisible: false,
      })
      const layout = createMeasuringLayout(state)
      state.rowHeights = layout.getRowHeights()
      state.verticalOffsets = layout.getVerticalOffsets()
      state.totalHeight = layout.getTotalHeight()
      return { state, layout }
    }

    /** the sizes a full measure gives for the current data */
    const measureAll = (layout: Layout) => ({
      rowHeights: layout.getRowHeights(),
      verticalOffsets: layout.getVerticalOffsets(),
    })

    it('measures an edited row again and moves the rows below it', () => {
      const { state, layout } = createLaidOutState()
      const oneLineHeight = state.rowHeights[1]
      state.options.data[1]![0] = 'two\nlines'
      layout.updateRows([1])

      expect(state.rowHeights[1]).toBeGreaterThan(oneLineHeight!)
      const { rowHeights, verticalOffsets } = measureAll(layout)
      expect(state.rowHeights).toEqual(rowHeights)
      expect(state.verticalOffsets).toEqual(verticalOffsets)
      state.rowHeights = rowHeights
      expect(state.totalHeight).toBe(layout.getTotalHeight())
      expect(state.options.elScrollPaneY.style.height).toBe(`${state.totalHeight}px`)
    })

    it('keeps the sizes when the edited rows keep their height', () => {
      const { state, layout } = createLaidOutState()
      const verticalOffsets = [...state.verticalOffsets]
      state.options.data[2]![1] = 'another one-line text'
      layout.updateRows([2])

      expect(state.verticalOffsets).toEqual(verticalOffsets)
    })

    it('measures everything again when rows were added', () => {
      const { state, layout } = createLaidOutState()
      state.options.data.push(['new', 'row'])
      // init() needs a canvas context, which jsdom does not have, so check that it is called
      let isInitCalled = false
      layout.init = () => {
        isInitCalled = true
      }
      layout.updateRows([4])

      expect(isInitCalled).toBe(true)
    })
  })

  describe('viewport', () => {
    const createViewportState = () =>
      createState({
        rowsCount: 4,
        columns: [{ width: 100 }, { width: 100 }, { width: 100 }],
        hasHeaderRow: false,
        isRowNumberVisible: false,
      })

    it('reads the scroll position and the size of the visible area', () => {
      const state = createViewportState()
      const { elScroll, elScrollInner } = state.options
      // jsdom doesn't scroll or lay out elements
      Object.defineProperty(elScroll, 'scrollLeft', { value: 20 })
      Object.defineProperty(elScroll, 'scrollTop', { value: 30 })
      elScrollInner.getBoundingClientRect = () => ({ width: 200, height: 100 }) as DOMRect

      new Layout(state).updateViewport()

      expect(state.viewport).toEqual({ left: 20, top: 30, right: 220, bottom: 130 })
    })

    it('finds the first and last rows and columns inside the viewport', () => {
      const state = createViewportState()
      state.verticalOffsets = [0, 20, 40, 60]
      state.horizontalOffsets = [0, 100, 200]
      state.viewport = { left: 150, top: 25, right: 250, bottom: 45 }

      expect(new Layout(state).getVisibleRange()).toEqual({
        rowStart: 1,
        rowEnd: 2,
        columnStart: 1,
        columnEnd: 2,
      })
    })

    it('starts at -1 when the viewport begins above the first row and left of the first column', () => {
      const state = createViewportState()
      state.verticalOffsets = [30, 50]
      state.horizontalOffsets = [60, 160]
      state.viewport = { left: 0, top: 0, right: 200, bottom: 70 }

      expect(new Layout(state).getVisibleRange()).toEqual({
        rowStart: -1,
        rowEnd: 1,
        columnStart: -1,
        columnEnd: 1,
      })
    })
  })
})
