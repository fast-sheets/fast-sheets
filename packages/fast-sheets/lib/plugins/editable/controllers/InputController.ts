import type { Cell } from 'lib/core/types.ts'
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
  cell: Cell | null = null
  onUpdate: (modifiedCell: ModifiedCell) => void

  constructor(options: InputControllerOptions) {
    this.inputField = new InputField({ name: options.name, font: options.font })
    options.container.appendChild(this.inputField.el)
    this.onUpdate = options.onUpdate
    this.bindEvents()
  }

  bindEvents() {
    this.inputField.el.addEventListener('keypress', this.onInputKeyPress.bind(this))
  }

  showInput({ cell, state }: { cell: Cell; state: StateInstance }) {
    this.cell = cell
    this.inputField.show({ cell, state })
  }

  hideInput() {
    this.inputField.hide()
  }

  isInputFieldVisible() {
    return this.inputField.el.style.display !== 'none'
  }

  onInputKeyPress(e: KeyboardEvent) {
    if (!e.shiftKey && e.key === 'Enter') {
      if (this.cell) {
        this.onUpdate({
          rowIndex: this.cell.rowIndex,
          columnIndex: this.cell.columnIndex,
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
    if (this.cell) {
      this.inputField.value = value
      this.inputField.setCaretPosition(value.length)
      this.onUpdate({
        rowIndex: this.cell.rowIndex,
        columnIndex: this.cell.columnIndex,
        value: value,
      })
    }
  }
}
