import { HighlightedArea } from 'lib/core/elements/HighlightedArea.ts'
import { type StateInstance } from 'lib/core/State.ts'
import { BORDER_STYLE } from 'lib/core/constants.ts'
import type { Cell, CellsRange, DomRect } from 'lib/core/types.ts'

const EMPTY_RANGE: CellsRange = {
  rowStart: -1,
  rowEnd: -1,
  columnStart: -1,
  columnEnd: -1,
}

interface CellHighlightOptions {
  name: string
  color: string
  borderWidth?: number
  borderStyle?: BORDER_STYLE
  container: HTMLDivElement
}

export class HighlightedRange {
  readonly name: string

  readonly container: HTMLDivElement

  readonly borders: HighlightedArea

  range: CellsRange = { ...EMPTY_RANGE }

  constructor(options: CellHighlightOptions) {
    this.name = options.name
    this.container = options.container
    this.borders = new HighlightedArea({
      name: this.name,
      borderWidth: options.borderWidth || 1,
      borderStyle: options.borderStyle || BORDER_STYLE.SOLID,
      color: options.color,
    })
    this.container.appendChild(this.borders.container)
  }

  highlight = ({ range, state }: { range: CellsRange; state: StateInstance }) => {
    this.range.rowStart = range.rowStart
    this.range.rowEnd = range.rowEnd
    this.range.columnStart = range.columnStart
    this.range.columnEnd = range.columnEnd

    const offsetTop = state.verticalOffsets[this.range.rowStart]
    const offsetBottom = state.verticalOffsets[this.range.rowEnd]
    const offsetLeft = state.horizontalOffsets[this.range.columnStart]
    const offsetRight = state.horizontalOffsets[this.range.columnEnd]

    const widthBottom = state.columnWidths[this.range.columnEnd]
    const heightRight = state.rowHeights[this.range.rowEnd]

    if (
      offsetTop === undefined ||
      offsetBottom === undefined ||
      offsetLeft === undefined ||
      offsetRight === undefined ||
      widthBottom === undefined ||
      heightRight === undefined
    ) {
      // an empty range, or one outside the grid, has nothing to draw
      this.borders.hide()
      return
    }

    const domRect: DomRect = {
      top: offsetTop,
      left: offsetLeft,
      width: offsetRight + widthBottom - offsetLeft,
      height: offsetBottom + heightRight - offsetTop,
    }
    this.borders.show(domRect)
  }

  isCellHighlighted(cell: Cell) {
    return (
      cell.rowIndex >= this.range.rowStart &&
      cell.rowIndex <= this.range.rowEnd &&
      cell.columnIndex >= this.range.columnStart &&
      cell.columnIndex <= this.range.columnEnd
    )
  }

  isEmpty() {
    return JSON.stringify(this.range) === JSON.stringify(EMPTY_RANGE)
  }

  reset() {
    this.range = { ...EMPTY_RANGE }
    this.borders.hide()
  }

  destroy() {
    this.borders.destroy()
  }
}
