import type { ModifiedCell, RawOptions } from 'lib/core/types.ts'
import { Layout } from 'lib/core/Layout.ts'
import { Renderer } from 'lib/core/Renderer.ts'
import { State } from 'lib/core/State.ts'
import { markAsCreatedByPackage, removeCreatedByPackage } from 'lib/core/utils/dom.ts'
import { mergeOptions } from 'lib/core/utils/options.ts'
import {
  createGridEvent,
  createPluginHooks,
  dispatchToPlugins,
  hasLayoutHooks,
  type FastSheetsPlugin,
  type PluginHooks,
} from 'lib/core/utils/plugins.ts'
import {
  clampInsertion,
  clampRemoval,
  insertColumn,
  insertRow,
  isValidIndexAndCount,
  removeColumn,
  removeRow,
} from 'lib/core/utils/rows-and-columns.ts'

const DEFAULT_OPTIONS = {
  borderWidth: 1,
  isRowNumberVisible: false,
}

export class FastSheets {
  state: State
  layout: Layout
  renderer: Renderer

  /** The registered plugins by name, in registration order. Changed only by `use` and `unregister`. */
  readonly #plugins = new Map<string, FastSheetsPlugin>()
  /** The registered plugins grouped by hook. Replaced whenever a plugin is added or removed. */
  #hooks: PluginHooks = createPluginHooks([])

  readonly #resizeObserver: ResizeObserver

