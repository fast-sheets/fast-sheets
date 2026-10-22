import type {
  FastSheetsPlugin,
  FastSheetsInstance,
  RenderCellBackgroundOptions,
  Cell,
} from 'lib/core/types.ts'
import type { Options, RawOptions } from './types.ts'
import { getCellInfo } from 'lib/core/utils/cell.ts'
import { renderCellBackground } from 'lib/core/utils/render.ts'
import { DEFAULT_SEARCH_RESULT_COLOR } from 'lib/core/constants.ts'

const DEFAULT_OPTIONS = {
  selectionColor: DEFAULT_SEARCH_RESULT_COLOR,
}

export class FastSheetsSearchPlugin implements FastSheetsPlugin {
  name = 'search'

  instance!: FastSheetsInstance

  options: Options

  /**
   * Cells found by the search, grouped by row: maps a row index to the column indexes found in it.
   * Checked for every cell drawn, so a lookup must be fast and must not allocate.
   */
  searchResult = new Map<number, Set<number>>()

  constructor(options: RawOptions = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    }
  }

  setup(instance: FastSheetsInstance) {
    this.instance = instance
  }

  destroy() {
    this.instance.unuse(this.name)
  }

  private scrollTo(cell: Cell) {
    const state = this.instance.state
    const borderWidth = this.instance.state.options.borderWidth
    const cellInfo = getCellInfo({ cell, state })
    state.options.elScroll.scrollTo({ top: cellInfo.top - borderWidth, behavior: 'smooth' })
  }

  public highlightResult(cells: Cell[]) {
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
      this.scrollTo(firstCell)
    }
  }

  public renderCellBackground({
    ctx,
    cell,
    backgroundColor,
    borderWidth,
    width,
    height,
  }: RenderCellBackgroundOptions) {
    if (cell && this.searchResult.get(cell.rowIndex)?.has(cell.columnIndex)) {
      renderCellBackground({
        ctx,
        bordersColor: this.options.selectionColor,
        backgroundColor,
        borderWidth,
        width,
        height,
      })
    }
  }
}
