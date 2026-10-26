import { roundToPixels } from 'lib/core/utils/round-to-pixels.ts'
import { findFloorIndex } from 'lib/core/utils/array.ts'
import {
  COLUMN_HEADING_FONT,
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_FONT,
  DEFAULT_HEADING_BORDER_COLOR,
  DEFAULT_PADDING,
  ROW_NUMBERING_FONT,
} from 'lib/core/constants.ts'
import { clearCanvas, getContext, getCanvasSize, setTransform } from 'lib/core/utils/canvas.ts'
import { FontsManager } from 'lib/core/FontsManager.ts'
import type { Font } from 'lib/core/Font.ts'
import type { State } from 'lib/core/State.ts'
import {
  getOffsets,
  getTextX,
  getTextY,
  renderCellBorders,
  renderCellText,
} from 'lib/core/utils/render.ts'
import { getLinesCount } from 'lib/core/utils/string.ts'
import type {
  Cell,
  CellRenderContext,
  CellsRange,
  CellStyle,
  FrameContext,
} from 'lib/core/types.ts'
import { createPluginHooks, type PluginHooks } from 'lib/core/utils/plugins.ts'
import { getCellText, isDataCell } from 'lib/core/utils/cell.ts'

/** Copies every style field into a style object that is reused for every cell. */
const copyCellStyle = (target: CellStyle, source: Readonly<CellStyle>) => {
  target.backgroundColor = source.backgroundColor
  target.borderColor = source.borderColor
  target.font = source.font
  target.color = source.color
  target.textAlign = source.textAlign
  target.verticalAlign = source.verticalAlign
  target.paddingX = source.paddingX
  target.paddingY = source.paddingY
}

interface RenderingContext {
  ctx: CanvasRenderingContext2D
  range: CellsRange
  cell: Cell
  cellIndex: number
  borderColors: (string | undefined)[]
  hasDataCellBorders: boolean
  top: number
  left: number
  width: number
  height: number
  /** The default style of the area being rendered: column-headings, row-numbering cells, data cells or the corner. */
  defaultStyle: Readonly<CellStyle>
  /** The style that cellStyle hooks change, reset from `defaultStyle` for each cell. */
  style: CellStyle
}

type RenderingFunction = (renderingContext: RenderingContext) => void

export class Renderer {
  readonly #state: State
  #isRendering = false
  #isInitialized = false
  #animationFrameId: number | null = null
  readonly #fontsManager = new FontsManager()
  /**
   * The registered plugins grouped by hook, read for every frame and every cell.
   * Replaced by `setPluginHooks`, never changed in place, so a frame being rendered keeps the plugins it started with.
   */
  #pluginHooks: PluginHooks = createPluginHooks([])

  #rowHeightsCache: number[] = [] // row heights by the number of text lines in the row

  constructor(state: State) {
    this.#state = state
  }

  /** Sets the plugins to call while rendering. Called by `FastSheets` whenever a plugin is added or removed. */
  setPluginHooks(pluginHooks: PluginHooks) {
    this.#pluginHooks = pluginHooks
  }

  /** Whether the sizes were calculated at least once. */
  get isInitialized() {
    return this.#isInitialized
  }

