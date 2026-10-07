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
  readonly state: StateInstance
  readonly inputField: InputField
  cell: Cell | null = null
  onUpdate: (modifiedCell: ModifiedCell) => void

  constructor({ state, options }: { state: StateInstance; options: InputControllerOptions }) {
    this.state = state
    this.inputField = new InputField({ state, options: { name: options.name, font: options.font } })
    options.container.appendChild(this.inputField.el)
    this.onUpdate = options.onUpdate
    this.bindEvents()
  }

  bindEvents() {
    this.inputField.el.addEventListener('input', this.onInput.bind(this))
    this.inputField.el.addEventListener('keypress', this.onInputKeyPress.bind(this))
  }

  showInput(cell: Cell) {
    this.cell = cell
    this.inputField.show(cell)
  }

  hideInput() {
    this.inputField.hide()
  }

  isInputFieldVisible() {
    return this.inputField.el.style.display !== 'none'
  }

  onInput(e: Event) {
    if (this.cell && e.target instanceof HTMLDivElement) {
      this.onUpdate({
        rowIndex: this.cell.rowIndex,
        columnIndex: this.cell.columnIndex,
        value: e.target.textContent,
      })
    }
  }

  onInputKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this.inputField.hide()
    }
  }
}
