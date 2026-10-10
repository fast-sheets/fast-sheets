import type { FastSheetsPlugin, FastSheetsInstance, Cell } from 'lib/core/types.ts'
import type { ModifiedCell, Options, RawOptions } from './types.ts'
import { DEFAULT_SELECTION_COLOR } from './constants.ts'
import { BORDER_STYLE } from 'lib/core/constants.ts'
import { isLeftMouseButton } from 'lib/core/utils/mouse.ts'
import { RangeSelectionController } from 'lib/core/controllers/RangeSelectionController.ts'
import { HighlightedRange } from 'lib/core/elements/HighlightedRange.ts'
import { HighlightedCell } from 'lib/core/elements/HighlightedCell.ts'
import { InputController } from './controllers/InputController.ts'

const DEFAULT_OPTIONS = {
  selectionColor: DEFAULT_SELECTION_COLOR,
}

export class FastSheetsEditablePlugin implements FastSheetsPlugin {
  name = 'editable'

  options: Options

  instance!: FastSheetsInstance

  elEditableContainerFront?: HTMLDivElement
  elEditableContainerBack?: HTMLDivElement
  selectedRange?: InstanceType<typeof HighlightedRange>
  copiedRange?: InstanceType<typeof HighlightedRange>
  rangeSelectionController?: InstanceType<typeof RangeSelectionController>
  focusedCell?: InstanceType<typeof HighlightedCell>
  inputController?: InstanceType<typeof InputController>

  isShiftPressed = false

  boundDoubleClick: (e: MouseEvent) => void
  boundMouseDown: (e: MouseEvent) => void
  boundMouseUp: (e: MouseEvent) => void
  boundMouseMove: (e: MouseEvent) => void
  boundKeyDown: (e: KeyboardEvent) => void
  boundKeyUp: (e: KeyboardEvent) => void
  boundCopy: () => void
  boundPaste: (e: ClipboardEvent) => void