  init() {
    const { elCanvas, elScrollInner, elScrollPaneX, elScrollPaneY, columns } = this.#state.options
    const ctx = getContext(elCanvas)
    if (!ctx) {
      return
    }

    this.#state.canvasSize = getCanvasSize(elScrollInner)
    elCanvas.style.width = `${this.#state.canvasSize.width}px`
    elCanvas.style.height = `${this.#state.canvasSize.height}px`

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
   * Returns a font for `style.font` in a cellStyle hook, measured once and cached until the next layout.
   * Get it inside the hook rather than keeping it, because a new layout measures the fonts again.
   */
  getFont(font: string): Font {
    return this.#fontsManager.getFont(font)
  }

  /**
   * Creates the default style of a data cell with the current fonts, changed by `overrides`.
   * The area iterators call it once per frame for the default style of their area.
   */
  #createDefaultStyle(overrides?: Partial<CellStyle>): CellStyle {
    return {
      backgroundColor: '#fff',
      font: this.#fontsManager.getFont(DEFAULT_FONT),
      color: '#000',
      textAlign: 'left',
      verticalAlign: 'middle',
      paddingX: DEFAULT_PADDING.x,
      paddingY: DEFAULT_PADDING.y,
      ...overrides,
    }
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
    const hooks = this.#pluginHooks.getColumnWidth
    return columns.map((column, columnIndex) => {
      let width =
        column.width || Math.max(columnWithAutoWidth, column.minWidth || DEFAULT_COLUMN_MIN_WIDTH)
      for (const plugin of hooks) {
        width = plugin.getColumnWidth(columnIndex, width)
      }
      return width
    })
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

  getCellTextFormatted(cell: Readonly<Cell>): string {
    let text = getCellText(cell, this.#state)
    for (const plugin of this.#pluginHooks.formatCellText) {
      text = plugin.formatCellText(cell, text)
    }
    return text
  }

  /**
   * Renders the cells with their backgrounds and text, and saves their border colors for the border pass.
   * It also notes whether any data cell has a border, so that the border pass can skip the data cells.
   */
  #renderCells(renderingContext: RenderingContext) {
    if (this.#state.hasHeaderRow && this.#state.options.isRowNumberVisible) {
      this.#fillCornerContext(renderingContext)
      this.#renderCell(renderingContext)
    }
    if (this.#state.hasHeaderRow && renderingContext.range.rowStart <= 0) {
      this.#forEachHeaderRow((context) => this.#renderCell(context), renderingContext)
    }

    if (this.#state.options.isRowNumberVisible && renderingContext.range.columnStart <= 0) {
      this.#forEachNumberingColumn((context) => this.#renderCell(context), renderingContext)
    }

    renderingContext.hasDataCellBorders = false
    this.#forEachDataCell((context) => this.#renderCell(context), renderingContext)
  }

  #fillCornerContext(renderingContext: RenderingContext) {
    renderingContext.cell.rowIndex = -1
    renderingContext.cell.columnIndex = -1
    renderingContext.left = this.#state.options.borderWidth
    // noinspection JSSuspiciousNameCombination
    renderingContext.top = this.#state.options.borderWidth
    renderingContext.width = this.#state.numberingColumnWidth
    renderingContext.height = this.#state.headerRowHeight
    renderingContext.defaultStyle = this.#createDefaultStyle({
      borderColor: DEFAULT_HEADING_BORDER_COLOR,
    })
  }

  #forEachHeaderRow(renderFunction: RenderingFunction, renderingContext: RenderingContext) {
    renderingContext.cell.rowIndex = -1
    renderingContext.defaultStyle = this.#createDefaultStyle({
      borderColor: DEFAULT_HEADING_BORDER_COLOR,
      font: this.#fontsManager.getFont(COLUMN_HEADING_FONT),
      textAlign: 'center',
    })
    // noinspection JSSuspiciousNameCombination
    renderingContext.top = this.#state.options.borderWidth
    renderingContext.height = this.#state.headerRowHeight
    for (
      let columnIndex = renderingContext.range.columnStart;
      columnIndex <= renderingContext.range.columnEnd;
      columnIndex++
    ) {
      renderingContext.cell.columnIndex = columnIndex
      renderingContext.left = this.#state.horizontalOffsets[columnIndex] || 0
      renderingContext.width = this.#state.columnWidths[columnIndex] || 0
      renderFunction(renderingContext)
    }
  }

  #forEachNumberingColumn(renderFunction: RenderingFunction, renderingContext: RenderingContext) {
    renderingContext.cell.columnIndex = -1
    renderingContext.defaultStyle = this.#createDefaultStyle({
      borderColor: DEFAULT_HEADING_BORDER_COLOR,
      font: this.#fontsManager.getFont(ROW_NUMBERING_FONT),
    })
    renderingContext.left = this.#state.options.borderWidth
    renderingContext.width = this.#state.numberingColumnWidth
    for (
      let rowIndex = renderingContext.range.rowStart;
      rowIndex <= renderingContext.range.rowEnd;
      rowIndex++
    ) {
      renderingContext.cell.rowIndex = rowIndex
      renderingContext.top = this.#state.verticalOffsets[rowIndex] || 0
      renderingContext.height = this.#state.rowHeights[rowIndex] || 0
      renderFunction(renderingContext)
    }
  }

  #forEachDataCell(renderFunction: RenderingFunction, renderingContext: RenderingContext) {
    renderingContext.defaultStyle = this.#createDefaultStyle()

    for (
      let rowIndex = renderingContext.range.rowStart;
      rowIndex <= renderingContext.range.rowEnd;
      rowIndex++
    ) {
      renderingContext.top = this.#state.verticalOffsets[rowIndex] || 0
      renderingContext.height = this.#state.rowHeights[rowIndex] || 0
      for (
        let columnIndex = renderingContext.range.columnStart;
        columnIndex <= renderingContext.range.columnEnd;
        columnIndex++
      ) {
        renderingContext.cell.rowIndex = rowIndex
        renderingContext.cell.columnIndex = columnIndex
        renderingContext.left = this.#state.horizontalOffsets[columnIndex] || 0
        renderingContext.width = this.#state.columnWidths[columnIndex] || 0
        renderFunction(renderingContext)
      }
    }
  }

  /**
   * Renders one cell: gets its text and style from the hooks, then renders its background and content.
   * The cell, its style and its sizes come from `renderingContext`, which is reused for every cell.
   * It creates the render context only for the render hooks.
   * Saves the border color of the cell for the border pass.
   */
  #renderCell(renderingContext: RenderingContext) {
    const { ctx, cell, style, top, left, width, height } = renderingContext
    const hooks = this.#pluginHooks
    const text = this.getCellTextFormatted(cell)

    // without style hooks, the default style of the area is used as it is
    let resolvedStyle: Readonly<CellStyle> = renderingContext.defaultStyle
    if (hooks.cellStyle.length) {
      copyCellStyle(style, resolvedStyle)
      for (const plugin of hooks.cellStyle) {
        plugin.cellStyle(cell, style)
      }
      resolvedStyle = style
    }
    const hasRenderHooks = hooks.renderCellBackground.length || hooks.renderCellContent.length
    const context: CellRenderContext | undefined = hasRenderHooks
      ? { ctx, cell, style: resolvedStyle, text, width, height }
      : undefined

    setTransform(this.#state.viewport, ctx, left, top)
    ctx.fillStyle = resolvedStyle.backgroundColor
    ctx.fillRect(0, 0, width, height)
    if (context) {
      for (const plugin of hooks.renderCellBackground) {
        plugin.renderCellBackground(context)
      }
    }

    if (text) {
      const { font, textAlign, verticalAlign, paddingX, paddingY, color } = resolvedStyle
      // only bottom alignment needs the height of all lines to place the first one
      const linesHeight = verticalAlign === 'bottom' ? font.getLinesHeight(getLinesCount(text)) : 0
      renderCellText({
        ctx,
        text,
        x: getTextX(textAlign, width, paddingX),
        y: getTextY(verticalAlign, height, paddingY, font.fontHeight, linesHeight),
        font,
        fill: color,
        textAlign,
        verticalAlign,
      })
    }
    if (context) {
      for (const plugin of hooks.renderCellContent) {
        plugin.renderCellContent(context)
      }
    }

    renderingContext.borderColors[renderingContext.cellIndex] = resolvedStyle.borderColor
    if (resolvedStyle.borderColor !== undefined) {
      renderingContext.hasDataCellBorders = true
    }
    renderingContext.cellIndex++
  }

  /**
   * Renders the borders around the cells after all of them are rendered, so that the borders go on top of
   * content that spills outside a cell, such as long right-aligned text or a plugin's rendering.
   * Where two neighbors both have a border, the one rendered later wins: the cell to the right or below.
   */
  #renderBorders(renderingContext: RenderingContext) {
    renderingContext.cellIndex = 0 // reset render index

    if (this.#state.hasHeaderRow && this.#state.options.isRowNumberVisible) {
      this.#fillCornerContext(renderingContext)
      this.#renderCellBorder(renderingContext)
    }
    if (this.#state.hasHeaderRow && renderingContext.range.rowStart <= 0) {
      this.#forEachHeaderRow((context) => this.#renderCellBorder(context), renderingContext)
    }

    if (this.#state.options.isRowNumberVisible && renderingContext.range.columnStart <= 0) {
      this.#forEachNumberingColumn((context) => this.#renderCellBorder(context), renderingContext)
    }

    if (renderingContext.hasDataCellBorders || this.#pluginHooks.renderCellBorders.length) {
      this.#forEachDataCell((context) => this.#renderCellBorder(context), renderingContext)
    }
  }

  #renderCellBorder(renderingContext: RenderingContext) {
    const hooks = this.#pluginHooks.renderCellBorders
    const { viewport } = this.#state
    const { borderWidth } = this.#state.options
    const { ctx, cell, left, top, width, height } = renderingContext

    const borderColor = renderingContext.borderColors[renderingContext.cellIndex]
    renderingContext.cellIndex++
    if (borderColor === undefined && !hooks.length) {
      return
    }
    setTransform(viewport, ctx, left, top)
    if (borderColor !== undefined) {
      renderCellBorders(ctx, borderColor, width, height, borderWidth)
    }
    for (const plugin of hooks) {
      plugin.renderCellBorders({ ctx, cell, borderColor, width, height, borderWidth })
    }
  }

  #afterFrameRender(ctx: CanvasRenderingContext2D, visibleRange: CellsRange) {
    const hooks = this.#pluginHooks.afterFrameRender
    if (!hooks.length) {
      return
    }
    const viewport = this.#state.viewport
    const frame: FrameContext = {
      ctx,
      viewport,
      visibleRange,
      setOrigin: (x, y) => setTransform(viewport, ctx, x, y),
    }
    for (const plugin of hooks) {
      // each plugin starts at the grid origin, whatever the previous one left
      setTransform(viewport, ctx, 0, 0)
      plugin.afterFrameRender(frame)
    }
  }

  renderImmediate() {
    // the fonts and sizes come from the first layout, which the resize observer starts
    if (!this.#isInitialized) {
      return
    }
    const { elCanvas, elScroll, elScrollInner } = this.#state.options
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
    // read once: each read can make the browser lay out the page again
    const { width, height } = elScrollInner.getBoundingClientRect()
    const right = left + width
    const bottom = top + height

    this.#state.viewport = { left, top, right, bottom }

    const visibleRange: CellsRange = {
      rowStart: this.findRowIndex(this.#state.viewport.top), // first visible row index
      rowEnd: this.findRowIndex(this.#state.viewport.bottom), // last visible row index
      columnStart: this.findColumnIndex(this.#state.viewport.left), // first visible column index
      columnEnd: this.findColumnIndex(this.#state.viewport.right), // last visible column index
    }

    clearCanvas(elCanvas, ctx)

    const style = this.#createDefaultStyle()
    const renderingContext: RenderingContext = {
      ctx,
      // A start index is -1 when the viewport begins above the first data row or left of the first column.
      // The header-row and the numbering-column are rendered separately, so the cell passes start at 0.
      // It's a copy, so that afterFrameRender hooks get the visible range unchanged.
      range: {
        ...visibleRange,
        rowStart: Math.max(0, visibleRange.rowStart),
        columnStart: Math.max(0, visibleRange.columnStart),
      },
      cell: { rowIndex: -1, columnIndex: -1 },
      borderColors: [],
      hasDataCellBorders: false,
      cellIndex: 0,
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      // the area iterators replace it before rendering any cell
      defaultStyle: style,
      style,
    }

    this.#renderCells(renderingContext)
    this.#renderBorders(renderingContext)

    setTransform(this.#state.viewport, ctx, 0, 0)
    this.#afterFrameRender(ctx, visibleRange)
  }

  render() {
    if (this.#isRendering) {
      return
    }
    this.#isRendering = true
    this.#animationFrameId = requestAnimationFrame(() => {
      this.#isRendering = false
      this.renderImmediate()
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
