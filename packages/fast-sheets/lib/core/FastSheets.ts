import type { FastSheetsPlugin, RawOptions } from 'lib/core/types.ts'
import { Renderer } from 'lib/core/Renderer.ts'
import { State } from 'lib/core/State.ts'
import { markAsCreatedByPackage, removeCreatedByPackage } from 'lib/core/utils/dom.ts'
import { createPluginHooks } from 'lib/core/utils/plugins.ts'

const DEFAULT_OPTIONS = {
  borderWidth: 1,
  isRowNumberVisible: false,
}

export class FastSheets {
  public state: InstanceType<typeof State>
  public renderer: InstanceType<typeof Renderer>

  boundWheel: (e: WheelEvent) => void
  boundRender: () => void
  resizeObserver: ResizeObserver

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
      ...DEFAULT_OPTIONS,
      ...options,
      elCanvasContainer,
      elCanvas,
      elScroll,
      elScrollInner,
      elScrollPaneX,
      elScrollPaneY,
      columns,
    }
    this.renderer = new Renderer(this.state)

    this.boundWheel = this.onWheel.bind(this)
    this.boundRender = this.renderer.render.bind(this.renderer)
    this.resizeObserver = new ResizeObserver(() => {
      this.onResize()
    })

    this.bindEvents()
  }

  public destroy() {
    this.unbindEvents()
    Object.values(this.state.plugins).forEach((plugin) => {
      try {
        plugin.destroy()
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Error destroying plugin ${plugin.name}:`, err)
      }
    })
    this.renderer.destroy()
    removeCreatedByPackage(this.state.options.elScrollPaneX)
    removeCreatedByPackage(this.state.options.elScrollPaneY)
    removeCreatedByPackage(this.state.options.elScrollInner)
    removeCreatedByPackage(this.state.options.elScroll)
    removeCreatedByPackage(this.state.options.elCanvas)
    removeCreatedByPackage(this.state.options.elCanvasContainer)
  }

  public use(plugin: FastSheetsPlugin) {
    if (this.state.plugins[plugin.name]) {
      throw new Error(`Plugin "${plugin.name}" is already registered`)
    }

    this.setPlugins({ ...this.state.plugins, [plugin.name]: plugin })
    plugin.setup(this)
  }

  /** Unregisters a plugin and repaints without it. Called by the plugin's `destroy()`. */
  public unuse(pluginName: string) {
    this.setPlugins(
      Object.fromEntries(
        Object.entries(this.state.plugins).filter(([name]) => name !== pluginName),
      ),
    )
    this.renderer.render()
  }

  /** Replaces the plugins, and the plugins grouped by hook that the renderer reads. */
  private setPlugins(plugins: State['plugins']) {
    this.state.plugins = plugins
    this.state.pluginHooks = createPluginHooks(Object.values(plugins))
  }

  public bindEvents = () => {
    const { elContainer, elScroll, elCanvasContainer } = this.state.options

    elContainer.addEventListener('wheel', this.boundWheel, { passive: true })
    elScroll.addEventListener('scroll', this.boundRender)

    this.resizeObserver.observe(elCanvasContainer)
  }

  public unbindEvents = () => {
    const { elContainer, elScroll } = this.state.options

    this.resizeObserver.disconnect()
    elContainer.removeEventListener('wheel', this.boundWheel)
    elScroll.removeEventListener('scroll', this.boundRender)
  }

  private onWheel(e: WheelEvent) {
    const elScroll = this.state.options.elScroll
    if (elScroll) {
      elScroll.scrollTo({
        top: elScroll.scrollTop + e.deltaY,
        left: elScroll.scrollLeft + e.deltaX,
      })
    }
  }

  private onResize() {
    this.renderer.init()
    this.renderer.renderImmediate()
  }
}
