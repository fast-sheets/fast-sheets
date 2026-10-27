import type { FastSheets } from 'lib/core/FastSheets.ts'
import type {
  BorderRenderContext,
  Cell,
  CellRenderContext,
  CellStyle,
  FrameContext,
  GridEvent,
} from 'lib/core/types.ts'

/**
 * Hooks run in the order that plugins were registered with `use`, so a later plugin sits on top:
 * it overrides the results of earlier plugins and renders over them.
 * Hooks marked "top first" run in reverse order, so the top plugin gets the event first and can stop it.
 */
export interface FastSheetsPlugin {
  readonly name: string

  // Lifecycle
  setup(instance: FastSheets): void
  /** Removes the plugin's elements and listeners, and calls `instance.unregister(name)`. */
  destroy(): void
  /** Runs after sizes and offsets are calculated: on init, on resize, and when an edit changes row heights. */
  afterLayout?(): void
  /** Runs on every scroll of the grid before the next frame is rendered. */
  onScroll?(e: Event): void

  // Layout: runs when sizes are calculated, never once per frame
  getColumnWidth?(columnIndex: number, width: number): number
  getRowHeight?(rowIndex: number, height: number): number
  getHeaderRowHeight?(height: number): number
  getNumberingColumnWidth?(width: number): number

  // Content and style: runs for every visible cell in every frame
  /** Returns the text to render. The value in `data` stays unchanged for editing and copying. */
  formatCellText?(cell: Readonly<Cell>, text: string): string
  cellStyle?(cell: Readonly<Cell>, style: CellStyle): void

  // Rendering
  renderCellBackground?(context: CellRenderContext): void
  renderCellContent?(context: CellRenderContext): void
  /** Runs in a separate pass after all cells are rendered, so that borders go on top of content that spills outside a cell. */
  renderCellBorders?(context: BorderRenderContext): void
  /** Renders on top of the whole grid. */
  afterFrameRender?(frame: FrameContext): void

  // Input: top first. Mouse events come from the mouse and from the browser's emulation after a touch.
  onMouseDown?(e: GridEvent<MouseEvent>): void
  onMouseMove?(e: GridEvent<MouseEvent>): void
  onMouseUp?(e: GridEvent<MouseEvent>): void
  onDoubleClick?(e: GridEvent<MouseEvent>): void
  onPointerDown?(e: GridEvent<PointerEvent>): void
  onPointerUp?(e: GridEvent<PointerEvent>): void
  onPointerCancel?(e: GridEvent<PointerEvent>): void
  onKeyDown?(e: GridEvent<KeyboardEvent>): void
  onKeyUp?(e: GridEvent<KeyboardEvent>): void
}

/** Hooks that run from the first registered plugin to the last. */
const BOTTOM_FIRST_HOOKS = [
  'afterLayout',
  'onScroll',
  'getColumnWidth',
  'getRowHeight',
  'getHeaderRowHeight',
  'getNumberingColumnWidth',
  'formatCellText',
  'cellStyle',
  'renderCellBackground',
  'renderCellContent',
  'renderCellBorders',
  'afterFrameRender',
] as const

/** Hooks that run from the last registered plugin to the first, so the top plugin can stop the others. */
const TOP_FIRST_HOOKS = [
  'onMouseDown',
  'onMouseMove',
  'onMouseUp',
  'onDoubleClick',
  'onPointerDown',
  'onPointerUp',
  'onPointerCancel',
  'onKeyDown',
  'onKeyUp',
] as const

export type OptionalHook = (typeof BOTTOM_FIRST_HOOKS)[number] | (typeof TOP_FIRST_HOOKS)[number]

/** Hooks that change sizes, so registering or removing a plugin with one of them needs a new layout. */
const LAYOUT_HOOKS = [
  'getColumnWidth',
  'getRowHeight',
  'getHeaderRowHeight',
  'getNumberingColumnWidth',
] as const satisfies readonly OptionalHook[]

export type PluginWithHook<Hook extends OptionalHook> = FastSheetsPlugin &
  Required<Pick<FastSheetsPlugin, Hook>>

/** The plugins that have each hook, in the order the hook runs. */
export type PluginHooks = {
  readonly [Hook in OptionalHook]: readonly PluginWithHook<Hook>[]
}

const filterPluginsByHook = <Hook extends OptionalHook>(
  plugins: readonly FastSheetsPlugin[],
  hook: Hook,
): PluginWithHook<Hook>[] =>
  plugins.filter((plugin): plugin is PluginWithHook<Hook> => typeof plugin[hook] === 'function')

/** Groups the plugins by hook. `plugins` must be in registration order. */
export const createPluginHooks = (plugins: readonly FastSheetsPlugin[]): PluginHooks => {
  const hooks: Partial<Record<OptionalHook, FastSheetsPlugin[]>> = {}
  for (const hook of BOTTOM_FIRST_HOOKS) {
    hooks[hook] = filterPluginsByHook(plugins, hook)
  }
  for (const hook of TOP_FIRST_HOOKS) {
    hooks[hook] = filterPluginsByHook(plugins, hook).reverse()
  }
  return hooks as PluginHooks
}

/** Whether the plugin changes sizes. */
export const hasLayoutHooks = (plugin: FastSheetsPlugin) =>
  LAYOUT_HOOKS.some((hook) => typeof plugin[hook] === 'function')

/** Wraps a DOM event for plugins so that a plugin can stop the ones below it. */
export const createGridEvent = <E extends Event>(native: E): GridEvent<E> => {
  const event = {
    native,
    isStopped: false,
    stop() {
      event.isStopped = true
    },
  }
  return event
}

/** Calls the plugins in order until one of them stops the event. */
export const dispatchToPlugins = <Plugin>(
  plugins: readonly Plugin[],
  event: GridEvent,
  call: (plugin: Plugin) => void,
) => {
  for (const plugin of plugins) {
    call(plugin)
    if (event.isStopped) {
      return
    }
  }
}
