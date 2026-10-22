import { roundToPixels } from 'lib/core/utils/round-to-pixels.ts'
import { findLastIndexLessOrEqual } from 'lib/core/utils/array.ts'
import {
  COLUMN_HEADING_FONT,
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_FONT,
  DEFAULT_FONT_HEIGHT,
  DEFAULT_LINE_SPACING,
  DEFAULT_PADDING,
  ROW_HEADING_FONT,
} from 'lib/core/constants.ts'
import { clearCanvas, getContext, getCanvasSize, setTransform } from 'lib/core/utils/canvas.ts'
import type { StateInstance } from 'lib/core/State.ts'
import { Font } from 'lib/core/Font.ts'
import { getOffsets, renderCellBackground, renderCellText } from 'lib/core/utils/render.ts'
import { getLinesHeight, getLinesCount } from 'lib/core/utils/font.ts'
import type { Cell, CellsRange } from 'lib/core/types.ts'
import { createPluginHooks, type FastSheetsPlugin } from 'lib/core/utils/plugins.ts'

export class Renderer {
  readonly #state: StateInstance
  #isRendering = false
  #fonts: { [fontName: string]: Font } = {}
  #animationFrameId: number | null = null
  /**
   * The registered plugins grouped by hook, read for every frame and every cell.
   * Replaced by `setPlugins`, never changed in place, so a frame being drawn keeps the plugins it started with.
   */
  #pluginHooks = createPluginHooks([])
  #rowHeightsByLinesCount: number[] = [] //  row heights by the number of text lines in the row

  constructor(state: StateInstance) {
    this.#state = state
  }

  /** Sets the plugins to call while drawing. Called by `FastSheets` whenever a plugin is added or removed. */
  setPluginHooks(plugins: readonly FastSheetsPlugin[]) {
    this.#pluginHooks = createPluginHooks(plugins)
  }

  init() {
    const { elCanvas, elScrollInner, elScrollPaneX, elScrollPaneY, columns } = this.#state.options
    const ctx = getContext(elCanvas)
    if (!ctx) {
      return
    }

    this.#state.canvasSize = getCanvasSize(elScrollInner)
    elCanvas.style.width = this.#state.canvasSize.width
    elCanvas.style.height = this.#state.canvasSize.height

    this.initFonts(ctx)

    this.#state.hasHeaderRow = !!columns.find((column) => !!column.name)

    this.#state.headerRowHeight = this.getHeaderRowHeight()
    this.#state.numberingColumnWidth = this.getNumberingColumnWidth()

    this.#state.rowHeights = this.getRowHeights()
    this.#state.columnWidths = this.getColumnWidths()

    this.#state.totalWidth = this.getTotalWidth()
    this.#state.totalHeight = this.getTotalHeight()

    this.#state.horizontalOffsets = this.getHorizontalOffsets()
    this.#state.verticalOffsets = this.getVerticalOffsets()

    this.#state.totalSize = {
      width: this.#state.horizontalOffsets[this.#state.horizontalOffsets.length - 1] || 0,
      height: this.#state.verticalOffsets[this.#state.verticalOffsets.length - 1] || 0,
    }

