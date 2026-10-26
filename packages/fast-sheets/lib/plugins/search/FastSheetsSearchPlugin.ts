import type { FastSheets } from 'lib/core/FastSheets.ts'
import type { Cell, CellStyle } from 'lib/core/types.ts'
import type { Options, RawOptions } from './types.ts'
import { getCellInfo, isDataCell } from 'lib/core/utils/cell.ts'
import { DEFAULT_SEARCH_RESULT_COLOR } from 'lib/core/constants.ts'
import type { FastSheetsPlugin } from 'lib/core/utils/plugins.ts'

const DEFAULT_OPTIONS = {
  selectionColor: DEFAULT_SEARCH_RESULT_COLOR,
}

export class FastSheetsSearchPlugin implements FastSheetsPlugin {
  name = 'search'

  instance!: FastSheets

  options: Options

  /**
   * Cells found by the search, grouped by row: maps a row index to the column indexes found in it.
   * Checked for every cell rendered, so a lookup must be fast and must not allocate.
   */
  searchResult = new Map<number, Set<number>>()

  constructor(options: RawOptions = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    }
  }

  setup(instance: FastSheets) {
    this.instance = instance
  }

  destroy() {
    this.instance.unregister(this.name)
  }

  #scrollTo(cell: Cell) {
    const state = this.instance.state
    const borderWidth = this.instance.state.options.borderWidth
    const cellInfo = getCellInfo(cell, state)
    state.options.elScroll.scrollTo({ top: cellInfo.top - borderWidth, behavior: 'smooth' })
  }

  highlightResult(cells: Cell[]) {
    this.searchResult = new Map()
    for (const { rowIndex, columnIndex } of cells) {
      let columnIndexes = this.searchResult.get(rowIndex)
      if (!columnIndexes) {
        columnIndexes = new Set()
        this.searchResult.set(rowIndex, columnIndexes)
      }
      columnIndexes.add(columnIndex)
    }
    this.instance.renderer.renderImmediate()

    const firstCell = cells[0]
    if (firstCell) {
      this.#scrollTo(firstCell)
    }
  }

  cellStyle(cell: Readonly<Cell>, style: CellStyle) {
    if (isDataCell(cell) && this.searchResult.get(cell.rowIndex)?.has(cell.columnIndex)) {
      style.borderColor = this.options.selectionColor
    }
  }
}
