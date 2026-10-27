import type { Font } from 'lib/core/Font.ts'

export type Data = string[][]

export interface Padding {
  x: number
  y: number
}

export interface Coordinate {
  x: number
  y: number
}

export interface Column {
  name?: string
  width?: number
  minWidth?: number
}

/**
 * A cell of the grid.
 * A column-heading has rowIndex -1, a row-numbering cell has columnIndex -1, and the corner between them has both -1.
 * See `isColumnHeading`, `isRowNumbering`, `isCornerCell` and `isDataCell` in `lib/core/utils/cell.ts`.
 */
export interface Cell {
  rowIndex: number
  columnIndex: number
}

export interface CellInfo {
  cell: Cell
  top: number
  left: number
  width: number
  height: number
  text: string
  padding: Padding
  center: Coordinate
  font: string
}

export interface DomRect {
  top: number
  left: number
  width: number
  height: number
}

export interface CellsRange {
  columnStart: number
  rowStart: number
  columnEnd: number
  rowEnd: number
}

export interface CellsRangeWithPivot extends CellsRange {
  rowPivot: number
  columnPivot: number
}

export interface ModifiedCell {
  rowIndex: number
  columnIndex: number
  value: string
}

export interface RawOptions {
  elContainer: HTMLElement
  elCanvasContainer?: HTMLElement
  elCanvas?: HTMLCanvasElement
  elScroll?: HTMLElement
  elScrollInner?: HTMLElement
  elScrollPaneX?: HTMLElement
  elScrollPaneY?: HTMLElement
  data: Data
  borderWidth?: number
  columns?: Column[]
  isRowNumberVisible?: boolean
}

export interface Options extends RawOptions {
  elCanvas: HTMLCanvasElement
  elCanvasContainer: HTMLElement
  elScroll: HTMLElement
  elScrollInner: HTMLElement
  elScrollPaneX: HTMLElement
  elScrollPaneY: HTMLElement
  borderWidth: number
  columns: Column[]
}

export interface CanvasSize {
  widthWithPixelRatio: number
  heightWithPixelRatio: number
  width: number
  height: number
}

export interface Viewport {
  top: number
  left: number
  right: number
  bottom: number
}

export interface RenderCellTextOptions {
  ctx: CanvasRenderingContext2D
  text: string
  x: number
  y: number
  font: Font
  fill?: string
  textAlign: CanvasTextAlign
  verticalAlign: 'top' | 'middle' | 'bottom'
}

export interface CellStyle {
  backgroundColor: string
  borderColor?: string
  font: Font
  color: string
  textAlign: CanvasTextAlign
  verticalAlign: 'top' | 'middle' | 'bottom'
  paddingX: number
  paddingY: number
}

/**
 * Cells and contexts passed to the style and rendering hooks are valid only during the call,
 * because the core may reuse them for other cells.
 */
export interface CellRenderContext {
  readonly ctx: CanvasRenderingContext2D
  readonly cell: Readonly<Cell>
  readonly style: Readonly<CellStyle>
  readonly text: string
  readonly width: number
  readonly height: number
}

export interface BorderRenderContext {
  readonly ctx: CanvasRenderingContext2D
  readonly cell: Readonly<Cell>
  readonly borderColor?: string
  readonly width: number
  readonly height: number
  readonly borderWidth: number
}

export interface FrameContext {
  readonly ctx: CanvasRenderingContext2D
  readonly viewport: Readonly<Viewport>
  readonly visibleRange: Readonly<CellsRange>
  /** Sets the transform so that 0,0 is the given point in grid coordinates. */
  setOrigin(x: number, y: number): void
}

/**
 * A DOM event wrapped for the input hooks, so that a plugin can stop the plugins below it.
 * To find the cell under a mouse or pointer event, call `instance.layout.findCellAtPoint(e.native.clientX, e.native.clientY)`.
 */
export interface GridEvent<E extends Event = Event> {
  readonly native: E
  /** Whether a plugin called `stop()`. */
  readonly isStopped: boolean
  /** Stops the plugins below this one (the ones registered before it) from getting the event. */
  stop(): void
}
