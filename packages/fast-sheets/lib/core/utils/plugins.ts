import type {
  Cell,
  FastSheetsInstance,
  RenderCellBackgroundOptions,
  RenderCellTextOptions,
} from 'lib/core'

export type OptionalHook =
  | 'render'
  | 'getCellBackgroundColor'
  | 'renderCellBackground'
  | 'renderCellText'

export type PluginWithHook<Hook extends OptionalHook> = FastSheetsPlugin &
  Required<Pick<FastSheetsPlugin, Hook>>

export interface PluginHooks {
  readonly render: readonly PluginWithHook<'render'>[]
  readonly getCellBackgroundColor: readonly PluginWithHook<'getCellBackgroundColor'>[]
  readonly renderCellBackground: readonly PluginWithHook<'renderCellBackground'>[]
  readonly renderCellText: readonly PluginWithHook<'renderCellText'>[]
}

export interface FastSheetsPlugin {
  name: string
  setup(instance: FastSheetsInstance): void
  render?(): void
  getCellBackgroundColor?(cell: Cell, backgroundColor: string): string
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
  renderCellBackground: filterPluginsByHook(plugins, 'renderCellBackground'),
  renderCellText: filterPluginsByHook(plugins, 'renderCellText'),
})
