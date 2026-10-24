import type { FastSheets } from 'lib/core/FastSheets.ts'
import type { Cell, RenderCellBackgroundOptions, RenderCellTextOptions } from 'lib/core/types.ts'

export type OptionalHook =
  | 'render'
  | 'getCellBackgroundColor'
  | 'getColumnHeadingBackgroundColor'
  | 'getRowHeadingBackgroundColor'
  | 'renderCellBackground'
  | 'renderCellText'

export type PluginWithHook<Hook extends OptionalHook> = FastSheetsPlugin &
  Required<Pick<FastSheetsPlugin, Hook>>

export interface PluginHooks {
  readonly render: readonly PluginWithHook<'render'>[]
  readonly getCellBackgroundColor: readonly PluginWithHook<'getCellBackgroundColor'>[]
  readonly getColumnHeadingBackgroundColor: readonly PluginWithHook<'getColumnHeadingBackgroundColor'>[]
  readonly getRowHeadingBackgroundColor: readonly PluginWithHook<'getRowHeadingBackgroundColor'>[]
  readonly renderCellBackground: readonly PluginWithHook<'renderCellBackground'>[]
  readonly renderCellText: readonly PluginWithHook<'renderCellText'>[]
}

export interface FastSheetsPlugin {
  name: string
  setup(instance: FastSheets): void
  render?(): void
  getCellBackgroundColor?(cell: Cell, backgroundColor: string): string
  /** The background of a column name in the header row */
  getColumnHeadingBackgroundColor?(columnIndex: number, backgroundColor: string): string
  /** The background of a row number in the numbering column */
  getRowHeadingBackgroundColor?(rowIndex: number, backgroundColor: string): string
  renderCellBackground?(options: RenderCellBackgroundOptions): void
  renderCellText?(options: RenderCellTextOptions): void
  destroy(): void
}

const filterPluginsByHook = <Hook extends OptionalHook>(
  plugins: readonly FastSheetsPlugin[],
  hook: Hook,
): PluginWithHook<Hook>[] =>
  plugins.filter((plugin): plugin is PluginWithHook<Hook> => typeof plugin[hook] === 'function')

export const createPluginHooks = (plugins: readonly FastSheetsPlugin[]): PluginHooks => ({
  render: filterPluginsByHook(plugins, 'render'),
  getCellBackgroundColor: filterPluginsByHook(plugins, 'getCellBackgroundColor'),
  getColumnHeadingBackgroundColor: filterPluginsByHook(plugins, 'getColumnHeadingBackgroundColor'),
  getRowHeadingBackgroundColor: filterPluginsByHook(plugins, 'getRowHeadingBackgroundColor'),
  renderCellBackground: filterPluginsByHook(plugins, 'renderCellBackground'),
  renderCellText: filterPluginsByHook(plugins, 'renderCellText'),
})
