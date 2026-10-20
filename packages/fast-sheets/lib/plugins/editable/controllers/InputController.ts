import type { CellInfo } from 'lib/core/types.ts'
import { InputField } from '../elements/InputField.ts'
import type { ModifiedCell } from '../types.ts'
import type { StateInstance } from 'lib/core/State.ts'

interface InputControllerOptions {
  name: string
  container: HTMLDivElement
  font: string
  onUpdate: (modifiedCell: ModifiedCell) => void
}

export class InputController {
  readonly inputField: InputField
  elContainer?: HTMLElement
  elScrollInner?: HTMLElement
  cellInfo: CellInfo | null = null
  onUpdate: (modifiedCell: ModifiedCell) => void
  onInputKeyPressBound: (event: KeyboardEvent) => void
  onInputBlurBound: (event: FocusEvent) => void

  constructor(options: InputControllerOptions) {
    this.inputField = new InputField({ name: options.name, font: options.font })
    options.container.appendChild(this.inputField.el)
    this.onUpdate = options.onUpdate
    this.onInputKeyPressBound = this.onInputKeyPress.bind(this)
    this.onInputBlurBound = this.hideInput.bind(this)
  }

  bindEvents(state: StateInstance) {
    this.elContainer = state.options.elContainer
    this.elScrollInner = state.options.elScrollInner
    this.inputField.el.addEventListener('keypress', this.onInputKeyPressBound)
    this.inputField.el.addEventListener('blur', this.onInputBlurBound)
  }

  unbindEvents() {
    this.inputField.el.removeEventListener('keypress', this.onInputKeyPressBound)
    this.inputField.el.removeEventListener('blur', this.onInputBlurBound)
  }

  destroy() {
    this.inputField.destroy()
  }

  showInput(cellInfo: CellInfo) {
    this.cellInfo = cellInfo
    const maxWidth = this.getInputMaxWidth(cellInfo)
    const maxHeight = this.getInputMaxHeight(cellInfo)
    this.inputField.show({ cellInfo, maxWidth, maxHeight })
    this.inputField.focus()
    this.inputField.setCaretPosition(this.getValue().length)
  }

  hideInput() {
    this.inputField.hide()
    this.elContainer?.focus()
  }

  isInputFieldVisible() {
    return this.inputField.el.style.display !== 'none'
  }

  onInputKeyPress(e: KeyboardEvent) {
    if (!e.shiftKey && e.key === 'Enter') {
      if (this.cellInfo) {
        this.onUpdate({
          rowIndex: this.cellInfo.cell.rowIndex,
          columnIndex: this.cellInfo.cell.columnIndex,
          value: this.getValue(),
        })
      }
      this.hideInput()
    }
  }

  getValue() {
    return this.inputField.value
  }

  setValue(value: string) {
    if (this.cellInfo) {
      this.inputField.value = value
      this.inputField.setCaretPosition(value.length)
      this.onUpdate({
        rowIndex: this.cellInfo.cell.rowIndex,
        columnIndex: this.cellInfo.cell.columnIndex,
        value: value,
      })
    }
  }

  getInputMaxWidth(cellInfo: CellInfo) {
    const cellRight = cellInfo.left + cellInfo.width
    const elScrollInnerDomRect = this.elScrollInner?.getBoundingClientRect()
    const elScrollInnerLeft = elScrollInnerDomRect?.left || 0
    const elScrollInnerWidth = elScrollInnerDomRect?.width || 0
    const elScrollInnerRight = elScrollInnerLeft + elScrollInnerWidth
    const minSafeWidth = Math.max(100, cellInfo.width)
    return Math.max(minSafeWidth, elScrollInnerRight - cellRight)
  }

  getInputMaxHeight(cellInfo: CellInfo) {
    const cellBottom = cellInfo.top + cellInfo.height
    const elScrollInnerDomRect = this.elScrollInner?.getBoundingClientRect()
    const elScrollInnerTop = elScrollInnerDomRect?.top || 0
    const elScrollInnerHeight = elScrollInnerDomRect?.height || 0
    const elScrollInnerBottom = elScrollInnerTop + elScrollInnerHeight
    const minSafeHeight = Math.max(40, cellInfo.height)
    return Math.max(minSafeHeight, elScrollInnerBottom - cellBottom)
  }
}
