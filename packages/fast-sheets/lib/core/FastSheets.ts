import type { FastSheetsPlugin, RawOptions } from '../core/types.ts'
import { Renderer } from './Renderer.ts'
import { State } from 'lib/core/State.ts'

const DEFAULT_OPTIONS = {
  borderWidth: 1,
  plugins: [],
  isRowNumberVisible: false,
}

export class FastSheets {
  public state: InstanceType<typeof State>
  public renderer: InstanceType<typeof Renderer>

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

    if (!elCanvasContainer) {
      elCanvasContainer = document.createElement('div')
      elContainer.appendChild(elCanvasContainer)
      elCanvasContainer.setAttribute('data-name', 'elCanvasContainer')
      elCanvasContainer.style.position = 'relative'
      elCanvasContainer.style.flexGrow = '1'
    }

    if (!elCanvas) {
      elCanvas = document.createElement('canvas')
      elCanvasContainer.appendChild(elCanvas)
      elCanvas.setAttribute('data-name', 'elCanvas')
      elCanvas.style.position = 'absolute'
      elCanvas.style.top = '0'
      elCanvas.style.left = '0'
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
    }

    if (!elScrollInner) {
      elScrollInner = document.createElement('div')
      elScroll.appendChild(elScrollInner)
      elScrollInner.setAttribute('data-name', 'elScrollInner')
      elScrollInner.style.position = 'absolute'
      elScrollInner.style.width = '100%'
      elScrollInner.style.height = '100%'
    }

    if (!elScrollPaneX) {
      elScrollPaneX = document.createElement('div')
      elScroll.appendChild(elScrollPaneX)
      elScrollPaneX.setAttribute('data-name', 'elScrollPaneX')
      elScrollPaneX.style.height = '1px'
    }

    if (!elScrollPaneY) {
      elScrollPaneY = document.createElement('div')
      elScroll.appendChild(elScrollPaneY)
      elScrollPaneY.setAttribute('data-name', 'elScrollPaneY')
      elScrollPaneY.style.width = '1px'
    }

    const columns = options.columns || options.data[0]?.map(() => ({ width: 100 }))

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

    this.bindEvents()
  }

  public destroy() {
    this.state.options.elContainer.innerHTML = ''
    this.unbindEvents()
    Object.values(this.state.plugins).forEach((plugin) => {
      if (typeof plugin.destroy === 'function') {
        plugin.destroy()
      }
    })
  }

  public use(plugin: FastSheetsPlugin) {
    this.state.plugins[plugin.name] = plugin
    plugin.setup(this)
  }

  public bindEvents = () => {
    const { elContainer, elScroll, elCanvasContainer } = this.state.options

    elContainer.addEventListener('wheel', this.onWheel.bind(this), { passive: true })
    elScroll.addEventListener('scroll', this.renderer.render.bind(this.renderer))

    new ResizeObserver(() => {
      this.renderer.init()
      this.renderer.renderImmediate()
    }).observe(elCanvasContainer)
  }

  public unbindEvents = () => {
    const { elContainer, elScroll } = this.state.options

    elContainer.removeEventListener('wheel', this.onWheel.bind(this))
    elScroll.removeEventListener('scroll', this.renderer.render)
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
}
