import { describe, expect, it } from 'vitest'
import { Renderer } from 'lib/core/Renderer.ts'
import { createState } from './utils/state'

describe('renderer', () => {
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
    const renderer = new Renderer(state)

    const rowHeights = renderer.getRowHeights()
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
    const renderer = new Renderer(state)

    const columnWidths = renderer.getColumnWidths()
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
    const renderer = new Renderer(state)
    state.rowHeights = renderer.getRowHeights()

    const verticalOffsets = renderer.getVerticalOffsets()
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
    const renderer = new Renderer(state)

    state.columnWidths = renderer.getColumnWidths()

    const horizontalOffsets = renderer.getHorizontalOffsets()
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
    const renderer = new Renderer(state)
    state.columnWidths = renderer.getColumnWidths()
    state.numberingColumnWidth = renderer.getNumberingColumnWidth()

    const widthsSum = state.columnWidths.reduce((a, b) => a + b, 0)
    // 2 columns + numbering column -> 1 border between them + 1 closing border
    expect(renderer.getTotalWidth()).toBe(
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
    const renderer = new Renderer(state)
    state.rowHeights = renderer.getRowHeights()
    state.headerRowHeight = renderer.getHeaderRowHeight()

    const heightsSum = state.rowHeights.reduce((a, b) => a + b, 0)
    // 3 rows + header row -> 3 borders between them + 1 closing border
    expect(renderer.getTotalHeight()).toBe(
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
    const renderer = new Renderer(state)
    state.columnWidths = renderer.getColumnWidths()
    state.horizontalOffsets = renderer.getHorizontalOffsets()

    expect(state.horizontalOffsets).toHaveLength(2)
  })
})
