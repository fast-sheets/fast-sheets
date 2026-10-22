import type { FastSheetsPlugin } from 'lib/core/types.ts'

type OptionalHook = 'render' | 'getCellBackgroundColor' | 'renderCellBackground' | 'renderCellText'

/** a plugin that has the given hook */
export type PluginWithHook<Hook extends OptionalHook> = FastSheetsPlugin &
  Required<Pick<FastSheetsPlugin, Hook>>

/** The registered plugins, and for each optional hook the plugins that have it, in registration order. */
export interface PluginHooks {
  readonly all: readonly FastSheetsPlugin[]
  readonly render: readonly PluginWithHook<'render'>[]
  readonly getCellBackgroundColor: readonly PluginWithHook<'getCellBackgroundColor'>[]
  readonly renderCellBackground: readonly PluginWithHook<'renderCellBackground'>[]
  readonly renderCellText: readonly PluginWithHook<'renderCellText'>[]
}

const filterPluginsByHook = <Hook extends OptionalHook>(
  plugins: readonly FastSheetsPlugin[],
  hook: Hook,
): PluginWithHook<Hook>[] =>
  plugins.filter((plugin): plugin is PluginWithHook<Hook> => typeof plugin[hook] === 'function')

/**
 * Groups plugins by hook, so the renderer reads ready arrays on every frame and every cell
 * instead of collecting the plugins and checking their hooks each time.
 * Built again whenever a plugin is added or removed; the arrays are never changed in place,
 * so a frame that is being drawn keeps the plugins it started with.
 */
export const createPluginHooks = (plugins: readonly FastSheetsPlugin[]): PluginHooks => ({
  all: plugins,
  render: filterPluginsByHook(plugins, 'render'),
  getCellBackgroundColor: filterPluginsByHook(plugins, 'getCellBackgroundColor'),
  renderCellBackground: filterPluginsByHook(plugins, 'renderCellBackground'),
  renderCellText: filterPluginsByHook(plugins, 'renderCellText'),
})
