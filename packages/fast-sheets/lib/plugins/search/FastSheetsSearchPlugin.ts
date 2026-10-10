import type { FastSheetsPlugin, FastSheetsInstance, Cell } from 'lib/core/types.ts'
import { DEFAULT_SELECTION_COLOR } from './constants.ts'
import type { Options, RawOptions } from './types.ts'
import { getCellInfo, getCellKey } from 'lib/core/utils/cell.ts'

const DEFAULT_OPTIONS = {
  selectionColor: DEFAULT_SELECTION_COLOR,
}

interface SearchResult {
  [key: string]: Cell
}

export class FastSheetsSearchPlugin implements FastSheetsPlugin {
  name = 'search'

  instance!: FastSheetsInstance

  options: Options

  searchResult: SearchResult = {}

  constructor(options: RawOptions = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    }
  }

  setup(instance: FastSheetsInstance) {
    this.instance = instance

    const renderCellBackgroundOriginal = instance.renderer.renderCellBackground
    instance.renderer.renderCellBackground = ({ ctx, fillStyle, cellInfo }) => {
      const key = getCellKey(cellInfo.cell)
      if (this.searchResult[key]) {
        ctx.fillStyle = 'rgb(8,197,0)'
        ctx.fillRect(-1, -1, cellInfo.width + 2, cellInfo.height + 2)
      }
      renderCellBackgroundOriginal.apply(instance.renderer, [
        {
          ctx,
          fillStyle,
          cellInfo,
        },
      ])
    }
  }

  private scrollTo(cell: Cell) {
    const state = this.instance.state
    const borderWidth = this.instance.state.options.borderWidth
    const cellInfo = getCellInfo({ cell, state })
    state.options.elScroll.scrollTo({ top: cellInfo.top - borderWidth, behavior: 'smooth' })
  }

  public highlightResult(cells: Cell[]) {
    this.searchResult = cells.reduce<SearchResult>((acc, cell) => {
      let rowIndex = cell.rowIndex
      if (this.instance.state.hasColumnNames) {
        rowIndex++
      }
      let columnIndex = cell.columnIndex
      if (this.instance.state.options.isRowNumberVisible) {
        columnIndex++
      }
      const cellToSearch = { columnIndex, rowIndex }
      acc[getCellKey(cellToSearch)] = cellToSearch
      return acc
    }, {})
    this.instance.renderer.renderImmediate()

    const firstCell = Object.values(this.searchResult)[0]
    if (firstCell) {
      this.scrollTo(firstCell)
    }
  }
}
