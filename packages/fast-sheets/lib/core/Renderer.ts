import {
  COLUMN_HEADING_FONT,
  DEFAULT_FONT,
  DEFAULT_HEADING_BORDER_COLOR,
  DEFAULT_PADDING,
  ROW_NUMBERING_FONT,
} from 'lib/core/constants.ts'
import { clearCanvas, getContext, setTransform } from 'lib/core/utils/canvas.ts'
import type { Font } from 'lib/core/Font.ts'
import type { Layout } from 'lib/core/Layout.ts'
import type { State } from 'lib/core/State.ts'
import { getTextX, getTextY, renderCellBorders, renderCellText } from 'lib/core/utils/render.ts'
import { getLinesCount } from 'lib/core/utils/string.ts'
import type {
  Cell,
  CellRenderContext,
  CellsRange,
  CellStyle,
  FrameContext,
} from 'lib/core/types.ts'
import { createPluginHooks, type PluginHooks } from 'lib/core/utils/plugins.ts'
import { getCellText } from 'lib/core/utils/cell.ts'

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
  readonly #layout: Layout
  #isRendering = false
  #animationFrameId: number | null = null
  /**
   * The registered plugins grouped by hook, read for every frame and every cell.
   * Replaced by `setPluginHooks`, never changed in place, so a frame being rendered keeps the plugins it started with.
   */
  #pluginHooks: PluginHooks = createPluginHooks([])

  constructor(state: State, layout: Layout) {
    this.#state = state
    this.#layout = layout
  }

  /** Sets the plugins to call while rendering. Called by `FastSheets` whenever a plugin is added or removed. */
  setPluginHooks(pluginHooks: PluginHooks) {
    this.#pluginHooks = pluginHooks
  }

  /**
   * Returns a font for `style.font` in a cellStyle hook, measured once and cached until the next layout.
   * Get it inside the hook rather than keeping it, because a new layout measures the fonts again.
   */
  getFont(font: string): Font {
    return this.#layout.getFont(font)
  }

  /**
   * Creates the default style of a data cell with the current fonts, changed by `overrides`.
   * The area iterators call it once per frame for the default style of their area.
   */
  #createDefaultStyle(overrides?: Partial<CellStyle>): CellStyle {
    return {
      backgroundColor: '#fff',
      font: this.#layout.getFont(DEFAULT_FONT),
      color: '#000',
      textAlign: 'left',
      verticalAlign: 'middle',
      paddingX: DEFAULT_PADDING.x,
      paddingY: DEFAULT_PADDING.y,
      ...overrides,
    }
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
      font: this.#layout.getFont(COLUMN_HEADING_FONT),
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
      font: this.#layout.getFont(ROW_NUMBERING_FONT),
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
    if (!this.#layout.isInitialized) {
      return
    }
    const { elCanvas } = this.#state.options
    const ctx = getContext(elCanvas)
    if (!ctx) {
      return
    }

    this.#layout.updateViewport()
    const visibleRange = this.#layout.getVisibleRange()

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
