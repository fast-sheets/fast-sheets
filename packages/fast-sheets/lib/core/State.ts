import type { CanvasSize, Options, Size } from 'lib/core/types.ts'

export class State {
  options!: Options

  horizontalOffsets: number[] = []
  verticalOffsets: number[] = []
  totalWidth = 0
  totalHeight = 0
  rowHeights: number[] = []
  columnWidths: number[] = []
  hasHeaderRow: boolean = false
  headerRowHeight = 0
  numberingColumnWidth = 0 // column with row numbers
  canvasSize: CanvasSize = {
    widthWithPixelRatio: 0,
    heightWithPixelRatio: 0,
    width: '0',
    height: '0',
  }
  containerSize: Size = {
    width: 0,
    height: 0,
  }

  viewport = {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }
}

export type StateInstance = InstanceType<typeof State>
