import { DEFAULT_SELECTION_COLOR } from 'lib/core/constants.ts'
import type { CellInfo } from 'lib/core/types.ts'

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
  readonly name: string

  constructor(options: { name: string; font: string }) {
    this.name = options.name
    this.el = document.createElement('div')
    this.el.setAttribute('data-name', options.name)
    this.el.setAttribute('contenteditable', 'true')
    Object.assign(this.el.style, inputField)
    this.el.style.font = options.font
    this.hide()
  }

  get value() {
    return this.el.textContent
  }

  set value(value: string) {
    this.el.textContent = value
  }

  show(options: { cellInfo: CellInfo; maxWidth?: number; maxHeight?: number }) {
    const borderWidth = 2
    this.el.style.display = 'block'
    this.el.style.border = `${borderWidth}px solid ${DEFAULT_SELECTION_COLOR}`
    this.place(options)
    this.value = options.cellInfo.text
  }

  /** Moves and sizes the field to the cell, keeping its text */
  place({
    cellInfo,
    maxWidth,
    maxHeight,
  }: {
    cellInfo: CellInfo
    maxWidth?: number
    maxHeight?: number
  }) {
    this.el.style.top = `${cellInfo.top - 1}px`
    this.el.style.left = `${cellInfo.left}px`
    this.el.style.minWidth = `${cellInfo.width}px`
    this.el.style.minHeight = `${cellInfo.height}px`
    if (maxWidth) {
      this.el.style.maxWidth = `${maxWidth}px`
    }
    if (maxHeight) {
      this.el.style.maxHeight = `${maxHeight}px`
    }
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

  focus() {
    this.el.focus()
  }

  contains(target: EventTarget | null) {
    return target instanceof Node && this.el.contains(target)
  }

  destroy() {
    this.el.remove()
  }
}
