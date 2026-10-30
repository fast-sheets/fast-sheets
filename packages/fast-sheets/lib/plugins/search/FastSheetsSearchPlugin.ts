import type { FastSheets } from 'lib/core/FastSheets.ts'
import type { Cell, CellStyle } from 'lib/core/types.ts'
import type { Options, RawOptions } from './types.ts'
import { getCellInfo, isDataCell } from 'lib/core/utils/cell.ts'
import { mergeOptions } from 'lib/core/utils/options.ts'
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
    this.options = mergeOptions(DEFAULT_OPTIONS, options)
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

  /** Moves the found cells at or below the inserted row down by one. */
  afterInsertRow(index: number) {
    const searchResult = new Map<number, Set<number>>()
    for (const [rowIndex, columnIndexes] of this.searchResult) {
      searchResult.set(rowIndex < index ? rowIndex : rowIndex + 1, columnIndexes)
    }
    this.searchResult = searchResult
  }

  /** Forgets the found cells of the removed row, and moves the ones below it up by one. */
  afterRemoveRow(index: number) {
    const searchResult = new Map<number, Set<number>>()
    for (const [rowIndex, columnIndexes] of this.searchResult) {
      if (rowIndex !== index) {
        searchResult.set(rowIndex < index ? rowIndex : rowIndex - 1, columnIndexes)
      }
    }
    this.searchResult = searchResult
  }

  /** Moves the found cells at or right of the inserted column right by one. */
  afterInsertColumn(index: number) {
    for (const [rowIndex, columnIndexes] of this.searchResult) {
      const newColumnIndexes = new Set<number>()
      for (const columnIndex of columnIndexes) {
        newColumnIndexes.add(columnIndex < index ? columnIndex : columnIndex + 1)
      }
      this.searchResult.set(rowIndex, newColumnIndexes)
    }
  }

  /** Forgets the found cells of the removed column, and moves the ones right of it left by one. */
  afterRemoveColumn(index: number) {
    for (const [rowIndex, columnIndexes] of this.searchResult) {
      const newColumnIndexes = new Set<number>()
      for (const columnIndex of columnIndexes) {
        if (columnIndex !== index) {
          newColumnIndexes.add(columnIndex < index ? columnIndex : columnIndex - 1)
        }
      }
      if (newColumnIndexes.size) {
        this.searchResult.set(rowIndex, newColumnIndexes)
      } else {
        this.searchResult.delete(rowIndex)
      }
    }
  }

  cellStyle(cell: Readonly<Cell>, style: CellStyle) {
    if (isDataCell(cell) && this.searchResult.get(cell.rowIndex)?.has(cell.columnIndex)) {
      style.borderColor = this.options.selectionColor
    }
  }
}
