import type { CanvasSize, FastSheetsPlugin, Options, Size } from 'lib/core/types.ts'
import { createPluginHooks, type PluginHooks } from 'lib/core/utils/plugins.ts'

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
  public hasHeaderRow: boolean = false
  public headerRowHeight = 0
  public numberingColumnWidth = 0 // column with row numbers
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
  /** the registered plugins by name; change them only with `FastSheets.use` and `unuse` */
  public plugins: { readonly [pluginName: string]: FastSheetsPlugin } = {}
  /** `plugins` grouped by hook for the renderer; built again by `FastSheets.use` and `unuse` */
  public pluginHooks: PluginHooks = createPluginHooks([])
}

export type StateInstance = InstanceType<typeof State>
