import { roundToPixels } from 'lib/core/utils/round-to-pixels.ts'
import {
  COLUMN_HEADING_FONT,
  DEFAULT_FONT,
  DEFAULT_FONT_HEIGHT,
  DEFAULT_LINE_SPACING,
  DEFAULT_PADDING,
  ROW_HEADING_FONT,
} from 'lib/core/constants.ts'
import type { Cell, CellsMap, CellsRange } from 'lib/core/types.ts'
import { clearCanvas, getContext, getCanvasSize, setTransform } from 'lib/core/utils/canvas.ts'
import { getCellInfo, getCellKey } from 'lib/core/utils/cell.ts'
import type { StateInstance } from 'lib/core/State.ts'
import { Font } from 'lib/core/Font.ts'

export class Renderer {
  private readonly state: StateInstance
  private isRendering = false
  private fonts: { [fontName: string]: Font } = {}

  constructor(state: StateInstance) {
    this.state = state
  }

  public init() {
    const {
      elCanvas,
      elScrollInner,
      elCanvasContainer,
      elScrollPaneX,
      elScrollPaneY,
      columns,
      data,
      borderWidth,
      isRowNumberVisible,
    } = this.state.options
    const ctx = getContext(elCanvas)
    if (!ctx) {
      return
    }
    const containerWidth = elScrollInner.offsetWidth - 1

    this.state.canvasSize = getCanvasSize(elCanvasContainer)
    elCanvas.style.width = this.state.canvasSize.width
    elCanvas.style.height = this.state.canvasSize.height

    this.initFonts(ctx)

    if (isRowNumberVisible && columns.length && !columns[0]?.isRowsNumbers) {
      columns.unshift({
        width: 50,
        isRowsNumbers: true,
      })
    }

    this.state.hasColumnNames = !!columns.find((column) => !!column.name)
    // if (this.state.hasColumnNames && rows[0]?.id !== 'columnsNames') {
    //   rows.unshift({
    //     id: 'columnsNames',
    //     height: 20,
    //   })
    // }

    const rowsLength = data.length
    const horizontalBordersCount = rowsLength - 1
    const verticalBordersCount = columns.length - 1
    this.state.rowHeights = data.map((row, i) => {
      let rowIndex: number
      if (this.state.hasColumnNames) {
        // we will skip the row if it has column names
        rowIndex = i === 0 ? -1 : i - 1
      } else {
        rowIndex = i
      }
      const cellsTexts: string[] = this.state.options.data[rowIndex] || []
      const linesLength = cellsTexts
        .map((cellText) => cellText.split('\n').length)
        .filter((value) => value)
      const maxLinesInRow = linesLength.length ? Math.max(...linesLength) : 1
      const fontHeight = this.fonts[DEFAULT_FONT]?.fontHeight || DEFAULT_FONT_HEIGHT
      const lineSpacing = roundToPixels(DEFAULT_LINE_SPACING, window.devicePixelRatio)
      const linesHeight = this.getLinesHeight(maxLinesInRow, fontHeight, lineSpacing)
      return linesHeight + DEFAULT_PADDING.y * 2
    })
    const columnsWithSizeTotalWidth = columns.reduce(
      (total, { width }) => total + (width ? width + borderWidth : 0),
      0,
    )
    const columnsWithoutWidthLength = columns.filter((column) => !column.width).length
    const columnWithAutoWidth = Math.max(
      50,
      Math.floor((containerWidth - columnsWithSizeTotalWidth) / columnsWithoutWidthLength),
    )
    this.state.columnWidths = columns.map((column) => column.width || columnWithAutoWidth)

    this.state.totalWidth =
      this.state.columnWidths.reduce((a, b) => a + b, 0) + verticalBordersCount * borderWidth
    this.state.totalHeight =
      this.state.rowHeights.reduce((a, b) => a + b, 0) + horizontalBordersCount * borderWidth

    this.state.horizontalOffsets = this.calculateOffsets(this.state.columnWidths)
    this.state.verticalOffsets = this.calculateOffsets(this.state.rowHeights)

    this.state.totalSize = {
      width: this.state.horizontalOffsets[this.state.horizontalOffsets.length - 1] || 0,
      height: this.state.verticalOffsets[this.state.verticalOffsets.length - 1] || 0,
    }

    this.state.containerSize = {
      width: elCanvasContainer.getBoundingClientRect().width,
      height: elCanvasContainer.getBoundingClientRect().height,
    }

    elScrollPaneX.style.width = `${this.state.totalWidth}px`
    elScrollPaneY.style.height = `${this.state.totalHeight}px`
  }

  public initFonts(ctx: CanvasRenderingContext2D) {
    this.fonts[DEFAULT_FONT] = new Font(DEFAULT_FONT, ctx)
    this.fonts[ROW_HEADING_FONT] = new Font(ROW_HEADING_FONT, ctx)
  }

  public calculateOffsets(widthsOrHeights: number[]) {
    return widthsOrHeights.slice(0, -1).reduce(
      (offsets, width, index) => {
        // we will calculate an offset for the next item
        const currentOffset = offsets[index] || 0
        const nextOffset = currentOffset + width + this.state.options.borderWidth
        offsets.push(nextOffset)
        return offsets
      },
      [0], // first element has offset = 0
    )
  }

  public findColumnIndex = (offsetX: number) =>
    this.state.horizontalOffsets.findLastIndex((offset) => offset <= offsetX)

  public findRowIndex = (offsetY: number) =>
    this.state.verticalOffsets.findLastIndex((offset) => offset <= offsetY)

  public findCellByMouseEvent(e: MouseEvent) {
    const { elScrollInner } = this.state.options
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

    const cell: Cell = { columnIndex, rowIndex }
    const key = getCellKey(cell)

    return this.state.visibleCells[key]
  }

