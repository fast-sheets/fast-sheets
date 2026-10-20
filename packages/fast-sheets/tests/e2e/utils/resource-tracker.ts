import type { Page } from '@playwright/test'

export interface ResourceTracker {
  /**
   * Event listeners that outlive the grid: the ones on `window`, `document` and on elements that
   * are still in the document (e.g. the container). Listeners on elements that were removed
   * from the document are garbage and are not reported.
   * One entry per listener, like `window:mousemove` or `div[data-testid=fast-sheets]:wheel`.
   */
  listeners(): string[]
  /** ResizeObservers that still observe at least one element */
  liveObservers(): number
  /** animation frames that were requested and have neither run nor been cancelled */
  pendingFrames(): number
}

export const trackEventListeners = (page: Page) =>
  page.addInitScript(() => {
    const targets = new Set<EventTarget>()
    const registered = new WeakMap<EventTarget, Set<string>>()
    const listenerIds = new WeakMap<object, number>()
    let lastListenerId = 0

    const getKey = (
      type: string,
      listener: object,
      options?: boolean | AddEventListenerOptions,
    ) => {
      let id = listenerIds.get(listener)
      if (id === undefined) {
        id = ++lastListenerId
        listenerIds.set(listener, id)
      }
      const capture = typeof options === 'object' ? !!options.capture : !!options
      return `${type}|${capture}|${id}`
    }

    const nativeAdd = EventTarget.prototype.addEventListener
    const nativeRemove = EventTarget.prototype.removeEventListener

    EventTarget.prototype.addEventListener = function (
      this: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ) {
      const isSelfReleasing = typeof options === 'object' && (options.once || options.signal)
      if (listener && !isSelfReleasing) {
        const keys = registered.get(this) ?? new Set<string>()
        keys.add(getKey(type, listener, options)) // adding the same listener twice is a no-op
        registered.set(this, keys)
        targets.add(this)
      }
      return nativeAdd.call(this, type, listener, options)
    }

    EventTarget.prototype.removeEventListener = function (
      this: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | EventListenerOptions,
    ) {
      if (listener) {
        registered.get(this)?.delete(getKey(type, listener, options))
      }
      return nativeRemove.call(this, type, listener, options)
    }

    const describeTarget = (target: EventTarget) => {
      if (target === window) {
        return 'window'
      }
      if (target === document) {
        return 'document'
      }
      if (target instanceof Element) {
        const name = target.getAttribute('data-name')
        const testId = target.getAttribute('data-testid')
        const label = name ? `data-name=${name}` : testId ? `data-testid=${testId}` : ''
        return `${target.tagName.toLowerCase()}${label ? `[${label}]` : ''}`
      }
      return target.constructor.name
    }

    window.resourceTracker = window.resourceTracker || {}
    window.resourceTracker.listeners = () => {
      const entries: string[] = []
      targets.forEach((target) => {
        const isLongLived =
          target === window || target === document || (target instanceof Node && target.isConnected)
        if (!isLongLived) {
          return
        }
        registered.get(target)?.forEach((key) => {
          const [type, capture] = key.split('|')
          entries.push(`${describeTarget(target)}:${type}${capture === 'true' ? ' (capture)' : ''}`)
        })
      })
      return entries.sort()
    }
  })

export const trackResizeObservers = (page: Page) =>
  page.addInitScript(() => {
    const NativeResizeObserver = window.ResizeObserver
    const observed: Set<Element>[] = []

    window.ResizeObserver = class extends NativeResizeObserver {
      private readonly elements = new Set<Element>()

      constructor(callback: ResizeObserverCallback) {
        super(callback)
        observed.push(this.elements)
      }

      observe(target: Element, options?: ResizeObserverOptions) {
        this.elements.add(target)
        super.observe(target, options)
      }

      unobserve(target: Element) {
        this.elements.delete(target)
        super.unobserve(target)
      }

      disconnect() {
        this.elements.clear()
        super.disconnect()
      }
    }

    window.resourceTracker = window.resourceTracker || {}
    window.resourceTracker.liveObservers = () =>
      observed.filter((elements) => elements.size > 0).length
  })

export const trackAnimationFrames = (page: Page) =>
  page.addInitScript(() => {
    const nativeRequestFrame = window.requestAnimationFrame.bind(window)
    const nativeCancelFrame = window.cancelAnimationFrame.bind(window)
    const pendingFrames = new Set<number>()

    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      const id = nativeRequestFrame((time) => {
        pendingFrames.delete(id)
        callback(time)
      })
      pendingFrames.add(id)
      return id
    }

    window.cancelAnimationFrame = (id: number) => {
      pendingFrames.delete(id)
      nativeCancelFrame(id)
    }

    window.resourceTracker = window.resourceTracker || {}
    window.resourceTracker.pendingFrames = () => pendingFrames.size
  })

export const getEventListeners = (page: Page) =>
  page.evaluate(() => window.resourceTracker.listeners())
