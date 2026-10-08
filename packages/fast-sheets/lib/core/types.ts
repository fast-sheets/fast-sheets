import { type FastSheets } from 'lib/core/index.ts'

export interface RawOptions {
  elContainer: HTMLElement
  elCanvasContainer?: HTMLElement
  elCanvas?: HTMLCanvasElement
  elScroll?: HTMLElement
  elScrollInner?: HTMLElement
  elScrollPaneX?: HTMLElement
  elScrollPaneY?: HTMLElement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
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

export interface Size {
  width: number
  height: number
}

export interface CanvasSize {
  widthWithPixelRatio: number
  heightWithPixelRatio: number
  width: string
  height: string
}

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
  isRowsNumbers?: boolean
}

export interface Row {
  id: string
  height: number
}

export interface Cell {
  rowIndex: number
  columnIndex: number
}

export interface CellsMap {
  [key: string]: Cell
}

export interface CellInfo {
  top: number
  left: number
  width: number
  height: number
  text: string
  padding: Padding
  center: Coordinate
  font: string
  isRowNumber: boolean
  isColumnName: boolean
}

export interface CellsRange {
  columnStart: number
  rowStart: number
  columnEnd: number
  rowEnd: number
}

export interface Viewport {
  top: number
  left: number
  right: number
  bottom: number
}

export type FastSheetsInstance = InstanceType<typeof FastSheets>

export interface FastSheetsPlugin {
  name: string
  setup(instance: FastSheetsInstance): void
  render(): void
  destroy(): void
}

export interface DomRect {
  top: number
  left: number
  width: number
  height: number
}

export interface CellsRangeWithPivot extends CellsRange {
  rowPivot: number
  columnPivot: number
}
