import type { Cell } from 'lib/core/types.ts'
import { HighlightedArea } from './HighlightedArea.ts'
import { getCellDomRect } from 'lib/core/utils/cell.ts'
import type { StateInstance } from 'lib/core/State.ts'

interface CellHighlightOptions {
  name: string
  color: string
  borderWidth?: number
  container: HTMLElement
}

export class HighlightedCell {
  readonly name: string

  readonly container: HTMLElement

  readonly borders: HighlightedArea

  cell: Cell | undefined

  constructor(options: CellHighlightOptions) {
    this.name = options.name
    this.container = options.container
    const borderWidth = options.borderWidth || 1
    const color = options.color
    this.borders = new HighlightedArea({ name: this.name, borderWidth, color })
    this.container.appendChild(this.borders.container)
  }

  highlight = ({ cell, state }: { cell: Cell; state: StateInstance }) => {
    this.cell = cell
    const cellDomRect = getCellDomRect({ cell, state })
    this.borders.show(cellDomRect)
  }

  reset() {
    this.cell = undefined
    this.borders.hide()
  }

  destroy() {
    this.borders.destroy()
  }
}
