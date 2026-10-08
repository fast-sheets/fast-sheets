import type { Cell } from 'lib/core/types.ts'
import { getCellInfo } from 'lib/core/utils/cell.ts'
import type { StateInstance } from 'lib/core/State.ts'
import { DEFAULT_SELECTION_COLOR } from 'lib/plugins/editable/constants.ts'

export const inputField: Partial<CSSStyleDeclaration> = {
  position: 'absolute',
  border: '0',
  boxSizing: 'border-box',
  borderRadius: '0',
  background: '#fff',
  color: '#000',
  overflow: 'auto',
  outline: '2px solid #a8c7fa',
  padding: '0',
  whiteSpace: 'pre-wrap',
}

export class InputField {
  readonly el: HTMLDivElement
  readonly state: StateInstance
  readonly name: string

  constructor({
    state,
    options,
  }: {
    state: StateInstance
    options: { name: string; font: string }
  }) {
    this.name = options.name
    this.el = document.createElement('div')
    this.el.setAttribute('data-name', options.name)
    this.el.setAttribute('contenteditable', 'true')
    Object.assign(this.el.style, inputField)
    this.el.style.font = options.font
    this.state = state
    this.hide()

    this.el.addEventListener('blur', this.hide.bind(this))
  }

  get value() {
    return this.el.innerText
  }

  set value(value: string) {
    this.el.innerHTML = value
  }

  show(cell: Cell) {
    const cellInfo = getCellInfo({ state: this.state, cell })
    const borderWidth = 2
    this.el.style.display = 'block'
    this.el.style.border = `${borderWidth}px solid ${DEFAULT_SELECTION_COLOR}`
    this.el.style.top = `${cellInfo.top - 1}px`
    this.el.style.left = `${cellInfo.left}px`
    this.el.style.minWidth = `${cellInfo.width}px`
    this.el.style.minHeight = `${cellInfo.height}px`
    const { elScrollInner } = this.state.options
    const elScrollInnerDomRect = elScrollInner.getBoundingClientRect()

    const cellRight = cellInfo.left + cellInfo.width
    const elScrollInnerRight = elScrollInnerDomRect.left + elScrollInnerDomRect.width
    const spaceRight = Math.max(0, elScrollInnerRight - cellRight)
    this.el.style.maxWidth = `${cellInfo.width + spaceRight}px`

    const cellBottom = cellInfo.top + cellInfo.height
    const elScrollInnerBottom = elScrollInnerDomRect.top + elScrollInnerDomRect.height
    const spaceBottom = Math.max(0, elScrollInnerBottom - cellBottom)
    this.el.style.maxHeight = `${cellInfo.height + spaceBottom}px`

    this.value = cellInfo.text
    this.el.focus()
    this.setCaretPosition(cellInfo.text.length)
  }

  setCaretPosition(position: number) {
    const range = document.createRange()
    const selection = window.getSelection()
    const textNode = this.el.firstChild

    if (textNode) {
      range.setStart(textNode, position)
      range.setEnd(textNode, position)
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  }

  hide() {
    this.el.style.display = 'none'
  }
}
