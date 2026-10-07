import type { CanvasSize, CellsMap, FastSheetsPlugin, Options, Size } from 'lib/core/types.ts'

export class State {
  public options!: Options

  public totalSize: Size = {
    width: 0,
    height: 0,
  }
  public horizontalOffsets: number[] = []
  public verticalOffsets: number[] = []
  public totalWidth = 0
  public totalHeight = 0
  public rowHeights: number[] = []
  public columnWidths: number[] = []
  public hasColumnNames: boolean = false
  public canvasSize: CanvasSize = {
    widthWithPixelRatio: 0,
    heightWithPixelRatio: 0,
    width: '0',
    height: '0',
  }
  public containerSize: Size = {
    width: 0,
    height: 0,
  }

  public viewport = {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }
  public visibleCells: CellsMap = {}

  public plugins: { [pluginName: string]: FastSheetsPlugin } = {}
}

export type StateInstance = InstanceType<typeof State>
