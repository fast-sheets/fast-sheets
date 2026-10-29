import { roundToPixels } from 'lib/core/utils/round-to-pixels.ts'
import { findFloorIndex } from 'lib/core/utils/array.ts'
import {
  COLUMN_HEADING_FONT,
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_FONT,
  DEFAULT_PADDING,
} from 'lib/core/constants.ts'
import { getContext, getCanvasSize } from 'lib/core/utils/canvas.ts'
import { FontsManager } from 'lib/core/FontsManager.ts'
import type { Font } from 'lib/core/Font.ts'
import type { State } from 'lib/core/State.ts'
import { getOffsets } from 'lib/core/utils/render.ts'
import { getLinesCount } from 'lib/core/utils/string.ts'
import type { Cell, CellsRange } from 'lib/core/types.ts'
import { createPluginHooks, type PluginHooks } from 'lib/core/utils/plugins.ts'
import { isDataCell } from 'lib/core/utils/cell.ts'

/**
 * Calculates row/column sizes and offsets, storing them in "State" for the renderer.
 * Also has look-up utils
 */
export class Layout {
  readonly #state: State
  /** Measured on every `init()`, because the first layout is the first moment a canvas context exists. */
  readonly #fontsManager = new FontsManager()
  #isInitialized = false
  /** The registered plugins grouped by hook. Replaced by `setPluginHooks`, never changed in place. */
  #pluginHooks: PluginHooks = createPluginHooks([])

  #rowHeightsCache: number[] = [] // row heights by the number of text lines in the row

  constructor(state: State) {
    this.#state = state
  }

  /** Sets the plugins to call while calculating sizes. Called by `FastSheets` whenever a plugin is added or removed. */
  setPluginHooks(pluginHooks: PluginHooks) {
    this.#pluginHooks = pluginHooks
  }

  /** Whether the sizes were calculated at least once. */
  get isInitialized() {
    return this.#isInitialized
  }

  /** Measures the fonts and calculates all sizes and offsets. Runs on init, on resize and when plugins change sizes. */
  init() {
    const { elCanvas, elScrollInner, elScrollPaneX, elScrollPaneY, columns } = this.#state.options
    const ctx = getContext(elCanvas)
    if (!ctx) {
      return
    }

    this.#state.canvasSize = getCanvasSize(elScrollInner)
    const { width, height, widthWithPixelRatio, heightWithPixelRatio } = this.#state.canvasSize
    elCanvas.style.width = `${width}px`
    elCanvas.style.height = `${height}px`
    // A new size clears the canvas, so it's set only when it changes. On resize, the grid renders right after.
    if (elCanvas.width !== widthWithPixelRatio) {
      elCanvas.width = widthWithPixelRatio
    }
    if (elCanvas.height !== heightWithPixelRatio) {
      elCanvas.height = heightWithPixelRatio
    }

    this.#fontsManager.initFonts(ctx)

    this.#state.hasHeaderRow = !!columns.find((column) => !!column.name)

    this.#rowHeightsCache = []

    this.#state.headerRowHeight = this.getHeaderRowHeight()
    this.#state.numberingColumnWidth = this.getNumberingColumnWidth()

    this.#state.rowHeights = this.getRowHeights()
    this.#state.columnWidths = this.getColumnWidths()

    this.#state.totalWidth = this.getTotalWidth()
    this.#state.totalHeight = this.getTotalHeight()

    this.#state.horizontalOffsets = this.getHorizontalOffsets()
    this.#state.verticalOffsets = this.getVerticalOffsets()

    elScrollPaneX.style.width = `${this.#state.totalWidth}px`
    elScrollPaneY.style.height = `${this.#state.totalHeight}px`

    this.#isInitialized = true
    this.#afterLayout()
  }

  /**
   * Returns a font, measured once and cached until the next layout.
   * Throws before the first layout, because there is no canvas context to measure it with yet.
   */
  getFont(font: string): Font {
    return this.#fontsManager.getFont(font)
  }