  public prepareCells(range: CellsRange): CellsMap {
    const visibleRowsLength = range.rowEnd - range.rowStart + 1
    const visibleColumnsLength = range.columnEnd - range.columnStart + 1

    const cells: CellsMap = {}

    Array.from({ length: visibleRowsLength }).forEach((_, i) => {
      const rowIndex = i + range.rowStart
      Array.from({ length: visibleColumnsLength }).forEach((_, j) => {
        const columnIndex = j + range.columnStart
        const cell: Cell = {
          rowIndex,
          columnIndex,
        }
        cells[getCellKey(cell)] = cell
      })
    })

    return cells
  }

  public getLinesHeight(linesLength: number, fontHeight: number, lineSpacing: number) {
    return linesLength * (fontHeight + lineSpacing) - lineSpacing
  }

  public renderCellText({
    ctx,
    text,
    x,
    y,
    font,
    fill = '#000',
    textAlign = 'left',
    verticalAlign = 'middle',
  }: {
    ctx: CanvasRenderingContext2D
    text: string
    x: number
    y: number
    font?: InstanceType<typeof Font>
    fill?: string
    textAlign: CanvasTextAlign
    verticalAlign: 'top' | 'middle' | 'bottom'
  }) {
    const lineSpacing = roundToPixels(DEFAULT_LINE_SPACING, window.devicePixelRatio)
    const fontHeight = roundToPixels(
      font?.fontHeight || DEFAULT_FONT_HEIGHT,
      window.devicePixelRatio,
    )
    const lines = text.split('\n')
    ctx.font = font?.font || DEFAULT_FONT
    ctx.fillStyle = fill
    ctx.textAlign = textAlign

    // make sure that values are rounded using devicePixelRatio
    const textX = roundToPixels(x, window.devicePixelRatio)
    let textY: number
    if (verticalAlign === 'middle') {
      const linesHeight = this.getLinesHeight(lines.length, fontHeight, lineSpacing)
      textY = y + fontHeight - linesHeight * 0.5 // align text top to the center of a cell, and then lift text up on its half height
    } else {
      textY = y
    }
    textY = roundToPixels(textY, window.devicePixelRatio)

    ctx.save()
    lines.forEach((line, i) => {
      ctx.fillText(line, textX, textY + i * (fontHeight + lineSpacing))
    })
    ctx.restore()
  }

  public renderCell(ctx: CanvasRenderingContext2D, cell: Cell, fillStyle = '#fff') {
    const cellInfo = getCellInfo({ cell, state: this.state })
    setTransform(this.state.viewport, ctx, cellInfo.left, cellInfo.top)

    if (cellInfo.isRowNumber || cellInfo.isColumnName) {
      ctx.fillStyle = '#ccc'
      ctx.fillRect(0, 0, cellInfo.width + 1, cellInfo.height + 1)
    }

    ctx.fillStyle = fillStyle
    ctx.fillRect(0, 0, cellInfo.width, cellInfo.height)

    if (cellInfo.text) {
      if (cellInfo.isRowNumber) {
        const font = this.fonts[ROW_HEADING_FONT]
        this.renderCellText({
          ctx,
          text: cellInfo.text,
          x: cellInfo.center.x,
          y: cellInfo.center.y,
          font,
          textAlign: 'center',
          verticalAlign: 'middle',
        })
      } else if (cellInfo.isColumnName) {
        const font = this.fonts[COLUMN_HEADING_FONT]
        this.renderCellText({
          ctx,
          text: cellInfo.text,
          x: cellInfo.padding.x,
          y: cellInfo.center.y,
          font,
          textAlign: 'left',
          verticalAlign: 'middle',
        })
      } else {
        const font = this.fonts[DEFAULT_FONT]
        this.renderCellText({
          ctx,
          text: cellInfo.text,
          x: cellInfo.padding.x,
          y: cellInfo.center.y,
          font,
          textAlign: 'left',
          verticalAlign: 'middle',
        })
      }
    }
  }

  public renderCells(ctx: CanvasRenderingContext2D, cells: CellsMap) {
    Object.values(cells).forEach((cell) => {
      this.renderCell(ctx, cell)
    })
    setTransform(this.state.viewport, ctx, 0, 0)
  }

  public renderImmediate() {
    const { elCanvas, elScroll } = this.state.options
    const ctx = getContext(elCanvas)
    if (!ctx) {
      return
    }

    elCanvas.width = this.state.canvasSize.widthWithPixelRatio
    elCanvas.height = this.state.canvasSize.heightWithPixelRatio

    const left = elScroll.scrollLeft || 0
    const top = elScroll.scrollTop || 0
    const right = left + this.state.containerSize.width
    const bottom = top + this.state.containerSize.height
    this.state.viewport = { left, top, right, bottom }

    const visibleRange: CellsRange = {
      rowStart: this.findRowIndex(this.state.viewport.top), // first visible row index
      rowEnd: this.findRowIndex(this.state.viewport.bottom), // last visible row index
      columnStart: this.findColumnIndex(this.state.viewport.left), // first visible column index
      columnEnd: this.findColumnIndex(this.state.viewport.right), // last visible column index
    }

    clearCanvas(elCanvas, ctx)

    this.state.visibleCells = this.prepareCells(visibleRange)
    this.renderCells(ctx, this.state.visibleCells)
  }

  public render() {
    if (this.isRendering) {
      return
    }
    this.isRendering = true
    requestAnimationFrame(() => {
      this.isRendering = false
      this.renderImmediate()

      Object.values(this.state.plugins).forEach((plugin) => {
        plugin.render()
      })
    })
  }
}
