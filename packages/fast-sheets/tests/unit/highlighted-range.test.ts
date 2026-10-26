import { describe, expect, it } from 'vitest'
import { HighlightedRange } from 'lib/core/elements/HighlightedRange.ts'
import { createState } from './utils/state'

const createHighlightedRange = () => {
  const container = document.createElement('div')
  return new HighlightedRange({ name: 'range', color: 'blue', container })
}

const createBorderlessState = () => {
  const state = createState({
    rowsCount: 3,
    columns: [{ width: 100 }, { width: 50 }],
    hasHeaderRow: false,
    isRowNumberVisible: false,
    borderWidth: 0,
  })
  state.rowHeights = [20, 30, 40]
  state.columnWidths = [100, 50]
  state.verticalOffsets = [0, 20, 50]
  state.horizontalOffsets = [0, 100]
  return state
}

describe('HighlightedRange', () => {
  it('renders a range that starts at offset 0 from 0', () => {
    const highlightedRange = createHighlightedRange()
    const range = { rowStart: 0, rowEnd: 1, columnStart: 0, columnEnd: 1 }
    highlightedRange.highlight({ range, state: createBorderlessState() })

    const { style } = highlightedRange.borders.container
    expect(style.display).toBe('block')
    expect(style.top).toBe('0px')
    expect(style.left).toBe('0px')
    // the right border sits at the range width, the bottom border at its height
    expect(highlightedRange.borders.borderRight.style.left).toBe(`${150 - 1}px`)
    expect(highlightedRange.borders.borderBottom.style.top).toBe(`${50 - 1}px`)
  })

  it('hides itself for an empty range', () => {
    const highlightedRange = createHighlightedRange()
    const range = { rowStart: -1, rowEnd: -1, columnStart: -1, columnEnd: -1 }
    highlightedRange.highlight({ range, state: createBorderlessState() })

    expect(highlightedRange.borders.container.style.display).toBe('none')
    expect(highlightedRange.isEmpty()).toBe(true)
  })

  it('hides itself for a range outside the grid', () => {
    const highlightedRange = createHighlightedRange()
    const range = { rowStart: 1, rowEnd: 5, columnStart: 0, columnEnd: 0 }
    highlightedRange.highlight({ range, state: createBorderlessState() })

    expect(highlightedRange.borders.container.style.display).toBe('none')
  })
})