  #afterLayout() {
    for (const plugin of this.#pluginHooks.afterLayout) {
      plugin.afterLayout()
    }
  }

  getHeaderRowHeight() {
    if (!this.#state.hasHeaderRow) {
      return 0
    }

    const linesHeight = this.#fontsManager.getFont(COLUMN_HEADING_FONT).getLinesHeight(1)
    const paddingY = DEFAULT_PADDING.y * 4
    let height = roundToPixels(linesHeight + paddingY)
    for (const plugin of this.#pluginHooks.getHeaderRowHeight) {
      height = plugin.getHeaderRowHeight(height)
    }
    return height
  }

  getNumberingColumnWidth() {
    if (!this.#state.options.isRowNumberVisible) {
      return 0
    }
    let width = 50
    for (const plugin of this.#pluginHooks.getNumberingColumnWidth) {
      width = plugin.getNumberingColumnWidth(width)
    }
    return width
  }

  getRowHeights() {
    const rowsCount = this.#state.options.data.length
    const rowHeights = new Array<number>(rowsCount)
    for (let rowIndex = 0; rowIndex < rowsCount; rowIndex++) {
      rowHeights[rowIndex] = this.getRowHeight(rowIndex)
    }
    return rowHeights
  }

  /** The height of a row: enough for the cell with the most text lines, then changed by the getRowHeight hooks. */
  getRowHeight(rowIndex: number) {
    const cellsTexts = this.#state.options.data[rowIndex] || []
    let maxLinesCount = 1
    for (const cellText of cellsTexts) {
      maxLinesCount = Math.max(maxLinesCount, getLinesCount(cellText))
    }
    let height = this.#getRowHeightByLinesCount(maxLinesCount)
    for (const plugin of this.#pluginHooks.getRowHeight) {
      height = plugin.getRowHeight(rowIndex, height)
    }
    return height
  }

  #getRowHeightByLinesCount(linesCount: number) {
    let rowHeight = this.#rowHeightsCache[linesCount]
    if (rowHeight === undefined) {
      const linesHeight = this.#fontsManager.getFont(DEFAULT_FONT).getLinesHeight(linesCount)
      const paddingY = DEFAULT_PADDING.y * 2
      rowHeight = roundToPixels(linesHeight + paddingY)
      this.#rowHeightsCache[linesCount] = rowHeight
    }
    return rowHeight
  }

  updateRows(rowIndexes: Iterable<number>) {
    const state = this.#state
    const rowsCount = state.options.data.length
    if (rowsCount !== state.rowHeights.length) {
      this.init()
      return
    }

    let firstChangedRowIndex = rowsCount
    let heightDelta = 0
    for (const rowIndex of rowIndexes) {
      const oldHeight = state.rowHeights[rowIndex]
      if (oldHeight === undefined) {
        continue
      }
      const newHeight = this.getRowHeight(rowIndex)
      if (newHeight !== oldHeight) {
        state.rowHeights[rowIndex] = newHeight
        heightDelta += newHeight - oldHeight
        firstChangedRowIndex = Math.min(firstChangedRowIndex, rowIndex)
      }
    }
    if (firstChangedRowIndex === rowsCount) {
      // no row changed its height
      return
    }

    // The first changed row keeps its offset, so only the rows below it would move.
    // Each starts at the previous row's offset + rowHeight + borderWidth
    const { borderWidth } = state.options
    const offsets = state.verticalOffsets
    for (let rowIndex = firstChangedRowIndex + 1; rowIndex < rowsCount; rowIndex++) {
      offsets[rowIndex] = offsets[rowIndex - 1]! + state.rowHeights[rowIndex - 1]! + borderWidth
    }
    state.totalHeight += heightDelta
    state.options.elScrollPaneY.style.height = `${state.totalHeight}px`
    this.#afterLayout()
  }

  getColumnWidths() {
    const { columns, borderWidth, isRowNumberVisible } = this.#state.options
    // The grid fits the container when the columns, the numbering-column, and all borders fit.
    // This includes a border:
    // 1. BEFORE each column
    // 2. AFTER the last column
    // 3. AFTER the numbering-column
    let availableWidth = this.#state.canvasSize.width - borderWidth * (columns.length + 1)
    if (isRowNumberVisible) {
      availableWidth -= this.#state.numberingColumnWidth + borderWidth
    }
    availableWidth -= columns.reduce((sum, column) => sum + (column.width || 0), 0)
    const autoWidthColumnsCount = columns.filter((column) => !column.width).length
    const lastAutoWidthColumnIndex = columns.findLastIndex((column) => !column.width)
    const autoWidth = roundToPixels(availableWidth / autoWidthColumnsCount)
    const roundingRemainder = availableWidth - autoWidth * autoWidthColumnsCount
    const hooks = this.#pluginHooks.getColumnWidth
    return columns.map((column, columnIndex) => {
      let width = column.width
      if (!width) {
        let fittingWidth = autoWidth
        if (columnIndex === lastAutoWidthColumnIndex) {
          fittingWidth += roundingRemainder
        }
        width = Math.max(fittingWidth, column.minWidth || DEFAULT_COLUMN_MIN_WIDTH)
      }
      for (const plugin of hooks) {
        width = plugin.getColumnWidth(columnIndex, width)
      }
      return width
    })
  }

  /** The width of the whole grid with all its borders, the outer ones included. */
  getTotalWidth() {
    const { columns, borderWidth } = this.#state.options
    const { numberingColumnWidth } = this.#state
    const verticalBordersCount = columns.length + 1
    return (
      numberingColumnWidth +
      (numberingColumnWidth > 0 ? borderWidth : 0) +
      this.#state.columnWidths.reduce((a, b) => a + b, 0) +
      verticalBordersCount * borderWidth
    )
  }

  getTotalHeight() {
    const { borderWidth } = this.#state.options
    const rowsLength = this.#state.rowHeights.length
    const horizontalBordersCount = rowsLength - 1
    return (
      this.#state.headerRowHeight +
      (this.#state.headerRowHeight > 0 ? borderWidth : 0) +
      this.#state.rowHeights.reduce((a, b) => a + b, 0) +
      horizontalBordersCount * borderWidth +
      borderWidth
    )
  }

  getVerticalOffsets() {
    const { borderWidth } = this.#state.options
    let firstOffset = borderWidth
    if (this.#state.hasHeaderRow) {
      firstOffset += this.#state.headerRowHeight + borderWidth
    }
    return getOffsets(this.#state.rowHeights, firstOffset, borderWidth)
  }

  getHorizontalOffsets() {
    const { borderWidth } = this.#state.options
    let firstOffset = borderWidth
    if (this.#state.options.isRowNumberVisible) {
      firstOffset += this.#state.numberingColumnWidth + borderWidth
    }
    return getOffsets(this.#state.columnWidths, firstOffset, borderWidth)
  }

  /**
   * Reads the scroll position and the size of the visible area into `state.viewport`.
   * The renderer calls it before every frame, and the find methods use the viewport it sets.
   */
  updateViewport() {
    const { elScroll, elScrollInner } = this.#state.options
    const left = elScroll.scrollLeft || 0
    const top = elScroll.scrollTop || 0
    // read once: each read can make the browser lay out the page again
    const { width, height } = elScrollInner.getBoundingClientRect()
    const right = left + width
    const bottom = top + height

    this.#state.viewport = { left, top, right, bottom }
  }

  /**
   * Returns the rows and columns inside the viewport set by the last `updateViewport()`.
   * A start index is -1 when the viewport begins above the first data row or left of the first column.
   */
  getVisibleRange(): CellsRange {
    const { viewport } = this.#state
    return {
      rowStart: this.findRowIndex(viewport.top), // first visible row index
      rowEnd: this.findRowIndex(viewport.bottom), // last visible row index
      columnStart: this.findColumnIndex(viewport.left), // first visible column index
      columnEnd: this.findColumnIndex(viewport.right), // last visible column index
    }
  }

  findColumnIndex = (offsetX: number) => {
    const maxX = this.#state.viewport.right
    if (offsetX > maxX) {
      return -1
    }
    return findFloorIndex(this.#state.horizontalOffsets, offsetX)
  }

  findRowIndex = (offsetY: number) => {
    const maxY = this.#state.viewport.bottom
    if (offsetY > maxY) {
      return -1
    }
    return findFloorIndex(this.#state.verticalOffsets, offsetY)
  }

  /**
   * Finds the cell of any type under a point given relative to the window, as in `MouseEvent.clientX`.
   * Returns undefined outside the cells: on the outer border, or past the visible part of the grid.
   */
  findCellAtPoint(clientX: number, clientY: number): Cell | undefined {
    const state = this.#state
    const { elScrollInner, borderWidth } = state.options
    // both relative to the window: page coordinates would add the page scroll a second time
    const { left, top } = elScrollInner.getBoundingClientRect()
    const x = clientX - left
    const y = clientY - top
    if (x < 0 || y < 0 || x > state.viewport.right || y > state.viewport.bottom) {
      return undefined
    }

    const columnIndex = findFloorIndex(state.horizontalOffsets, x)
    const rowIndex = findFloorIndex(state.verticalOffsets, y)

    // a point is in the numbering-column or header-row (if visible) just before the first column or row
    const isInNumberingColumn =
      state.numberingColumnWidth > 0 && x < borderWidth * 2 + state.numberingColumnWidth
    const isInHeaderRow = state.headerRowHeight > 0 && y < borderWidth * 2 + state.headerRowHeight
    if ((columnIndex === -1 && !isInNumberingColumn) || (rowIndex === -1 && !isInHeaderRow)) {
      return undefined
    }

    return { rowIndex, columnIndex }
  }

  findDataCellAtPoint(clientX: number, clientY: number): Cell | undefined {
    const cell = this.findCellAtPoint(clientX, clientY)
    return cell && isDataCell(cell) ? cell : undefined
  }
}
