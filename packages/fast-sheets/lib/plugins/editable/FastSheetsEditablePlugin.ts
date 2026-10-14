import type { FastSheetsPlugin, FastSheetsInstance, Cell } from 'lib/core/types.ts'
import type { ModifiedCell, Options, RawOptions } from './types.ts'
import { DEFAULT_SELECTION_COLOR } from './constants.ts'
import { BORDER_STYLE } from 'lib/core/constants.ts'
import { isLeftMouseButton } from 'lib/core/utils/mouse.ts'
import { RangeSelectionController } from 'lib/core/controllers/RangeSelectionController.ts'
import { HighlightedRange } from 'lib/core/elements/HighlightedRange.ts'
import { HighlightedCell } from 'lib/core/elements/HighlightedCell.ts'
import { InputController } from './controllers/InputController.ts'
import {
  getAboveCell,
  getBelowCell,
  getCellInfo,
  getLeftCell,
  getRightCell,
} from 'lib/core/utils/cell.ts'

const DEFAULT_OPTIONS = {
  selectionColor: DEFAULT_SELECTION_COLOR,
}

export class FastSheetsEditablePlugin implements FastSheetsPlugin {
  name = 'editable'

  options: Options

  instance!: FastSheetsInstance

  elEditableContainerFront: HTMLDivElement
  elEditableContainerBack: HTMLDivElement
  selectedRange: InstanceType<typeof HighlightedRange>
  copiedRange: InstanceType<typeof HighlightedRange>
  rangeSelectionController: InstanceType<typeof RangeSelectionController>
  focusedCell: InstanceType<typeof HighlightedCell>
  inputController: InstanceType<typeof InputController>

  resizeObserver: ResizeObserver

  pointerDownTime = 0
  isDoubleTap = false

  boundDoubleClick: (e: MouseEvent) => void
  boundMouseDown: (e: MouseEvent) => void
  boundMouseUp: (e: MouseEvent) => void
  boundMouseMove: (e: MouseEvent) => void
  boundKeyDown: (e: KeyboardEvent) => void
  boundKeyUp: (e: KeyboardEvent) => void
  boundCopy: () => void
  boundPaste: (e: ClipboardEvent) => void
  boundPointerDown: (e: PointerEvent) => void
  boundPointerUp: (e: PointerEvent) => void

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
    this.boundPointerDown = this.onPointerDown.bind(this)
    this.boundPointerUp = this.onPointerUp.bind(this)

    this.resizeObserver = new ResizeObserver(() => {
      this.onResize()
    })

    // elEditableContainerFront
    this.elEditableContainerFront = document.createElement('div')
    this.elEditableContainerFront.style = 'position: absolute; top: 0; left: 0; width: 0; height: 0'
    this.elEditableContainerFront.setAttribute('data-name', 'elEditableContainerFront')

    // elEditableContainerBack
    this.elEditableContainerBack = document.createElement('div')
    this.elEditableContainerBack.style = 'position: absolute; top: 0; left: 0; width: 0; height: 0'
    this.elEditableContainerBack.setAttribute('data-name', 'elEditableContainerBack')

    const selectionColor = this.options.selectionColor

    // select highlight
    this.selectedRange = new HighlightedRange({
      name: 'elSelectedRange',
      container: this.elEditableContainerBack,
      color: selectionColor,
    })
    this.rangeSelectionController = new RangeSelectionController()

    // focus highlight
    this.focusedCell = new HighlightedCell({
      name: 'elFocusedCell',
      container: this.elEditableContainerBack,
      color: selectionColor,
      borderWidth: 2,
    })

    // copy highlight
    this.copiedRange = new HighlightedRange({
      name: 'elCopiedRange',
      container: this.elEditableContainerBack,
      color: selectionColor,
      borderWidth: 2,
      borderStyle: BORDER_STYLE.DASHED,
    })