  constructor(options: RawOptions) {
    const elContainer = options.elContainer
    let elCanvasContainer = options.elCanvasContainer
    let elCanvas = options.elCanvas
    let elScroll = options.elScroll
    let elScrollInner = options.elScrollInner
    let elScrollPaneX = options.elScrollPaneX
    let elScrollPaneY = options.elScrollPaneY

    elContainer.style.position = 'relative'
    elContainer.style.display = 'flex'
    elContainer.style.overflow = 'hidden'
    elContainer.style.outline = 'none'
    elContainer.tabIndex = 0

    if (!elCanvasContainer) {
      elCanvasContainer = document.createElement('div')
      elContainer.appendChild(elCanvasContainer)
      elCanvasContainer.setAttribute('data-name', 'elCanvasContainer')
      elCanvasContainer.style.position = 'relative'
      elCanvasContainer.style.flexGrow = '1'
      markAsCreatedByPackage(elCanvasContainer)
    }

    if (!elCanvas) {
      elCanvas = document.createElement('canvas')
      elCanvasContainer.appendChild(elCanvas)
      elCanvas.setAttribute('data-name', 'elCanvas')
      elCanvas.style.position = 'absolute'
      elCanvas.style.top = '0'
      elCanvas.style.left = '0'
      markAsCreatedByPackage(elCanvas)
    }

    if (!elScroll) {
      elScroll = document.createElement('div')
      elContainer.appendChild(elScroll)
      elScroll.setAttribute('data-name', 'elScroll')
      elScroll.style.position = 'absolute'
      elScroll.style.width = '100%'
      elScroll.style.height = '100%'
      elScroll.style.overflowY = 'scroll'
      elScroll.style.overflowX = 'auto'
      elScroll.style.flexShrink = '0'
      elScroll.style.overscrollBehavior = 'none'
      markAsCreatedByPackage(elScroll)
    }

    if (!elScrollInner) {
      elScrollInner = document.createElement('div')
      elScroll.appendChild(elScrollInner)
      elScrollInner.setAttribute('data-name', 'elScrollInner')
      elScrollInner.style.position = 'absolute'
      elScrollInner.style.width = '100%'
      elScrollInner.style.height = '100%'
      markAsCreatedByPackage(elScrollInner)
    }

    if (!elScrollPaneX) {
      elScrollPaneX = document.createElement('div')
      elScroll.appendChild(elScrollPaneX)
      elScrollPaneX.setAttribute('data-name', 'elScrollPaneX')
      elScrollPaneX.style.height = '1px'
      markAsCreatedByPackage(elScrollPaneX)
    }

    if (!elScrollPaneY) {
      elScrollPaneY = document.createElement('div')
      elScroll.appendChild(elScrollPaneY)
      elScrollPaneY.setAttribute('data-name', 'elScrollPaneY')
      elScrollPaneY.style.width = '1px'
      markAsCreatedByPackage(elScrollPaneY)
    }

    const columns = options.columns || options.data[0]?.map(() => ({ width: 100 })) || []

    this.state = new State()
    this.state.options = {
      ...mergeOptions(DEFAULT_OPTIONS, options),
      elCanvasContainer,
      elCanvas,
      elScroll,
      elScrollInner,
      elScrollPaneX,
      elScrollPaneY,
      columns,
    }
    this.layout = new Layout(this.state)
    this.renderer = new Renderer(this.state, this.layout)

    this.#resizeObserver = new ResizeObserver(() => {
      this.#onResize()
    })

    this.#bindEvents()
  }

  destroy() {
    this.#unbindEvents()
    // a copy, because each plugin removes itself from the map
    for (const plugin of [...this.#plugins.values()]) {
      try {
        plugin.destroy()
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Error destroying plugin ${plugin.name}:`, err)
      }
    }
    this.renderer.destroy()
    removeCreatedByPackage(this.state.options.elScrollPaneX)
    removeCreatedByPackage(this.state.options.elScrollPaneY)
    removeCreatedByPackage(this.state.options.elScrollInner)
    removeCreatedByPackage(this.state.options.elScroll)
    removeCreatedByPackage(this.state.options.elCanvas)
    removeCreatedByPackage(this.state.options.elCanvasContainer)
  }

  /**
   * Registers a plugin.
   * Plugins run in registration order.
   */
  use(plugin: FastSheetsPlugin) {
    if (this.hasPlugin(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`)
    }

    this.#plugins.set(plugin.name, plugin)
    this.#updateHooks()
    try {
      plugin.setup(this)
    } catch (err) {
      this.#plugins.delete(plugin.name)
      this.#updateHooks()
      throw err
    }
    if (hasLayoutHooks(plugin) && this.layout.isInitialized) {
      this.layout.init()
      this.renderer.render()
    }
  }

  /**
   * Unregisters a plugin and repaints without it.
   * Called by the plugin's `destroy()`.
   **/
  unregister(pluginName: string) {
    const plugin = this.#plugins.get(pluginName)
    if (!plugin) {
      return
    }
    this.#plugins.delete(pluginName)
    this.#updateHooks()
    if (hasLayoutHooks(plugin) && this.layout.isInitialized) {
      this.layout.init()
    }
    this.renderer.render()
  }

  /** Whether a plugin with this name is registered. */
  hasPlugin(pluginName: string) {
    return this.#plugins.has(pluginName)
  }

  /** Groups the plugins by hook again and gives the layout and the renderer the new groups. */
  #updateHooks() {
    this.#hooks = createPluginHooks([...this.#plugins.values()])
    this.layout.setPluginHooks(this.#hooks)
    this.renderer.setPluginHooks(this.#hooks)
  }

  /**
   * Writes modified cells to 'data', measures rows, and renders.
   */
  updateCells(changes: readonly ModifiedCell[]) {
    const { data } = this.state.options
    const rowIndexes = new Set<number>()
    for (const { rowIndex, columnIndex, value } of changes) {
      const row = data[rowIndex]
      if (row) {
        row[columnIndex] = value
        rowIndexes.add(rowIndex)
      }
    }
    if (!rowIndexes.size) {
      return
    }
    this.layout.updateRows(rowIndexes)
    this.renderer.render()
  }

  /**
   * Inserts empty rows into 'data' before the row at `index`, lays the grid out again, and renders.
   * An `index` past the last row adds the rows at the end.
   * Does nothing unless `index` and `count` are integers and `count` is positive.
   */
  insertRows(index: number, count = 1) {
    const { data, columns } = this.state.options
    if (!isValidIndexAndCount(index, count)) {
      return
    }
    const insertion = clampInsertion(index, count, data.length)
    for (let i = 0; i < insertion.count; i++) {
      insertRow(data, columns, insertion.index)
      for (const plugin of this.#hooks.afterInsertRow) {
        plugin.afterInsertRow(insertion.index)
      }
    }
    this.#layOutAgain()
  }

  /**
   * Removes rows from 'data', starting with the row at `index`, lays the grid out again, and renders.
   * Rows past the last one are skipped.
   * Does nothing unless `index` and `count` are integers and `count` is positive.
   */
  removeRows(index: number, count = 1) {
    const { data } = this.state.options
    if (!isValidIndexAndCount(index, count)) {
      return
    }
    const removal = clampRemoval(index, count, data.length)
    if (!removal.count) {
      return
    }
    for (let i = 0; i < removal.count; i++) {
      removeRow(data, removal.index)
      for (const plugin of this.#hooks.afterRemoveRow) {
        plugin.afterRemoveRow(removal.index)
      }
    }
    this.#layOutAgain()
  }

  /**
   * Inserts empty columns into 'data' and 'columns' before the column at `index`, lays the grid out again, and renders.
   * An `index` past the last column adds the columns at the end.
   * Does nothing unless `index` and `count` are integers and `count` is positive.
   * A new column copies the size of the column it's inserted before (or of the last one), without its name.
   */
  insertColumns(index: number, count = 1) {
    const { data, columns } = this.state.options
    if (!isValidIndexAndCount(index, count)) {
      return
    }
    const insertion = clampInsertion(index, count, columns.length)
    for (let i = 0; i < insertion.count; i++) {
      insertColumn(data, columns, insertion.index)
      for (const plugin of this.#hooks.afterInsertColumn) {
        plugin.afterInsertColumn(insertion.index)
      }
    }
    this.#layOutAgain()
  }

  /**
   * Removes columns from 'data' and 'columns', starting with the column at `index`, lays the grid out again, and renders.
   * Columns past the last one are skipped.
   * Does nothing unless `index` and `count` are integers and `count` is positive.
   */
  removeColumns(index: number, count = 1) {
    const { data, columns } = this.state.options
    if (!isValidIndexAndCount(index, count)) {
      return
    }
    const removal = clampRemoval(index, count, columns.length)
    if (!removal.count) {
      return
    }
    for (let i = 0; i < removal.count; i++) {
      removeColumn(data, columns, removal.index)
      for (const plugin of this.#hooks.afterRemoveColumn) {
        plugin.afterRemoveColumn(removal.index)
      }
    }
    this.#layOutAgain()
  }

  /** Calculates all sizes again after rows or columns were inserted or removed, and renders. */
  #layOutAgain() {
    if (this.layout.isInitialized) {
      this.layout.init()
    }
    this.renderer.render()
  }

  #bindEvents() {
    const { elContainer, elScroll, elCanvasContainer } = this.state.options

    /**
     * Core event listeners
     */
    elContainer.addEventListener('wheel', this.#onWheel, { passive: true })
    elScroll.addEventListener('scroll', this.#onScroll)

    /**
     * Plugins event listeners
     */
    // observables
    this.#resizeObserver.observe(elCanvasContainer)
    // mouse events
    elContainer.addEventListener('mousedown', this.#onMouseDown)
    window.addEventListener('mousemove', this.#onMouseMove)
    window.addEventListener('mouseup', this.#onMouseUp)
    elContainer.addEventListener('dblclick', this.#onDoubleClick)
    elContainer.addEventListener('contextmenu', this.#onContextMenu)
    // pointer events
    elContainer.addEventListener('pointerdown', this.#onPointerDown)
    window.addEventListener('pointerup', this.#onPointerUp)
    window.addEventListener('pointercancel', this.#onPointerCancel)
    // key events
    elContainer.addEventListener('keydown', this.#onKeyDown)
    elContainer.addEventListener('keyup', this.#onKeyUp)
  }

  #unbindEvents() {
    const { elContainer, elScroll } = this.state.options

    /**
     * Core event listeners
     */
    elContainer.removeEventListener('wheel', this.#onWheel)
    elScroll.removeEventListener('scroll', this.#onScroll)

    /**
     * Plugins event listeners
     */
    // observables
    this.#resizeObserver.disconnect()
    // mouse events
    elContainer.removeEventListener('dblclick', this.#onDoubleClick)
    elContainer.removeEventListener('contextmenu', this.#onContextMenu)
    elContainer.removeEventListener('mousedown', this.#onMouseDown)
    window.removeEventListener('mousemove', this.#onMouseMove)
    window.removeEventListener('mouseup', this.#onMouseUp)
    // pointer events
    elContainer.removeEventListener('pointerdown', this.#onPointerDown)
    window.removeEventListener('pointerup', this.#onPointerUp)
    window.removeEventListener('pointercancel', this.#onPointerCancel)
    // key events
    elContainer.removeEventListener('keydown', this.#onKeyDown)
    elContainer.removeEventListener('keyup', this.#onKeyUp)
  }

  readonly #onWheel = (e: WheelEvent) => {
    const { elScroll } = this.state.options
    if (e.target instanceof Node && elScroll.contains(e.target)) {
      return
    }
    elScroll.scrollTo({
      top: elScroll.scrollTop + e.deltaY,
      left: elScroll.scrollLeft + e.deltaX,
    })
  }

  #onResize() {
    this.layout.init()
    this.renderer.renderImmediate()
  }

  readonly #onScroll = (e: Event) => {
    for (const plugin of this.#hooks.onScroll) {
      plugin.onScroll(e)
    }
    this.renderer.render()
  }

  readonly #onMouseDown = (e: MouseEvent) => {
    const plugins = this.#hooks.onMouseDown
    if (plugins.length) {
      const event = createGridEvent(e)
      dispatchToPlugins(plugins, event, (plugin) => plugin.onMouseDown(event))
    }
  }

  readonly #onMouseMove = (e: MouseEvent) => {
    const plugins = this.#hooks.onMouseMove
    if (plugins.length) {
      const event = createGridEvent(e)
      dispatchToPlugins(plugins, event, (plugin) => plugin.onMouseMove(event))
    }
  }

  readonly #onMouseUp = (e: MouseEvent) => {
    const plugins = this.#hooks.onMouseUp
    if (plugins.length) {
      const event = createGridEvent(e)
      dispatchToPlugins(plugins, event, (plugin) => plugin.onMouseUp(event))
    }
  }

  readonly #onDoubleClick = (e: MouseEvent) => {
    const plugins = this.#hooks.onDoubleClick
    if (plugins.length) {
      const event = createGridEvent(e)
      dispatchToPlugins(plugins, event, (plugin) => plugin.onDoubleClick(event))
    }
  }

  readonly #onContextMenu = (e: MouseEvent) => {
    const plugins = this.#hooks.onContextMenu
    if (plugins.length) {
      const event = createGridEvent(e)
      dispatchToPlugins(plugins, event, (plugin) => plugin.onContextMenu(event))
    }
  }

  readonly #onPointerDown = (e: PointerEvent) => {
    const plugins = this.#hooks.onPointerDown
    if (plugins.length) {
      const event = createGridEvent(e)
      dispatchToPlugins(plugins, event, (plugin) => plugin.onPointerDown(event))
    }
  }

  readonly #onPointerUp = (e: PointerEvent) => {
    const plugins = this.#hooks.onPointerUp
    if (plugins.length) {
      const event = createGridEvent(e)
      dispatchToPlugins(plugins, event, (plugin) => plugin.onPointerUp(event))
    }
  }

  readonly #onPointerCancel = (e: PointerEvent) => {
    const plugins = this.#hooks.onPointerCancel
    if (plugins.length) {
      const event = createGridEvent(e)
      dispatchToPlugins(plugins, event, (plugin) => plugin.onPointerCancel(event))
    }
  }

  readonly #onKeyDown = (e: KeyboardEvent) => {
    const plugins = this.#hooks.onKeyDown
    if (plugins.length) {
      const event = createGridEvent(e)
      dispatchToPlugins(plugins, event, (plugin) => plugin.onKeyDown(event))
    }
  }

  readonly #onKeyUp = (e: KeyboardEvent) => {
    const plugins = this.#hooks.onKeyUp
    if (plugins.length) {
      const event = createGridEvent(e)
      dispatchToPlugins(plugins, event, (plugin) => plugin.onKeyUp(event))
    }
  }
}
