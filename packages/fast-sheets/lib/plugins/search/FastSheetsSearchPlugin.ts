import type { FastSheetsPlugin, FastSheetsInstance, Cell } from 'lib/core/types.ts'
import { DEFAULT_SELECTION_COLOR } from './constants.ts'
import type { Options, RawOptions } from './types.ts'
import { getCellInfo, getCellKey } from 'lib/core/utils/cell.ts'
import { HighlightedCell } from 'lib/core/elements/HighlightedCell.ts'

const DEFAULT_OPTIONS = {
  selectionColor: DEFAULT_SELECTION_COLOR,
}

interface SearchResult {
  [key: string]: Cell
}

interface HighlightedCells {
  [key: string]: InstanceType<typeof HighlightedCell>
}

export class FastSheetsSearchPlugin implements FastSheetsPlugin {
  name = 'search'

  instance!: FastSheetsInstance

  options: Options

  searchResult: SearchResult = {}

  highlightedCells: HighlightedCells = {}

  elHighlightedCellsContainer?: HTMLDivElement

  constructor(options: RawOptions = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    }
  }

  setup(instance: FastSheetsInstance) {
    this.instance = instance
    this.elHighlightedCellsContainer = document.createElement('div')
    this.elHighlightedCellsContainer.style =
      'position: absolute; top: 0; left: 0; width: 0; height: 0;'
    this.instance.state.options.elContainer.appendChild(this.elHighlightedCellsContainer)
  }

  destroy() {
    this.elHighlightedCellsContainer?.remove()
  }

  private scrollTo(cell: Cell) {
    const state = this.instance.state
    const cellInfo = getCellInfo({ cell, state })
    state.options.elScroll.scrollTo({ top: cellInfo.top, behavior: 'smooth' })
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
    this.render()

    const firstCell = Object.values(this.searchResult)[0]
    if (firstCell) {
      this.scrollTo(firstCell)
    }
  }

  public render() {
    const { elScroll } = this.instance.state.options
    if (this.elHighlightedCellsContainer) {
      this.elHighlightedCellsContainer.style.transform = `translateY(-${elScroll.scrollTop || 0}px)`
    }

    const newKeys = this.renderHighlightedCells()
    this.destroyScrolledHighlightedCells(newKeys)
  }

  private renderHighlightedCells() {
    const newKeys: { [key: string]: string } = {}
    Object.values(this.instance.state.visibleCells).forEach((cell) => {
      if (!this.elHighlightedCellsContainer) {
        return
      }
      const key = getCellKey(cell)
      if (this.searchResult[key]) {
        if (!this.highlightedCells[key]) {
          this.highlightedCells[key] = new HighlightedCell({
            state: this.instance.state,
            options: {
              name: 'elSearchHighlightedCell',
              container: this.elHighlightedCellsContainer,
              color: 'rgb(8,197,0)',
            },
          })
        }
        this.highlightedCells[key].highlight(cell)
        newKeys[key] = key
      }
    })
    return newKeys
  }

  private destroyScrolledHighlightedCells(newKeys: { [key: string]: string }) {
    Object.entries(this.highlightedCells).forEach(([key, cell]) => {
      if (!newKeys[key]) {
        cell.destroy()
        delete this.highlightedCells[key]
      }
    })
  }
}