    this.#state.containerSize = {
      width: elScrollInner.getBoundingClientRect().width,
      height: elScrollInner.getBoundingClientRect().height,
    }

    elScrollPaneX.style.width = `${this.#state.totalWidth}px`
    elScrollPaneY.style.height = `${this.#state.totalHeight}px`
  }

  initFonts(ctx: CanvasRenderingContext2D) {
    this.#fonts[DEFAULT_FONT] = new Font(DEFAULT_FONT, ctx)
    this.#fonts[ROW_HEADING_FONT] = new Font(ROW_HEADING_FONT, ctx)
    this.#rowHeightsByLinesCount = []
  }

  getHeaderRowHeight() {
    if (!this.#state.hasHeaderRow) {
      return 0
    }

    const fontHeight = this.#fonts[ROW_HEADING_FONT]?.fontHeight || DEFAULT_FONT_HEIGHT
    const linesHeight = getLinesHeight(1, fontHeight, DEFAULT_LINE_SPACING)
    const paddingY = DEFAULT_PADDING.y * 4
    return roundToPixels(linesHeight + paddingY)
  }

  getNumberingColumnWidth() {
    return this.#state.options.isRowNumberVisible ? 50 : 0
  }

  getRowHeights() {
    const rowsCount = this.#state.options.data.length
    const rowHeights = new Array<number>(rowsCount)
    for (let rowIndex = 0; rowIndex < rowsCount; rowIndex++) {
      rowHeights[rowIndex] = this.getRowHeight(rowIndex)
    }
    return rowHeights
  }

  /** The height of a row: enough for the cell with the most text lines. */
  getRowHeight(rowIndex: number) {
    const cellsTexts = this.#state.options.data[rowIndex] || []
    let maxLinesCount = 1
    for (const cellText of cellsTexts) {
      maxLinesCount = Math.max(maxLinesCount, getLinesCount(cellText))
    }
    return this.#getRowHeightByLinesCount(maxLinesCount)
  }

  #getRowHeightByLinesCount(linesCount: number) {
    let rowHeight = this.#rowHeightsByLinesCount[linesCount]
    if (rowHeight === undefined) {
      const fontHeight = this.#fonts[DEFAULT_FONT]?.fontHeight || DEFAULT_FONT_HEIGHT
      const linesHeight = getLinesHeight(linesCount, fontHeight, DEFAULT_LINE_SPACING)
      const paddingY = DEFAULT_PADDING.y * 2
      rowHeight = roundToPixels(linesHeight + paddingY)
      this.#rowHeightsByLinesCount[linesCount] = rowHeight
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
    state.totalSize.height = offsets[offsets.length - 1] || 0
    state.options.elScrollPaneY.style.height = `${state.totalHeight}px`
  }

  getColumnWidths() {
    const { columns, borderWidth, elScrollInner, isRowNumberVisible } = this.#state.options
    let containerWidth = elScrollInner.offsetWidth - borderWidth * 2
    if (isRowNumberVisible) {
      containerWidth -= this.#state.numberingColumnWidth
    }
    const columnsWithSizeTotalWidth = columns.reduce(
      (total, { width }) => total + (width ? width + borderWidth : 0),
      0,
    )
    const columnsWithoutWidthLength = columns.filter((column) => !column.width).length
    const columnWithAutoWidth = roundToPixels(
      (containerWidth - columnsWithSizeTotalWidth) / columnsWithoutWidthLength,
    )
    return columns.map(
      (column) =>
        column.width || Math.max(columnWithAutoWidth, column.minWidth || DEFAULT_COLUMN_MIN_WIDTH),
    )
  }

  getTotalWidth() {
    const { columns, borderWidth } = this.#state.options
    const verticalBordersCount = columns.length - 1
    return (
      this.#state.numberingColumnWidth +
      (this.#state.numberingColumnWidth > 0 ? borderWidth : 0) +
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
      firstOffset += this.getHeaderRowHeight() + borderWidth
    }
    return getOffsets(this.#state.rowHeights, firstOffset, borderWidth)
  }

  getHorizontalOffsets() {
    const { borderWidth } = this.#state.options
    let firstOffset = borderWidth
    if (this.#state.options.isRowNumberVisible) {
      firstOffset += this.getNumberingColumnWidth() + borderWidth
    }
    return getOffsets(this.#state.columnWidths, firstOffset, borderWidth)
  }

  findColumnIndex = (offsetX: number) => {
    const maxX = this.#state.viewport.right
    if (offsetX > maxX) {
      return -1
    }
    return findLastIndexLessOrEqual(this.#state.horizontalOffsets, offsetX)
  }

  findRowIndex = (offsetY: number) => {
    const maxY = this.#state.viewport.bottom
    if (offsetY > maxY) {
      return -1
    }
    return findLastIndexLessOrEqual(this.#state.verticalOffsets, offsetY)
  }

  findCellByMouseEvent(e: MouseEvent) {
    const { elScrollInner } = this.#state.options
    const { left, top } = elScrollInner.getBoundingClientRect()
    const x = e.pageX - left
    const y = e.pageY - top

    if (x < 0 || y < 0) {
      return undefined
    }

    const columnIndex = this.findColumnIndex(x)
    const rowIndex = this.findRowIndex(y)

    if (columnIndex < 0 || rowIndex < 0) {
      return undefined
    }

    const cell: Cell = { rowIndex, columnIndex }
    return cell
  }

  /** Whether the event is over the top left corner, above the row numbers and before the column names. */
  isTopLeftCornerMouseEvent(e: MouseEvent) {
    const state = this.#state
    if (!state.hasHeaderRow || !state.options.isRowNumberVisible) {
      return false
    }
    const { borderWidth, elScrollInner } = state.options
    const { left, top } = elScrollInner.getBoundingClientRect()
    const x = e.clientX - left
    const y = e.clientY - top
    return (
      x >= borderWidth &&
      x < borderWidth + state.numberingColumnWidth &&
      y >= borderWidth &&
      y < borderWidth + state.headerRowHeight
    )
  }

  renderCell(ctx: CanvasRenderingContext2D, cell: Cell, defaultBackgroundColor = '#fff') {
    const state = this.#state
    const pluginHooks = this.#pluginHooks
    const { rowIndex, columnIndex } = cell
    const { borderWidth } = state.options
    const width = state.columnWidths[columnIndex] || 0
    const height = state.rowHeights[rowIndex] || 0
    setTransform(
      state.viewport,
      ctx,
      state.horizontalOffsets[columnIndex] || 0,
      state.verticalOffsets[rowIndex] || 0,
    )

    let backgroundColor = defaultBackgroundColor
    for (const plugin of pluginHooks.getCellBackgroundColor) {
      backgroundColor = plugin.getCellBackgroundColor(cell, backgroundColor)
    }

    renderCellBackground({ ctx, backgroundColor, width, height, borderWidth })

    for (const plugin of pluginHooks.renderCellBackground) {
      plugin.renderCellBackground({ ctx, cell, backgroundColor, width, height, borderWidth })
    }

    const text = state.options.data[rowIndex]?.[columnIndex]
    if (text) {
      const font = this.#fonts[DEFAULT_FONT]
      const x = DEFAULT_PADDING.x
      const y = height / 2
      renderCellText({ ctx, text, x, y, font, textAlign: 'left', verticalAlign: 'middle' })

      for (const plugin of pluginHooks.renderCellText) {
        plugin.renderCellText({
          ctx,
          cell,
          text,
          x,
          y,
          font,
          textAlign: 'left',
          verticalAlign: 'middle',
        })
      }
    }
  }

  renderCells(ctx: CanvasRenderingContext2D, range: CellsRange) {
    const rowStart = Math.max(0, range.rowStart)
    const columnStart = Math.max(0, range.columnStart)

    for (let rowIndex = rowStart; rowIndex <= range.rowEnd; rowIndex++) {
      for (let columnIndex = columnStart; columnIndex <= range.columnEnd; columnIndex++) {
        const cell = { rowIndex, columnIndex }
        this.renderCell(ctx, cell)
      }
    }
    setTransform(this.#state.viewport, ctx, 0, 0)
  }

  renderTopLeftCorner(ctx: CanvasRenderingContext2D) {
    setTransform(
      this.#state.viewport,
      ctx,
      this.#state.options.borderWidth,
      this.#state.options.borderWidth,
    )

    renderCellBackground({
      ctx,
      backgroundColor: '#fff',
      bordersColor: '#ccc',
      width: this.#state.numberingColumnWidth,
      height: this.#state.headerRowHeight,
      borderWidth: this.#state.options.borderWidth,
    })
  }

  renderHeaderRow(ctx: CanvasRenderingContext2D, range: CellsRange) {
    if (range.rowStart <= 0) {
      const columnStart = Math.max(0, range.columnStart)
      const columnEnd = range.columnEnd
      for (let columnIndex = columnStart; columnIndex <= columnEnd; columnIndex++) {
        this.renderHeaderRowCell(ctx, columnIndex)
      }
    }
  }

  renderHeaderRowCell(ctx: CanvasRenderingContext2D, columnIndex: number) {
    const { borderWidth } = this.#state.options
    // noinspection JSSuspiciousNameCombination
    const cellTop = borderWidth
    const cellWidth = this.#state.columnWidths[columnIndex] || 0
    const cellHeight = this.#state.headerRowHeight
    const cellLeft = this.#state.horizontalOffsets[columnIndex] || 0
    setTransform(this.#state.viewport, ctx, cellLeft, cellTop)

    renderCellBackground({
      ctx,
      backgroundColor: '#fff',
      bordersColor: '#ccc',
      width: cellWidth,
      height: cellHeight,
      borderWidth,
    })

    const font = this.#fonts[COLUMN_HEADING_FONT]
    const textX = cellWidth / 2
    const textY = cellHeight / 2
    const text = this.#state.options.columns[columnIndex]?.name || ''

    renderCellText({
      ctx,
      text,
      x: textX,
      y: textY,
      font,
      textAlign: 'center',
      verticalAlign: 'middle',
    })
  }

  renderNumberingColumn(ctx: CanvasRenderingContext2D, range: CellsRange) {
    if (range.columnStart <= 0) {
      const rowStart = Math.max(0, range.rowStart)
      const rowEnd = range.rowEnd
      for (let rowIndex = rowStart; rowIndex <= rowEnd; rowIndex++) {
        this.renderNumberingColumnCell(ctx, rowIndex)
      }
    }
  }

  renderNumberingColumnCell(ctx: CanvasRenderingContext2D, rowIndex: number) {
    const { borderWidth } = this.#state.options
    const cellTop = this.#state.verticalOffsets[rowIndex] || 0
    const cellWidth = this.#state.numberingColumnWidth
    const cellHeight = this.#state.rowHeights[rowIndex] || 0
    // noinspection UnnecessaryLocalVariableJS
    const cellLeft = borderWidth
    setTransform(this.#state.viewport, ctx, cellLeft, cellTop)

    renderCellBackground({
      ctx,
      backgroundColor: '#fff',
      bordersColor: '#ccc',
      width: cellWidth,
      height: cellHeight,
      borderWidth,
    })

    const font = this.#fonts[ROW_HEADING_FONT]
    const textX = DEFAULT_PADDING.x
    const textY = cellHeight / 2
    const text = (rowIndex + 1).toString()

    renderCellText({
      ctx,
      text,
      x: textX,
      y: textY,
      font,
      textAlign: 'left',
      verticalAlign: 'middle',
    })
  }

  renderImmediate() {
    const { elCanvas, elScroll } = this.#state.options
    const ctx = getContext(elCanvas)
    if (!ctx) {
      return
    }

    const { widthWithPixelRatio, heightWithPixelRatio } = this.#state.canvasSize
    if (elCanvas.width !== widthWithPixelRatio) {
      elCanvas.width = widthWithPixelRatio
    }
    if (elCanvas.height !== heightWithPixelRatio) {
      elCanvas.height = heightWithPixelRatio
    }

    const left = elScroll.scrollLeft || 0
    const top = elScroll.scrollTop || 0
    const right = left + this.#state.containerSize.width
    const bottom = top + this.#state.containerSize.height
    this.#state.viewport = { left, top, right, bottom }

    const visibleRange: CellsRange = {
      rowStart: this.findRowIndex(this.#state.viewport.top), // first visible row index
      rowEnd: this.findRowIndex(this.#state.viewport.bottom), // last visible row index
      columnStart: this.findColumnIndex(this.#state.viewport.left), // first visible column index
      columnEnd: this.findColumnIndex(this.#state.viewport.right), // last visible column index
    }

    clearCanvas(elCanvas, ctx)

    if (this.#state.hasHeaderRow && this.#state.options.isRowNumberVisible) {
      this.renderTopLeftCorner(ctx)
    }
    if (this.#state.hasHeaderRow) {
      this.renderHeaderRow(ctx, visibleRange)
    }
    if (this.#state.options.isRowNumberVisible) {
      this.renderNumberingColumn(ctx, visibleRange)
    }
    this.renderCells(ctx, visibleRange)
  }

  render() {
    if (this.#isRendering) {
      return
    }
    this.#isRendering = true
    this.#animationFrameId = requestAnimationFrame(() => {
      this.#isRendering = false
      this.renderImmediate()

      for (const plugin of this.#pluginHooks.render) {
        plugin.render()
      }
    })
  }

  destroy() {
    const { elCanvas } = this.#state.options
    elCanvas.width = 0
    elCanvas.height = 0
    if (this.#animationFrameId !== null) {
      cancelAnimationFrame(this.#animationFrameId)
      this.#animationFrameId = null
    }
    this.#isRendering = false
  }
}