    // input controller
    this.inputController = new InputController({
      name: 'elInput',
      container: this.elEditableContainerFront,
      font: '14px/15px Verdana', // todo
      onUpdate: (modifiedCell) => {
        this.onUpdate([modifiedCell])
      },
    })
  }

  // noinspection JSUnusedGlobalSymbols
  setup(instance: FastSheetsInstance) {
    this.instance = instance

    this.init(instance)
    this.bindEvents(instance)

    const renderCellOriginal = instance.renderer.renderCell
    instance.renderer.renderCell = (ctx, cell, fillStyleDefault) => {
      const fillStyle =
        this.rangeSelectionController.isCellSelected(cell) &&
        this.rangeSelectionController.selectedCellsCount() > 1
          ? '#e9f0fe'
          : fillStyleDefault
      renderCellOriginal.apply(instance.renderer, [ctx, cell, fillStyle])
    }
  }

  destroy() {
    this.unbindEvents(this.instance)
  }

  init(instance: FastSheetsInstance) {
    // elEditableContainerBack should be before scroll
    instance.state.options.elScroll.before(this.elEditableContainerBack)

    // elEditableContainerFront should be after scroll
    instance.state.options.elScroll.after(this.elEditableContainerFront)
  }

  bindEvents(instance: FastSheetsInstance) {
    // mouse events
    instance.state.options.elContainer.addEventListener('dblclick', this.boundDoubleClick)
    window.addEventListener('mouseup', this.boundMouseUp)
    this.instance.state.options.elContainer.addEventListener('mousedown', this.boundMouseDown)
    window.addEventListener('mousemove', this.boundMouseMove)
    // key events
    instance.state.options.elContainer.addEventListener('keyup', this.boundKeyUp)
    instance.state.options.elContainer.addEventListener('keydown', this.boundKeyDown)
    // copy & paste
    instance.state.options.elContainer.addEventListener('copy', this.boundCopy)
    instance.state.options.elContainer.addEventListener('paste', this.boundPaste)
    // pointer events
    instance.state.options.elContainer.addEventListener('pointerdown', this.boundPointerDown)
    window.addEventListener('pointerup', this.boundPointerUp)
    // observables
    this.resizeObserver.observe(this.instance.state.options.elCanvasContainer)
    // input
    this.inputController.bindEvents(this.instance.state)
  }

  unbindEvents(instance: FastSheetsInstance) {
    // mouse events
    instance.state.options.elContainer.removeEventListener('dblclick', this.boundDoubleClick)
    window.removeEventListener('mouseup', this.boundMouseUp)
    instance.state.options.elContainer.removeEventListener('mousedown', this.boundMouseDown)
    window.removeEventListener('mousemove', this.boundMouseMove)
    // key events
    instance.state.options.elContainer.removeEventListener('keyup', this.boundKeyUp)
    instance.state.options.elContainer.removeEventListener('keydown', this.boundKeyDown)
    // copy & paste
    instance.state.options.elContainer.removeEventListener('copy', this.boundCopy)
    instance.state.options.elContainer.removeEventListener('paste', this.boundPaste)
    // pointer events
    instance.state.options.elContainer.removeEventListener('pointerdown', this.boundPointerDown)
    window.removeEventListener('pointerup', this.boundPointerUp)
    // observables
    this.resizeObserver.disconnect()
    // input
    this.inputController.unbindEvents()
  }

  public render() {
    this.updateContainerPosition()
  }

  public onResize() {
    this.inputController.inputField.hide()
    this.rangeSelectionController.selectionEnd()
    if (this.rangeSelectionController.selectionRange) {
      this.selectedRange.highlight({
        range: this.rangeSelectionController.selectionRange,
        state: this.instance.state,
      })
    }
    if (this.focusedCell.cell) {
      this.focusedCell.highlight({ cell: this.focusedCell.cell, state: this.instance.state })
    }
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
    this.options.onUpdate(modifiedCellsPrepared) // data could be modified after update
    this.instance.renderer.init() // init needed to recalculate row heights and all dependent sizes
    if (this.focusedCell.cell) {
      this.focusedCell.highlight({ cell: this.focusedCell.cell, state: this.instance.state }) // actualizing focused cell border
    }
    this.instance.renderer.render()
  }

  private onDoubleClick(e: MouseEvent) {
    const cell = this.instance.renderer.findCellByMouseEvent(e)
    if (cell && this.isCellEditable(cell)) {
      const cellInfo = getCellInfo({ cell, state: this.instance.state })
      this.inputController.showInput(cellInfo)
    }
  }

  private onMouseDown(e: MouseEvent) {
    if (!isLeftMouseButton(e)) {
      return
    }
    this.selectedRange.reset()
    this.rangeSelectionController.reset()
    this.focusedCell.reset()
    this.copiedRange.reset()
    const cell = this.instance.renderer.findCellByMouseEvent(e)
    if (cell) {
      this.focusedCell.highlight({ cell, state: this.instance.state })
      if (!this.isInputVisible()) {
        this.startSelection(cell)
      }
    }
    this.instance.renderer.render()
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.rangeSelectionController.hasStarted) {
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
    if (this.selectedRange.range) {
      let { rowStart, rowEnd, columnStart, columnEnd } = this.selectedRange.range
      if (this.instance.state.options.isRowNumberVisible) {
        columnStart -= 1
        columnEnd -= 1
      }
      if (this.instance.state.hasColumnNames) {
        rowStart -= 1
        rowEnd -= 1
      }
      const data = this.instance.state.options.data.slice(rowStart, rowEnd + 1)
      const rows = data.map((row) => row.slice(columnStart, columnEnd + 1).join('\t'))
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(rows.join('\n'))
        this.copiedRange.highlight({ range: this.selectedRange.range, state: this.instance.state })
      } else {
        // eslint-disable-next-line no-console
        console.error(`Unable to copy, navigator.clipboard is not available`)
      }
    }
  }

  private onPaste(e: ClipboardEvent) {
    e.preventDefault()
    this.copiedRange.reset()
    const paste = e.clipboardData?.getData('text')
    const focusedCell = this.focusedCell.cell
    if (paste && focusedCell) {
      let escapedPaste = paste
      // identify all cells containing quoted text and newlines (e.g., "row1\nrow2")
      // then, replace newlines with a placeholder to properly parse rows and columns from paste
      // and finally, restore the newlines in the final values of the modified cells
      const NEW_LINE_PLACEHOLDER = '/n'
      const matches = paste.matchAll(/"([\w\n]+)"/g)
      for (const match of matches) {
        const substr = match?.[1] // match in group 1 (text without quotes)
        if (substr) {
          const replacement = substr.split('\n').join(NEW_LINE_PLACEHOLDER)
          escapedPaste = escapedPaste.replace(match[0], replacement)
        }
      }

      const modifiedCells: ModifiedCell[] = []
      escapedPaste.split('\n').forEach((row, rowIndex) => {
        row.split('\t').forEach((cell, columnIndex) => {
          modifiedCells.push({
            rowIndex: focusedCell.rowIndex + rowIndex,
            columnIndex: focusedCell.columnIndex + columnIndex,
            value: cell.split(NEW_LINE_PLACEHOLDER).join('\n'),
          })
        })
      })
      this.onUpdate(modifiedCells)
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
    if (this.rangeSelectionController.hasStarted && !(e.shiftKey && isArrowKey)) {
      this.endSelection()
    }
  }

  private onKeyDown(e: KeyboardEvent) {
    const isCopy = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c'
    const isPaste = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v'
    if (this.focusedCell.cell && !this.isInputVisible() && !isPaste && !isCopy) {
      e.preventDefault()
      let newFocusedCell: Cell = {
        rowIndex: this.focusedCell.cell.rowIndex,
        columnIndex: this.focusedCell.cell.columnIndex,
      }

      // arrows
      let isArrowKey = false
      switch (e.key) {
        case 'ArrowUp': {
          // move focus up
          newFocusedCell = getAboveCell({ cell: this.focusedCell.cell, state: this.instance.state })
          isArrowKey = true
          break
        }
        case 'ArrowDown': {
          // move focus down
          newFocusedCell = getBelowCell({ cell: this.focusedCell.cell, state: this.instance.state })
          isArrowKey = true
          break
        }
        case 'ArrowLeft': {
          // move focus left
          newFocusedCell = getLeftCell({ cell: this.focusedCell.cell, state: this.instance.state })
          isArrowKey = true
          break
        }
        case 'ArrowRight': {
          // move focus right
          newFocusedCell = getRightCell({ cell: this.focusedCell.cell, state: this.instance.state })
          isArrowKey = true
          break
        }
      }

      // backspace
      if (e.key === 'Backspace') {
        // clear selected cell
        this.onUpdate([{ ...newFocusedCell, value: '' }])
      }

      // tab
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // same as arrowLeft
          newFocusedCell = getLeftCell({ cell: this.focusedCell.cell, state: this.instance.state })
        } else {
          // same as arrowRight
          newFocusedCell = getRightCell({ cell: this.focusedCell.cell, state: this.instance.state })
        }
      }

      // shift + arrow
      if (e.shiftKey && isArrowKey && !this.rangeSelectionController.hasStarted) {
        this.selectedRange.reset()
        this.rangeSelectionController.reset()
        this.instance.renderer.render()
        this.startSelection(this.focusedCell.cell)
      }

      // any key EXCEPT following
      if (
        !(
          e.metaKey ||
          e.altKey ||
          e.ctrlKey ||
          e.shiftKey ||
          isArrowKey ||
          e.key === 'Escape' ||
          e.key === 'Backspace' ||
          e.key === 'Tab'
        ) &&
        this.isCellEditable(newFocusedCell) &&
        !this.inputController.isInputFieldVisible()
      ) {
        // show input
        const newFocusedCellInfo = getCellInfo({ cell: newFocusedCell, state: this.instance.state })
        this.inputController.showInput(newFocusedCellInfo)
        if (e.key !== 'Enter') {
          this.inputController.setValue(this.inputController.getValue() + e.key)
        }
      }

      if (
        newFocusedCell.rowIndex !== this.focusedCell.cell.rowIndex ||
        newFocusedCell.columnIndex !== this.focusedCell.cell.columnIndex
      ) {
        // actualize focused cell
        this.focusedCell.highlight({ cell: newFocusedCell, state: this.instance.state })
      }

      if (e.shiftKey) {
        // update selection
        if (this.rangeSelectionController.hasStarted && this.updateSelection(newFocusedCell)) {
          this.instance.renderer.render()
        }
      } else if (!(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey)) {
        // clear selection
        this.selectedRange.reset()
        this.rangeSelectionController.reset()
        this.instance.renderer.render()
      }
    }
  }

  private onPointerDown(e: PointerEvent) {
    // Only trigger on actual touch taps, ignoring mouse clicks
    if (e.pointerType === 'touch') {
      const now = new Date().getTime()
      this.isDoubleTap = now - this.pointerDownTime < 300
      this.pointerDownTime = now
      setTimeout(() => {
        this.pointerDownTime = 0
        this.isDoubleTap = false
      }, 300)
    }
  }

  private onPointerUp(e: PointerEvent) {
    if (e.pointerType === 'touch' && this.pointerDownTime) {
      this.selectedRange.reset()
      this.rangeSelectionController.reset()
      this.focusedCell.reset()
      this.copiedRange.reset()
      const cell = this.instance.renderer.findCellByMouseEvent(e)
      if (cell) {
        this.focusedCell.highlight({ cell, state: this.instance.state })
        if (this.isDoubleTap && this.isCellEditable(cell)) {
          const cellInfo = getCellInfo({ cell, state: this.instance.state })
          this.inputController.showInput(cellInfo)
        }
      }
      this.instance.renderer.render()
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
    this.rangeSelectionController.selectionStart(cell)
  }

  private updateSelection(cell: Cell) {
    return this.rangeSelectionController.selectionUpdate(cell)
  }

  private endSelection() {
    this.rangeSelectionController.selectionEnd()
    this.selectedRange.highlight({
      range: this.rangeSelectionController.selectionRange,
      state: this.instance.state,
    })
  }
}
