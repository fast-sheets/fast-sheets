import type { Cell, CellsRange, DomRect } from 'lib/core/types.ts'
import { HighlightedArea } from './HighlightedArea.ts'
import { type StateInstance } from 'lib/core/State.ts'
import { BORDER_STYLE } from 'lib/core/constants.ts'

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
  readonly state: StateInstance

  readonly name: string

  readonly container: HTMLDivElement

  readonly borders: HighlightedArea

  range: CellsRange = { ...EMPTY_RANGE }

  constructor({ state, options }: { state: StateInstance; options: CellHighlightOptions }) {
    this.state = state
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

  highlight = (range: CellsRange) => {
    this.range.rowStart = range.rowStart
    this.range.rowEnd = range.rowEnd
    this.range.columnStart = range.columnStart
    this.range.columnEnd = range.columnEnd

    const offsetTop = this.state.verticalOffsets[this.range.rowStart] || -1
    const offsetBottom = this.state.verticalOffsets[this.range.rowEnd] || -1
    const offsetLeft = this.state.horizontalOffsets[this.range.columnStart] || -1
    const offsetRight = this.state.horizontalOffsets[this.range.columnEnd] || -1

    const widthBottom = this.state.columnWidths[this.range.columnEnd] || -1
    const heightRight = this.state.rowHeights[this.range.rowEnd] || -1

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

  reset() {
    this.range = { ...EMPTY_RANGE }
    this.borders.hide()
  }
}
