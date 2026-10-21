import type {
  FastSheetsPlugin,
  FastSheetsInstance,
  ModifiedCell,
  CellsRange,
  Cell,
} from 'lib/core/types.ts'
import type { Options, RawOptions } from './types.ts'
import {
  BORDER_STYLE,
  DEFAULT_INPUT_FONT,
  DEFAULT_SELECTION_BACKGROUND_COLOR,
  DEFAULT_SELECTION_COLOR,
} from 'lib/core/constants.ts'
import { isLeftMouseButton } from 'lib/core/utils/mouse.ts'
import { isArrowKey, isCharacterKey } from 'lib/core/utils/keyboard.ts'
import { RangeSelectionController } from 'lib/core/controllers/RangeSelectionController.ts'
import { HighlightedRange } from 'lib/core/elements/HighlightedRange.ts'
import { HighlightedCell } from 'lib/core/elements/HighlightedCell.ts'
import { InputController } from 'lib/core/controllers/InputController.ts'
import {
  getAboveCell,
  getBelowCell,
  getCellInfo,
  getLeftCell,
  convertCellToRange,
  getRightCell,
} from 'lib/core/utils/cell.ts'
import { parseClipboardText, stringifyCellsRange } from 'lib/core/utils/clipboard.ts'

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
  doubleTapTimeoutIds = new Set<ReturnType<typeof setTimeout>>()

  boundDoubleClick: (e: MouseEvent) => void
  boundMouseDown: (e: MouseEvent) => void
  boundMouseUp: (e: MouseEvent) => void
  boundMouseMove: (e: MouseEvent) => void
  boundKeyDown: (e: KeyboardEvent) => void
  boundKeyUp: (e: KeyboardEvent) => void
  boundCopy: (e: ClipboardEvent) => void
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
      font: DEFAULT_INPUT_FONT,
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
  }

  destroy() {
    this.unbindEvents(this.instance)
    this.doubleTapTimeoutIds.forEach(clearTimeout)
    this.doubleTapTimeoutIds.clear()
    this.inputController.destroy()
    this.copiedRange.destroy()
    this.focusedCell.destroy()
    this.selectedRange.destroy()
    this.elEditableContainerFront.remove()
    this.elEditableContainerBack.remove()
    this.instance.unuse(this.name)
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

  public getCellBackgroundColor(cell: Cell, backgroundColor: string) {
    const isInMultiCellSelection =
      this.rangeSelectionController.isCellSelected(cell) &&
      this.rangeSelectionController.selectedCellsCount() > 1
    return isInMultiCellSelection ? DEFAULT_SELECTION_BACKGROUND_COLOR : backgroundColor
  }

  public onResize() {
    if (this.isInputVisible()) {
      // the input is placed for the old sizes, so save what was typed and close it
      this.inputController.commitInput()
    }
    // sizes changed, so draw the selection again at its new place
    this.endSelection()
    if (this.focusedCell.cell) {
      this.focusedCell.highlight({ cell: this.focusedCell.cell, state: this.instance.state })
    }
  }

  public onUpdate(modifiedCells: ModifiedCell[]) {
    this.options.onUpdate([...modifiedCells]) // data could be modified after update
    this.instance.renderer.init() // init needed to recalculate row heights and all dependent sizes
    if (this.focusedCell.cell) {
      this.focusedCell.highlight({ cell: this.focusedCell.cell, state: this.instance.state }) // actualizing focused cell border
    }
    this.instance.renderer.render()
  }

  private onDoubleClick(e: MouseEvent) {
    const cell = this.instance.renderer.findCellByMouseEvent(e)
    if (cell) {
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
    if (this.rangeSelectionController.hasStarted) {
      this.endSelection()
    }
  }

  private async onCopy(e: ClipboardEvent) {
    if (this.isInputVisible()) {
      // let the browser copy the selected text of the cell editor
      return
    }
    const state = this.instance.state
    const focusedCell = this.focusedCell.cell
    let range: CellsRange | undefined
    if (!this.selectedRange.isEmpty()) {
      // a range selected by mouse or shift + arrows
      range = this.selectedRange.range
    } else if (focusedCell) {
      // or just the focused cell alone
      range = convertCellToRange(focusedCell)
    }
    if (!range) {
      return
    }
    const text = stringifyCellsRange({ data: this.instance.state.options.data, range })
    if (!text) {
      return
    }

    if (e.clipboardData) {
      // synchronous and does not need the clipboard permission
      e.clipboardData.setData('text/plain', text)
      e.preventDefault()
      this.copiedRange.highlight({ range, state })
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text)
        this.copiedRange.highlight({ range, state })
      } catch {
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
      const modifiedCells: ModifiedCell[] = []
      parseClipboardText(paste).forEach((row, rowIndex) => {
        row.forEach((value, columnIndex) => {
          modifiedCells.push({
            rowIndex: focusedCell.rowIndex + rowIndex,
            columnIndex: focusedCell.columnIndex + columnIndex,
            value,
          })
        })
      })
      this.onUpdate(modifiedCells)
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    if (this.rangeSelectionController.hasStarted && !(e.shiftKey && isArrowKey(e))) {
      this.endSelection()
    }
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.target instanceof Node && this.inputController.inputField.el.contains(e.target)) {
      // the input handles its own keys; an Enter that closed it must not open it again
      return
    }
    const focusedCell = this.focusedCell.cell
    if (!focusedCell || this.isInputVisible()) {
      return
    }

    const hasCommandModifier = e.ctrlKey || e.metaKey || e.altKey
    const isArrow = isArrowKey(e)
    const isMove = (isArrow || e.key === 'Tab') && !hasCommandModifier
    const isClear = e.key === 'Backspace' && !hasCommandModifier
    const isEditStart = e.key === 'Enter' && !hasCommandModifier && !e.shiftKey
    const isCharacter = isCharacterKey(e)
    if (!isMove && !isClear && !isEditStart && !isCharacter) {
      // leave shortcuts (copy, paste, reload...) and keys the grid does not use to the browser
      return
    }
    e.preventDefault()

    let newFocusedCell: Cell = focusedCell
    if (isMove) {
      const state = this.instance.state
      switch (e.key) {
        case 'ArrowUp':
          newFocusedCell = getAboveCell({ cell: focusedCell })
          break
        case 'ArrowDown':
          newFocusedCell = getBelowCell({ cell: focusedCell, state })
          break
        case 'ArrowLeft':
          newFocusedCell = getLeftCell({ cell: focusedCell })
          break
        case 'ArrowRight':
          newFocusedCell = getRightCell({ cell: focusedCell, state })
          break
        case 'Tab':
          newFocusedCell = e.shiftKey
            ? getLeftCell({ cell: focusedCell })
            : getRightCell({ cell: focusedCell, state })
          break
      }
    }

    if (isClear) {
      this.onUpdate([{ ...focusedCell, value: '' }])
    }

    const isRangeSelection = e.shiftKey && isArrow && isMove
    if (isRangeSelection && !this.rangeSelectionController.hasStarted) {
      this.selectedRange.reset()
      this.rangeSelectionController.reset()
      this.startSelection(focusedCell)
    }

    if (isEditStart || isCharacter) {
      this.inputController.showInput(getCellInfo({ cell: focusedCell, state: this.instance.state }))
      if (isCharacter) {
        this.inputController.setValue(this.inputController.getValue() + e.key)
      }
    }

    if (
      newFocusedCell.rowIndex !== focusedCell.rowIndex ||
      newFocusedCell.columnIndex !== focusedCell.columnIndex
    ) {
      this.focusedCell.highlight({ cell: newFocusedCell, state: this.instance.state })
    }

    if (isRangeSelection) {
      this.updateSelection(newFocusedCell)
    } else {
      this.selectedRange.reset()
      this.rangeSelectionController.reset()
    }
    this.instance.renderer.render()
  }

  private onPointerDown(e: PointerEvent) {
    // Only trigger on actual touch taps, ignoring mouse clicks
    if (e.pointerType === 'touch') {
      const now = new Date().getTime()
      this.isDoubleTap = now - this.pointerDownTime < 300
      this.pointerDownTime = now
      const timeoutId = setTimeout(() => {
        this.doubleTapTimeoutIds.delete(timeoutId)
        this.pointerDownTime = 0
        this.isDoubleTap = false
      }, 300)
      this.doubleTapTimeoutIds.add(timeoutId)
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
        if (this.isDoubleTap) {
          const cellInfo = getCellInfo({ cell, state: this.instance.state })
          this.inputController.showInput(cellInfo)
        }
      }
      this.instance.renderer.render()
    }
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
    if (this.rangeSelectionController.isEmpty()) {
      this.selectedRange.reset()
    } else {
      this.selectedRange.highlight({
        range: this.rangeSelectionController.selectionRange,
        state: this.instance.state,
      })
    }
  }
}