  constructor(options: RawOptions) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    }

    this.boundDoubleClick = this.onDoubleClick.bind(this)
    this.boundMouseDown = this.onMouseDown.bind(this)
    this.boundMouseUp = this.onMouseUp.bind(this)
    this.boundMouseMove = this.onMouseMove.bind(this)
    this.boundKeyUp = this.onKeyUp.bind(this)
    this.boundKeyDown = this.onKeyDown.bind(this)
    this.boundCopy = this.onCopy.bind(this)
    this.boundPaste = this.onPaste.bind(this)
  }

  // noinspection JSUnusedGlobalSymbols
  setup(instance: FastSheetsInstance) {
    this.instance = instance

    this.init()
    this.bindEvents()

    new ResizeObserver(() => {
      this.inputController?.inputField.hide()
      this.rangeSelectionController?.selectionEnd()
      if (this.rangeSelectionController?.selectionRange) {
        this.selectedRange?.highlight(this.rangeSelectionController.selectionRange)
      }
      if (this.focusedCell?.cell) {
        this.focusedCell.highlight(this.focusedCell.cell)
      }
    }).observe(instance.state.options.elCanvasContainer)

    const renderCellOriginal = instance.renderer.renderCell
    instance.renderer.renderCell = (ctx, cell, fillStyleDefault) => {
      const fillStyle =
        this.rangeSelectionController?.isCellSelected(cell) &&
        this.rangeSelectionController?.selectedCellsCount() > 1
          ? '#e9f0fe'
          : fillStyleDefault
      renderCellOriginal.apply(instance.renderer, [ctx, cell, fillStyle])
    }
  }

  destroy() {
    this.unbindEvents()
  }

  init() {
    const selectionColor = this.options.selectionColor

    // elEditableContainerFront should be after scroll
    this.elEditableContainerFront = document.createElement('div')
    this.elEditableContainerFront.style = 'position: absolute; top: 0; left: 0; width: 0; height: 0'
    this.elEditableContainerFront.setAttribute('data-name', 'elEditableContainerFront')
    this.instance.state.options.elScroll.after(this.elEditableContainerFront)

    // elEditableContainerBack should be before scroll
    this.elEditableContainerBack = document.createElement('div')
    this.elEditableContainerBack.style = 'position: absolute; top: 0; left: 0; width: 0; height: 0'
    this.elEditableContainerBack.setAttribute('data-name', 'elEditableContainerBack')
    this.instance.state.options.elScroll.before(this.elEditableContainerBack)

    // select
    this.selectedRange = new HighlightedRange({
      state: this.instance.state,
      options: {
        name: 'elSelectedRange',
        container: this.elEditableContainerBack,
        color: selectionColor,
      },
    })
    this.rangeSelectionController = new RangeSelectionController()

    // focus
    this.focusedCell = new HighlightedCell({
      state: this.instance.state,
      options: {
        name: 'elFocusedCell',
        container: this.elEditableContainerBack,
        color: selectionColor,
        borderWidth: 2,
      },
    })

    // copy
    this.copiedRange = new HighlightedRange({
      state: this.instance.state,
      options: {
        name: 'elCopiedRange',
        container: this.elEditableContainerBack,
        color: selectionColor,
        borderWidth: 2,
        borderStyle: BORDER_STYLE.DASHED,
      },
    })

    // input
    this.inputController = new InputController({
      state: this.instance.state,
      options: {
        name: 'elInput',
        container: this.elEditableContainerFront,
        font: '14px/15px Verdana', // todo
        onUpdate: (modifiedCell) => {
          this.onUpdate([modifiedCell])
        },
      },
    })
  }

  bindEvents() {
    window.addEventListener('dblclick', this.boundDoubleClick)
    window.addEventListener('mouseup', this.boundMouseUp)
    window.addEventListener('mousedown', this.boundMouseDown)
    window.addEventListener('mousemove', this.boundMouseMove)
    window.addEventListener('keyup', this.boundKeyUp)
    window.addEventListener('keydown', this.boundKeyDown)
    window.addEventListener('copy', this.boundCopy)
    window.addEventListener('paste', this.boundPaste)
  }

  unbindEvents() {
    window.removeEventListener('dblclick', this.boundDoubleClick)
    window.removeEventListener('mouseup', this.boundMouseUp)
    window.removeEventListener('mousedown', this.boundMouseDown)
    window.removeEventListener('mousemove', this.boundMouseMove)
    window.removeEventListener('keyup', this.boundKeyUp)
    window.removeEventListener('keydown', this.boundKeyDown)
    window.removeEventListener('copy', this.boundCopy)
    window.removeEventListener('paste', this.boundPaste)
  }

  public render() {
    this.updateContainerPosition()
  }

  public onUpdate(modifiedCells: ModifiedCell[]) {
    let modifiedCellsPrepared = [...modifiedCells]
    if (this.instance.state.options.isRowNumberVisible) {
      modifiedCellsPrepared = modifiedCellsPrepared.map((modifiedCell) => ({
        ...modifiedCell,
        columnIndex: (modifiedCell.columnIndex -= 1),
      }))
    }
    if (this.instance.state.hasColumnNames) {
      modifiedCellsPrepared = modifiedCellsPrepared.map((modifiedCell) => ({
        ...modifiedCell,
        rowIndex: (modifiedCell.rowIndex -= 1),
      }))
    }
    this.options.onUpdate(modifiedCellsPrepared)
    this.instance?.renderer.render()
  }

  private onDoubleClick(e: MouseEvent) {
    const cell = this.instance.renderer.findCellByMouseEvent(e)
    if (cell && this.isCellEditable(cell)) {
      this.inputController?.showInput(cell)
    }
  }

  private onMouseDown(e: MouseEvent) {
    if (!isLeftMouseButton(e)) {
      return
    }
    this.selectedRange?.reset()
    this.rangeSelectionController?.reset()
    this.focusedCell?.reset()
    this.copiedRange?.reset()
    const cell = this.instance.renderer.findCellByMouseEvent(e)
    if (cell) {
      this.focusedCell?.highlight(cell)
      if (!this.isInputVisible()) {
        this.startSelection(cell)
      }
    }
    this.instance.renderer.render()
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.rangeSelectionController?.hasStarted) {
      return
    }
    const cell = this.instance.renderer.findCellByMouseEvent(e)
    if (cell && this.updateSelection(cell)) {
      this.instance.renderer.render()
    }
  }

  private onMouseUp() {
    this.endSelection()
  }

  private async onCopy() {
    if (this.selectedRange?.range) {
      const { rowStart, rowEnd, columnStart, columnEnd } = this.selectedRange.range
      this.copiedRange?.highlight(this.selectedRange.range)
      const data = this.instance.state.options.data.slice(rowStart, rowEnd + 1)
      const rows = data.map((row) => row.slice(columnStart, columnEnd + 1).join('\t'))
      await navigator.clipboard.writeText(rows.join('\n'))
    }
  }

  private onPaste(e: ClipboardEvent) {
    e.preventDefault()
    this.copiedRange?.reset()
    const paste = e.clipboardData?.getData('text')
    const focusedCell = this.focusedCell?.cell
    if (paste && focusedCell) {
      let escapedPaste = paste
      const matches = paste.matchAll(/"([\w\n]+)"/g)
      for (const match of matches) {
        const substr = match[1]
        if (!substr) {
          continue
        }
        const replacement = substr.replace('\n', '/n')
        escapedPaste = escapedPaste.replace(match[0], replacement)
      }

      const modifiedCells: ModifiedCell[] = []
      escapedPaste.split('\n').forEach((row, rowIndex) => {
        row.split('\t').forEach((cell, columnIndex) => {
          modifiedCells.push({
            rowIndex: focusedCell.rowIndex + rowIndex,
            columnIndex: focusedCell.columnIndex + columnIndex,
            value: cell.replace('/n', '\n'),
          })
        })
      })
      this.onUpdate(modifiedCells)
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    switch (e.key) {
      case 'Shift':
        this.endSelection()
        this.isShiftPressed = false
        break
    }
  }

  private onKeyDown(e: KeyboardEvent) {
    if (this.focusedCell?.cell && !this.isInputVisible()) {
      e.preventDefault()
      const newFocusedCell: Cell = {
        rowIndex: this.focusedCell.cell.rowIndex,
        columnIndex: this.focusedCell.cell.columnIndex,
      }

      let hasSelectionJustStarted = false
      let isArrowKey = false

      switch (e.key) {
        case 'ArrowUp': {
          const minRowIndex = this.instance.state.hasColumnNames ? 1 : 0
          newFocusedCell.rowIndex = Math.max(minRowIndex, newFocusedCell.rowIndex - 1)
          isArrowKey = true
          break
        }
        case 'ArrowDown':
          newFocusedCell.rowIndex++
          isArrowKey = true
          break
        case 'ArrowLeft': {
          const minColumnIndex = this.instance.state.options.isRowNumberVisible ? 1 : 0
          newFocusedCell.columnIndex = Math.max(minColumnIndex, newFocusedCell.columnIndex - 1)
          isArrowKey = true
          break
        }
        case 'ArrowRight':
          newFocusedCell.columnIndex++
          isArrowKey = true
          break
        case 'Shift':
          this.isShiftPressed = true
          hasSelectionJustStarted = true
          this.selectedRange?.reset()
          this.rangeSelectionController?.reset()
          this.instance.renderer.render()
          this.startSelection(newFocusedCell)
          break
        case 'Backspace':
          this.onUpdate([{ ...newFocusedCell, value: '' }])
          break
      }

      if (
        !(
          e.metaKey ||
          e.altKey ||
          e.ctrlKey ||
          isArrowKey ||
          e.key === 'Escape' ||
          e.key === 'Backspace' ||
          this.isShiftPressed
        ) &&
        this.isCellEditable(newFocusedCell)
      ) {
        // show input
        this.inputController?.showInput(newFocusedCell)
      }

      if (
        newFocusedCell.rowIndex !== this.focusedCell.cell.rowIndex ||
        newFocusedCell.columnIndex !== this.focusedCell.cell.columnIndex
      ) {
        this.focusedCell.highlight(newFocusedCell)
      }

      if (this.isShiftPressed) {
        if (!hasSelectionJustStarted && this.updateSelection(newFocusedCell)) {
          this.instance.renderer.render()
        }
      } else {
        this.selectedRange?.reset()
        this.rangeSelectionController?.reset()
        this.instance.renderer.render()
      }
    }
  }

  private isCellEditable(cell: Cell) {
    const isColumnName = this.instance.state.hasColumnNames && cell.rowIndex === 0
    const isRowNumber = !!this.instance.state.options.isRowNumberVisible && cell.columnIndex === 0
    return !isRowNumber && !isColumnName
  }

  private isInputVisible() {
    return this.inputController && this.inputController.isInputFieldVisible()
  }

  private updateContainerPosition() {
    if (this.elEditableContainerFront) {
      this.elEditableContainerFront.style.top = `-${this.instance.state.options.elScroll.scrollTop || 0}px`
      this.elEditableContainerFront.style.left = `-${this.instance.state.options.elScroll.scrollLeft || 0}px`
    }
    if (this.elEditableContainerBack) {
      this.elEditableContainerBack.style.top = `-${this.instance.state.options.elScroll.scrollTop || 0}px`
      this.elEditableContainerBack.style.left = `-${this.instance.state.options.elScroll.scrollLeft || 0}px`
    }
  }

  private startSelection(cell: Cell) {
    this.rangeSelectionController?.selectionStart(cell)
  }

  private updateSelection(cell: Cell) {
    return this.rangeSelectionController?.selectionUpdate(cell)
  }

  private endSelection() {
    this.rangeSelectionController?.selectionEnd()
    if (this.rangeSelectionController?.selectionRange) {
      this.selectedRange?.highlight(this.rangeSelectionController.selectionRange)
    }
  }
}
