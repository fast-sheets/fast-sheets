import { InputField } from 'lib/core/elements/InputField.ts'
import type { StateInstance } from 'lib/core/State.ts'
import type { CellInfo, ModifiedCell } from 'lib/core/types.ts'

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
  readonly #onInputKeyDownBound: (event: KeyboardEvent) => void
  readonly #onInputBlurBound: (event: FocusEvent) => void
  // the value last sent with `onUpdate`, so that an unchanged value is not sent again
  #savedValue = ''

  constructor(options: InputControllerOptions) {
    this.inputField = new InputField({ name: options.name, font: options.font })
    options.container.appendChild(this.inputField.el)
    this.onUpdate = options.onUpdate
    this.#onInputKeyDownBound = this.#onInputKeyDown.bind(this)
    this.#onInputBlurBound = this.#onInputBlur.bind(this)
  }

  bindEvents(state: StateInstance) {
    this.elContainer = state.options.elContainer
    this.elScrollInner = state.options.elScrollInner
    this.inputField.el.addEventListener('keydown', this.#onInputKeyDownBound)
    this.inputField.el.addEventListener('blur', this.#onInputBlurBound)
  }

  unbindEvents() {
    this.inputField.el.removeEventListener('keydown', this.#onInputKeyDownBound)
    this.inputField.el.removeEventListener('blur', this.#onInputBlurBound)
  }

  destroy() {
    this.inputField.destroy()
  }

  showInput(cellInfo: CellInfo) {
    this.cellInfo = cellInfo
    const maxWidth = this.getInputMaxWidth(cellInfo)
    const maxHeight = this.getInputMaxHeight(cellInfo)
    this.inputField.show({ cellInfo, maxWidth, maxHeight })
    this.#savedValue = this.getValue()
    this.inputField.focus()
    this.inputField.setCaretPosition(this.getValue().length)
  }

  hideInput() {
    this.inputField.hide()
    this.elContainer?.focus()
  }

  /** Saves the value if it changed, then closes the input */
  commitInput() {
    if (this.cellInfo) {
      this.#saveValue(this.getValue())
    }
    // cleared before hiding: hiding moves the focus, and the blur that follows must not save again
    this.cellInfo = null
    this.hideInput()
  }

  isInputFieldVisible() {
    return this.inputField.el.style.display !== 'none'
  }

  #onInputKeyDown(e: KeyboardEvent) {
    // Shift+Enter adds a line, and Enter during IME composition confirms the composed text
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault()
      this.commitInput()
    }
  }

  #onInputBlur() {
    if (this.cellInfo) {
      this.commitInput()
    }
  }

  getValue() {
    return this.inputField.value
  }

  setValue(value: string) {
    if (this.cellInfo) {
      this.inputField.value = value
      this.inputField.setCaretPosition(value.length)
      this.#saveValue(value)
    }
  }

  #saveValue(value: string) {
    if (!this.cellInfo || value === this.#savedValue) {
      return
    }
    this.#savedValue = value
    this.onUpdate({
      rowIndex: this.cellInfo.cell.rowIndex,
      columnIndex: this.cellInfo.cell.columnIndex,
      value,
    })
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
