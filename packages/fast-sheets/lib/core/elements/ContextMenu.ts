import {
  DEFAULT_CONTEXT_MENU_ACTIVE_ITEM_BACKGROUND_COLOR,
  DEFAULT_CONTEXT_MENU_DISABLED_ITEM_COLOR,
  DEFAULT_CONTEXT_MENU_FONT,
} from 'lib/core/constants.ts'

export interface ContextMenuItem {
  label: string
  /** Runs when the item is chosen, after the menu closes. */
  action: () => void
  isDisabled?: boolean
}

interface ContextMenuOptions {
  name: string
  /** Runs whenever the menu closes (i.e., to give the focus back to the grid). */
  onClose?: () => void
}

const menuStyles: Partial<CSSStyleDeclaration> = {
  position: 'fixed',
  zIndex: '1000',
  display: 'none',
  minWidth: '160px',
  padding: '4px 0',
  background: '#fff',
  border: '1px solid #dadce0',
  borderRadius: '4px',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
  font: DEFAULT_CONTEXT_MENU_FONT,
  userSelect: 'none',
}

const itemStyles: Partial<CSSStyleDeclaration> = {
  display: 'block',
  width: '100%',
  padding: '6px 16px',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
}

/**
 * A menu of actions at the pointer, placed in `document.body` so that the grid's container doesn't clip it.
 * It closes when an item is chosen, on Escape, on a press outside it, on scroll, and when the window resizes or loses focus.
 */
export class ContextMenu {
  readonly el: HTMLDivElement

  readonly #onClose?: () => void

  constructor(options: ContextMenuOptions) {
    this.#onClose = options.onClose
    this.el = document.createElement('div')
    Object.assign(this.el.style, menuStyles)
    this.el.setAttribute('data-name', options.name)
    this.el.setAttribute('role', 'menu')
    this.el.addEventListener('keydown', this.#onKeyDown)
    // keeps the browser menu from opening over this one
    this.el.addEventListener('contextmenu', this.#preventDefault)
    document.body.appendChild(this.el)
  }

  isVisible() {
    return this.el.style.display !== 'none'
  }

  /** Shows the items at a point given relative to the window, as in `MouseEvent.clientX`. */
  show({
    items,
    clientX,
    clientY,
  }: {
    items: ContextMenuItem[]
    clientX: number
    clientY: number
  }) {
    this.#removeItems()
    for (const item of items) {
      this.el.appendChild(this.#createItem(item))
    }
    this.el.style.display = 'block'

    // keeps the menu inside the window
    const { width, height } = this.el.getBoundingClientRect()
    const left = Math.max(0, Math.min(clientX, window.innerWidth - width))
    const top = Math.max(0, Math.min(clientY, window.innerHeight - height))
    this.el.style.left = `${left}px`
    this.el.style.top = `${top}px`

    window.addEventListener('pointerdown', this.#onPointerDown, true)
    window.addEventListener('scroll', this.hide, true)
    window.addEventListener('resize', this.hide)
    window.addEventListener('blur', this.hide)

    this.#getEnabledItems()[0]?.focus({ preventScroll: true })
  }

  readonly hide = () => {
    if (this.isVisible()) {
      this.#close()
      this.#onClose?.()
    }
  }

  destroy() {
    if (this.isVisible()) {
      // closes without `onClose`: the grid is going away
      this.#close()
    }
    this.el.removeEventListener('keydown', this.#onKeyDown)
    this.el.removeEventListener('contextmenu', this.#preventDefault)
    this.el.remove()
  }

  #close() {
    window.removeEventListener('pointerdown', this.#onPointerDown, true)
    window.removeEventListener('scroll', this.hide, true)
    window.removeEventListener('resize', this.hide)
    window.removeEventListener('blur', this.hide)
    this.el.style.display = 'none'
    this.#removeItems()
  }

  #createItem(item: ContextMenuItem) {
    const elItem = document.createElement('button')
    elItem.type = 'button'
    elItem.textContent = item.label
    Object.assign(elItem.style, itemStyles)
    elItem.setAttribute('data-name', 'elContextMenuItem')
    elItem.setAttribute('role', 'menuitem')
    if (item.isDisabled) {
      elItem.disabled = true
      elItem.style.color = DEFAULT_CONTEXT_MENU_DISABLED_ITEM_COLOR
      elItem.style.cursor = 'default'
      return elItem
    }
    // the item under the pointer is the focused one, so the keys go on from it
    elItem.addEventListener('mousemove', () => elItem.focus({ preventScroll: true }))
    elItem.addEventListener('focus', () => {
      elItem.style.background = DEFAULT_CONTEXT_MENU_ACTIVE_ITEM_BACKGROUND_COLOR
    })
    elItem.addEventListener('blur', () => {
      elItem.style.background = 'transparent'
    })
    elItem.addEventListener('click', () => {
      this.hide()
      item.action()
    })
    return elItem
  }

  #removeItems() {
    // the item listeners go with the items
    this.el.replaceChildren()
  }

  #getEnabledItems() {
    return [...this.el.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
  }

  readonly #onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      this.hide()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const items = this.#getEnabledItems()
      if (!items.length) {
        return
      }
      const isDown = e.key === 'ArrowDown'
      const focusedIndex = items.indexOf(document.activeElement as HTMLButtonElement)
      let nextIndex = isDown ? 0 : items.length - 1
      if (focusedIndex !== -1) {
        // wraps around at both ends
        nextIndex = (focusedIndex + (isDown ? 1 : -1) + items.length) % items.length
      }
      items[nextIndex]?.focus({ preventScroll: true })
    }
  }

  readonly #onPointerDown = (e: PointerEvent) => {
    if (!(e.target instanceof Node) || !this.el.contains(e.target)) {
      this.hide()
    }
  }

  readonly #preventDefault = (e: Event) => {
    e.preventDefault()
  }
}
