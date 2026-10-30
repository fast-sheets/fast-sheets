import type { FastSheets } from 'lib/core/FastSheets.ts'
import type { ModifiedCell, CellsRange, Cell, CellStyle, GridEvent } from 'lib/core/types.ts'
import type { ContextMenuLabels, Options, RawOptions } from './types.ts'
import {
  BORDER_STYLE,
  DEFAULT_INPUT_FONT,
  DEFAULT_SELECTED_HEADING_BACKGROUND_COLOR,
  DEFAULT_SELECTION_BACKGROUND_COLOR,
  DEFAULT_SELECTION_COLOR,
} from 'lib/core/constants.ts'
import { isLeftMouseButton, isScrollbarHovered } from 'lib/core/utils/mouse.ts'
import { mergeOptions } from 'lib/core/utils/options.ts'
import {
  isArrowKey,
  isCharacterKey,
  isClearKey,
  isSelectAllShortcut,
} from 'lib/core/utils/keyboard.ts'
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
  isColumnHeading,
  isCornerCell,
  isDataCell,
  isRowNumbering,
} from 'lib/core/utils/cell.ts'
import { parseClipboardText, stringifyCellsRange } from 'lib/core/utils/clipboard.ts'
import type { FastSheetsPlugin } from 'lib/core/utils/plugins.ts'
import { TouchDetector } from 'lib/core/utils/TouchDetector.ts'
import { ContextMenu, type ContextMenuItem } from 'lib/core/elements/ContextMenu.ts'
import { formatNounWithNumber } from 'lib/core/utils/string.ts'
import {
  getCellAfterColumnInsertion,
  getCellAfterColumnRemoval,
  getCellAfterRowInsertion,
  getCellAfterRowRemoval,
} from 'lib/core/utils/rows-and-columns.ts'

/** What a selection by mouse covers: a range of cells, or whole columns or rows picked by their headings. */
type SelectionType = 'cells' | 'columns' | 'rows'

const DEFAULT_OPTIONS = {
  selectionColor: DEFAULT_SELECTION_COLOR,
  canEditCell: () => true,
  canAddRows: false,
  canAddColumns: false,
}

const DEFAULT_CONTEXT_MENU_LABELS: ContextMenuLabels = {
  insertRowsAbove: (count) => `Insert ${formatNounWithNumber(count, 'row', 'rows')} above`,
  insertRowsBelow: (count) => `Insert ${formatNounWithNumber(count, 'row', 'rows')} below`,
  deleteRows: (count) => `Delete ${formatNounWithNumber(count, 'row', 'rows')}`,
  insertColumnsLeft: (count) => `Insert ${formatNounWithNumber(count, 'column', 'columns')} left`,
  insertColumnsRight: (count) => `Insert ${formatNounWithNumber(count, 'column', 'columns')} right`,
  deleteColumns: (count) => `Delete ${formatNounWithNumber(count, 'column', 'columns')}`,
}

export class FastSheetsEditablePlugin implements FastSheetsPlugin {
  name = 'editable'

  options: Options

  instance!: FastSheets

  elEditableContainerFront: HTMLDivElement
  elEditableContainerBack: HTMLDivElement
  selectedRange: HighlightedRange
  copiedRange: HighlightedRange
  rangeSelectionController: RangeSelectionController
  focusedCell: HighlightedCell
  inputController: InputController
  contextMenu: ContextMenu

  readonly #touchDetector = new TouchDetector()

  #selectionType: SelectionType = 'cells'

  readonly #boundCopy: (e: ClipboardEvent) => void
  readonly #boundPaste: (e: ClipboardEvent) => void

  constructor(options: RawOptions) {
    this.options = {
      ...mergeOptions(DEFAULT_OPTIONS, options),
      // merged one by one, so that an app can replace only some of the texts
      labels: {
        contextMenu: mergeOptions(DEFAULT_CONTEXT_MENU_LABELS, options.labels?.contextMenu ?? {}),
      },
    }

    this.#boundCopy = this.#onCopy.bind(this)
    this.#boundPaste = this.#onPaste.bind(this)

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

    // context menu
    this.contextMenu = new ContextMenu({
      name: 'elContextMenu',
      onClose: () => {
        this.instance?.state.options.elContainer.focus({ preventScroll: true })
      },
    })
  }

  // noinspection JSUnusedGlobalSymbols
  setup(instance: FastSheets) {
    this.instance = instance

    this.init(instance)
    this.bindEvents(instance)
  }

  destroy() {
    this.unbindEvents(this.instance)
    this.contextMenu.destroy()
    this.inputController.destroy()
    this.copiedRange.destroy()
    this.focusedCell.destroy()
    this.selectedRange.destroy()
    this.elEditableContainerFront.remove()
    this.elEditableContainerBack.remove()
    this.instance.unregister(this.name)
  }

  init(instance: FastSheets) {
    // elEditableContainerBack should be before scroll
    instance.state.options.elScroll.before(this.elEditableContainerBack)

    // elEditableContainerFront should be after scroll
    instance.state.options.elScroll.after(this.elEditableContainerFront)
  }

  bindEvents(instance: FastSheets) {
    // copy & paste; the core passes the mouse, pointer, key and scroll events to the hooks
    instance.state.options.elContainer.addEventListener('copy', this.#boundCopy)
    instance.state.options.elContainer.addEventListener('paste', this.#boundPaste)
    // input
    this.inputController.bindEvents(this.instance.state)
  }

  unbindEvents(instance: FastSheets) {
    // copy & paste
    instance.state.options.elContainer.removeEventListener('copy', this.#boundCopy)
    instance.state.options.elContainer.removeEventListener('paste', this.#boundPaste)
    // input
    this.inputController.unbindEvents()
  }

  afterFrameRender() {
    this.#updateContainerPosition()
  }

  cellStyle(cell: Readonly<Cell>, style: CellStyle) {
    if (isDataCell(cell)) {
      const selection = this.rangeSelectionController
      if (selection.isCellSelected(cell) && selection.selectedCellsCount() > 1) {
        style.backgroundColor = DEFAULT_SELECTION_BACKGROUND_COLOR
      }
      return
    }
    if (isCornerCell(cell)) {
      return
    }
    const isSelected = isColumnHeading(cell)
      ? this.#isColumnSelected(cell.columnIndex)
      : this.#isRowSelected(cell.rowIndex)
    if (isSelected) {
      style.backgroundColor = DEFAULT_SELECTED_HEADING_BACKGROUND_COLOR
    }
  }

  /** Whether the column has the focused cell or a selected one, so its heading is highlighted. */
  #isColumnSelected(columnIndex: number) {
    const selection = this.rangeSelectionController
    const range = selection.selectionRange
    return (
      this.focusedCell.cell?.columnIndex === columnIndex ||
      (!selection.isEmpty() && columnIndex >= range.columnStart && columnIndex <= range.columnEnd)
    )
  }

  /** Whether the row has the focused cell or a selected one, so its number is highlighted. */
  #isRowSelected(rowIndex: number) {
    const selection = this.rangeSelectionController
    const range = selection.selectionRange
    return (
      this.focusedCell.cell?.rowIndex === rowIndex ||
      (!selection.isEmpty() && rowIndex >= range.rowStart && rowIndex <= range.rowEnd)
    )
  }

  onScroll(e: Event) {
    this.#touchDetector.saveScroll(e)
  }

  afterLayout() {
    // the cells may have moved, so the editor follows its cell and keeps what was typed
    const editedCell = this.inputController.cellInfo?.cell
    if (editedCell && this.#isInputVisible()) {
      const cellInfo = getCellInfo(editedCell, this.instance.state)
      this.inputController.placeInput(cellInfo)
    }
    // sizes changed, so render the selection again at its new place
    this.#endSelection()
    if (this.focusedCell.cell) {
      this.focusedCell.highlight({ cell: this.focusedCell.cell, state: this.instance.state })
    }
  }

  afterInsertRow(index: number) {
    this.#placeCells(
      getCellAfterRowInsertion(this.inputController.cellInfo?.cell, index),
      getCellAfterRowInsertion(this.focusedCell.cell, index),
    )
  }

  afterRemoveRow(index: number) {
    this.#placeCells(
      getCellAfterRowRemoval(this.inputController.cellInfo?.cell, index),
      getCellAfterRowRemoval(this.focusedCell.cell, index),
    )
  }

  afterInsertColumn(index: number) {
    this.#placeCells(
      getCellAfterColumnInsertion(this.inputController.cellInfo?.cell, index),
      getCellAfterColumnInsertion(this.focusedCell.cell, index),
    )
  }

  afterRemoveColumn(index: number) {
    this.#placeCells(
      getCellAfterColumnRemoval(this.inputController.cellInfo?.cell, index),
      getCellAfterColumnRemoval(this.focusedCell.cell, index),
    )
  }

  /**
   * Moves the open editor and the focus to their new cells, after a row or column was inserted or removed.
   * An undefined cell was removed: the editor closes, and the focus goes to the cell that took its place.
   * The selection may no longer cover the same cells, so it is cleared.
   */
  #placeCells(newEditedCell: Cell | undefined, newFocusedCell: Cell | undefined) {
    const { data, columns } = this.instance.state.options
    const editedCellInfo = this.inputController.cellInfo
    if (editedCellInfo) {
      if (newEditedCell) {
        editedCellInfo.cell = newEditedCell
      } else {
        // the edited cell is gone, so is what was typed into it
        this.inputController.cellInfo = null
        this.inputController.hideInput()
      }
    }
    const focusedCell = this.focusedCell.cell
    if (focusedCell) {
      const cell = newFocusedCell || {
        // the row or column that took the place of the removed one, or the last one
        rowIndex: Math.min(focusedCell.rowIndex, data.length - 1),
        columnIndex: Math.min(focusedCell.columnIndex, columns.length - 1),
      }
      if (cell.rowIndex < 0 || cell.columnIndex < 0) {
        this.focusedCell.reset()
      } else {
        // highlighted after the new layout
        this.focusedCell.cell = cell
      }
    }
    this.selectedRange.reset()
    this.rangeSelectionController.reset()
    this.copiedRange.reset()
  }

  /** Reports edits to the app, which applies accepted changes using `instance.updateCells()`. */
  onUpdate(modifiedCells: ModifiedCell[]) {
    if (modifiedCells.length) {
      this.options.onUpdate([...modifiedCells])
    }
  }

  selectAllCells() {
    const state = this.instance.state
    const rowsCount = state.rowHeights.length
    const columnsCount = state.columnWidths.length
    if (!rowsCount || !columnsCount) {
      return
    }
    const range: CellsRange = {
      rowStart: 0,
      rowEnd: rowsCount - 1,
      columnStart: 0,
      columnEnd: columnsCount - 1,
    }
    this.rangeSelectionController.selectRange(range)
    this.selectedRange.highlight({ range, state })
    if (!this.focusedCell.cell) {
      this.focusedCell.highlight({ cell: { rowIndex: 0, columnIndex: 0 }, state })
    }
    this.instance.renderer.render()
  }

  onDoubleClick({ native: e }: GridEvent<MouseEvent>) {
    if (this.#isInInput(e.target) || this.#touchDetector.isGhostMouseEvent(e)) {
      return
    }
    const cell = this.#findDataCell(e)
    if (cell) {
      this.#startEditing(cell)
    }
  }

  onMouseDown({ native: e }: GridEvent<MouseEvent>) {
    // Lets the browser handle presses inside the editor, such as placing the caret
    if (this.#isInInput(e.target)) {
      return
    }
    if (this.#touchDetector.isGhostMouseEvent(e)) {
      if (this.#isInputVisible()) {
        // a double tap opened the editor: focusing the grid under the finger would close it
        e.preventDefault()
      }
      return
    }
    if (!isLeftMouseButton(e)) {
      return
    }
    // a press on a scrollbar only scrolls, so the selection stays
    if (isScrollbarHovered(e, this.instance.state.options.elScroll)) {
      return
    }
    this.selectedRange.reset()
    this.rangeSelectionController.reset()
    this.focusedCell.reset()
    this.copiedRange.reset()
    const cell = this.#findCell(e)
    if (cell) {
      if (isDataCell(cell)) {
        this.focusedCell.highlight({ cell, state: this.instance.state })
        if (!this.#isInputVisible()) {
          this.#startSelection(cell)
        }
      } else if (isCornerCell(cell)) {
        this.selectAllCells()
      } else {
        // dragging over the other headings selects more columns or rows
        this.#startHeadingSelection(cell)
      }
    }
    this.instance.renderer.render()
  }

  onMouseMove({ native: e }: GridEvent<MouseEvent>) {
    if (!this.rangeSelectionController.hasStarted) {
      return
    }
    // whole columns or rows follow the pointer over the headings too
    const cell = this.#selectionType === 'cells' ? this.#findDataCell(e) : this.#findCell(e)
    if (cell && this.#updateSelection(cell)) {
      this.instance.renderer.render()
    }
  }

  onMouseUp() {
    if (this.rangeSelectionController.hasStarted) {
      this.#endSelection()
    }
  }

  #onCopy(e: ClipboardEvent) {
    if (this.#isInputVisible()) {
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
      navigator.clipboard.writeText(text).then(
        () => this.copiedRange.highlight({ range, state }),
        () => {
          // eslint-disable-next-line no-console
          console.error(`Unable to copy, navigator.clipboard is not available`)
        },
      )
    }
  }

  #onPaste(e: ClipboardEvent) {
    if (this.#isInputVisible()) {
      // let the browser paste into the cell editor
      return
    }
    e.preventDefault()
    this.copiedRange.reset()
    const paste = e.clipboardData?.getData('text')
    const focusedCell = this.focusedCell.cell
    if (paste && focusedCell) {
      const modifiedCells: ModifiedCell[] = []
      parseClipboardText(paste).forEach((row, rowIndex) => {
        row.forEach((value, columnIndex) => {
          const cell = {
            rowIndex: focusedCell.rowIndex + rowIndex,
            columnIndex: focusedCell.columnIndex + columnIndex,
          }
          if (this.options.canEditCell(cell)) {
            modifiedCells.push({ ...cell, value })
          }
        })
      })
      if (modifiedCells.length) {
        this.onUpdate(modifiedCells)
      }
    }
  }

  onKeyUp({ native: e }: GridEvent<KeyboardEvent>) {
    if (this.rangeSelectionController.hasStarted && !(e.shiftKey && isArrowKey(e))) {
      this.#endSelection()
    }
  }

  onKeyDown({ native: e }: GridEvent<KeyboardEvent>) {
    if (this.#isInInput(e.target)) {
      // the input handles its own keys; an Enter that closed it must not open it again
      return
    }
    if (this.#isInputVisible()) {
      return
    }
    if (isSelectAllShortcut(e)) {
      e.preventDefault()
      this.selectAllCells()
      return
    }
    const focusedCell = this.focusedCell.cell
    if (!focusedCell) {
      return
    }

    const hasCommandModifier = e.ctrlKey || e.metaKey || e.altKey
    const isArrow = isArrowKey(e)
    const isMove = (isArrow || e.key === 'Tab') && !hasCommandModifier
    const isClear = isClearKey(e)
    const isEditStart = e.key === 'Enter' && !hasCommandModifier && !e.shiftKey
    const isCharacter = isCharacterKey(e)
    if (!isMove && !isClear && !isEditStart && !isCharacter) {
      // leave shortcuts (copy, paste, reload...) and keys the grid does not use to the browser
      return
    }
    e.preventDefault()

    let newFocusedCell: Cell = focusedCell
    if (isMove) {
      const { state } = this.instance
      switch (e.key) {
        case 'ArrowUp':
          newFocusedCell = getAboveCell(focusedCell)
          break
        case 'ArrowDown':
          newFocusedCell = getBelowCell(focusedCell, state)
          break
        case 'ArrowLeft':
          newFocusedCell = getLeftCell(focusedCell)
          break
        case 'ArrowRight':
          newFocusedCell = getRightCell(focusedCell, state)
          break
        case 'Tab':
          newFocusedCell = e.shiftKey ? getLeftCell(focusedCell) : getRightCell(focusedCell, state)
          break
      }
    }

    if (isClear) {
      this.#clearSelectedCells()
    }

    const isRangeSelection = e.shiftKey && isArrow
    if (isRangeSelection && !this.rangeSelectionController.hasStarted) {
      this.selectedRange.reset()
      this.rangeSelectionController.reset()
      this.#startSelection(focusedCell)
    }

    if (isEditStart || isCharacter) {
      const isEditing = this.#startEditing(focusedCell)
      if (isEditing && isCharacter) {
        this.inputController.setValue(e.key)
      }
    }

    if (
      newFocusedCell.rowIndex !== focusedCell.rowIndex ||
      newFocusedCell.columnIndex !== focusedCell.columnIndex
    ) {
      this.focusedCell.highlight({ cell: newFocusedCell, state: this.instance.state })
    }

    if (isRangeSelection) {
      this.#updateSelection(newFocusedCell)
    } else if (!isClear) {
      // the cleared cells stay selected
      this.selectedRange.reset()
      this.rangeSelectionController.reset()
    }
    this.instance.renderer.render()
  }

  onContextMenu(event: GridEvent<MouseEvent>) {
    const e = event.native
    const { canAddRows, canAddColumns } = this.options
    // the browser menu stays for the cell editor, so that its text can be cut, copied and pasted
    if ((!canAddRows && !canAddColumns) || this.#isInInput(e.target)) {
      return
    }
    const cell = this.#findCell(e)
    if (!cell || isCornerCell(cell)) {
      return
    }
    if (this.#isInputVisible()) {
      this.inputController.commitInput()
    }
    // like a left click, a right click outside the selection selects the cell, column or row under it
    if (!this.#isInSelection(cell)) {
      this.selectedRange.reset()
      this.rangeSelectionController.reset()
      this.focusedCell.reset()
      if (isDataCell(cell)) {
        this.focusedCell.highlight({ cell, state: this.instance.state })
      } else {
        this.#startHeadingSelection(cell)
        this.#endSelection()
      }
    }
    this.instance.renderer.render()

    const items = this.#getContextMenuItems(cell)
    if (!items.length) {
      return
    }
    e.preventDefault()
    event.stop()
    this.contextMenu.show({ items, clientX: e.clientX, clientY: e.clientY })
  }

  /** Whether the cell is the focused cell, or a selected cell, column or row. */
  #isInSelection(cell: Cell) {
    if (isColumnHeading(cell)) {
      return this.#isColumnSelected(cell.columnIndex)
    }
    if (isRowNumbering(cell)) {
      return this.#isRowSelected(cell.rowIndex)
    }
    const focusedCell = this.focusedCell.cell
    return (
      (focusedCell?.rowIndex === cell.rowIndex && focusedCell.columnIndex === cell.columnIndex) ||
      (!this.rangeSelectionController.isEmpty() &&
        this.rangeSelectionController.isCellSelected(cell))
    )
  }

  /**
   * The items to insert or delete the rows and the columns of the selection, or of the focused cell.
   * Each item reports to the app, which applies the change, see the `onInsertRows` option and the like.
   * A column-heading has only the column items, and a row-numbering cell only the row items.
   */
  #getContextMenuItems(cell: Cell): ContextMenuItem[] {
    const focusedCell = this.focusedCell.cell
    if (!focusedCell) {
      return []
    }
    const range = this.selectedRange.isEmpty()
      ? convertCellToRange(focusedCell)
      : this.selectedRange.range
    const { data, columns } = this.instance.state.options
    const labels = this.options.labels.contextMenu
    const items: ContextMenuItem[] = []

    if (this.options.canAddRows && !isColumnHeading(cell)) {
      const count = range.rowEnd - range.rowStart + 1
      items.push(
        {
          label: labels.insertRowsAbove(count),
          action: () => this.options.onInsertRows?.(range.rowStart, count),
        },
        {
          label: labels.insertRowsBelow(count),
          action: () => this.options.onInsertRows?.(range.rowEnd + 1, count),
        },
        {
          label: labels.deleteRows(count),
          action: () => this.options.onRemoveRows?.(range.rowStart, count),
          // the grid keeps at least one row, so that a menu can open on it
          isDisabled: count >= data.length,
        },
      )
    }

    if (this.options.canAddColumns && !isRowNumbering(cell)) {
      const count = range.columnEnd - range.columnStart + 1
      items.push(
        {
          label: labels.insertColumnsLeft(count),
          action: () => this.options.onInsertColumns?.(range.columnStart, count),
        },
        {
          label: labels.insertColumnsRight(count),
          action: () => this.options.onInsertColumns?.(range.columnEnd + 1, count),
        },
        {
          label: labels.deleteColumns(count),
          action: () => this.options.onRemoveColumns?.(range.columnStart, count),
          // the grid keeps at least one column, so that a menu can open on it
          isDisabled: count >= columns.length,
        },
      )
    }
    return items
  }

  onPointerDown({ native: e }: GridEvent<PointerEvent>) {
    // only a finger taps; the mouse is handled by the mouse events
    if (e.pointerType !== 'touch' || !e.isPrimary) {
      return
    }
    if (this.#isInInput(e.target)) {
      this.#touchDetector.cancel()
      return
    }
    // any cell, headings included, so that a tap on the top-left corner selects all cells
    this.#touchDetector.savePointerDown(e, this.#findCell(e))
  }

  onPointerUp({ native: e }: GridEvent<PointerEvent>) {
    const { isTap, isDoubleTap, targetCell } = this.#touchDetector.getTapInfo(e)
    if (!isTap) {
      return
    }
    this.selectedRange.reset()
    this.rangeSelectionController.reset()
    this.focusedCell.reset()
    this.copiedRange.reset()
    const isTapOnDataCell = !!targetCell && isDataCell(targetCell)
    const isTapCornerCell = !!targetCell && isCornerCell(targetCell)
    const isEditing = isTapOnDataCell && isDoubleTap && this.#startEditing(targetCell)
    if (!isEditing) {
      if (this.#isInputVisible()) {
        this.inputController.commitInput()
      } else {
        // Focuses the grid for keyboard input, since browsers may skip the mouse events of a tap
        this.instance.state.options.elContainer.focus({ preventScroll: true })
      }
    }
    if (isTapOnDataCell) {
      this.focusedCell.highlight({ cell: targetCell, state: this.instance.state })
    } else if (isTapCornerCell) {
      this.selectAllCells()
    } else if (targetCell) {
      // a column-heading or a row-numbering cell
      this.#startHeadingSelection(targetCell)
      this.#endSelection()
    }
    this.instance.renderer.render()
  }

  onPointerCancel() {
    this.#touchDetector.cancel()
  }

  /**
   * Opens the cell editor.
   * Returns false when the canEditCell option doesn't let the cell be edited.
   */
  #startEditing(cell: Cell) {
    if (!this.options.canEditCell(cell)) {
      return false
    }
    this.inputController.showInput(getCellInfo(cell, this.instance.state))
    return true
  }

  /** Empties the selected range or the focused cell when no range is selected. */
  #clearSelectedCells() {
    if (!this.focusedCell.cell) {
      return
    }

    const range = this.selectedRange.isEmpty()
      ? convertCellToRange(this.focusedCell.cell)
      : this.selectedRange.range

    const modifiedCells: ModifiedCell[] = []
    for (let rowIndex = range.rowStart; rowIndex <= range.rowEnd; rowIndex++) {
      for (let columnIndex = range.columnStart; columnIndex <= range.columnEnd; columnIndex++) {
        const modifiedCell = { rowIndex, columnIndex, value: '' }
        if (this.options.canEditCell(modifiedCell)) {
          modifiedCells.push(modifiedCell)
        }
      }
    }
    if (modifiedCells.length) {
      this.onUpdate(modifiedCells)
    }
  }

  /** The cell under the pointer (headings included), or undefined outside the cells. */
  #findCell(e: MouseEvent) {
    return this.instance.layout.findCellAtPoint(e.clientX, e.clientY)
  }

  /** A data cell under the pointer, or undefined over a heading or outside the cells. */
  #findDataCell(e: MouseEvent) {
    return this.instance.layout.findDataCellAtPoint(e.clientX, e.clientY)
  }

  #isInputVisible() {
    return this.inputController.isInputFieldVisible()
  }

  #updateContainerPosition() {
    if (this.elEditableContainerFront) {
      this.elEditableContainerFront.style.top = `-${this.instance.state.options.elScroll.scrollTop || 0}px`
      this.elEditableContainerFront.style.left = `-${this.instance.state.options.elScroll.scrollLeft || 0}px`
    }
    if (this.elEditableContainerBack) {
      this.elEditableContainerBack.style.top = `-${this.instance.state.options.elScroll.scrollTop || 0}px`
      this.elEditableContainerBack.style.left = `-${this.instance.state.options.elScroll.scrollLeft || 0}px`
    }
  }

  #startSelection(cell: Cell, type: SelectionType = 'cells') {
    this.#selectionType = type
    this.rangeSelectionController.selectionStart(cell)
  }

  /**
   * Selects the whole column of a column-heading or the whole row of a row-numbering cell,
   * and focuses its first cell.
   */
  #startHeadingSelection(cell: Cell) {
    const state = this.instance.state
    if (!state.rowHeights.length || !state.columnWidths.length) {
      return
    }
    const isColumn = isColumnHeading(cell)
    const firstCell: Cell = isColumn
      ? { rowIndex: 0, columnIndex: cell.columnIndex }
      : { rowIndex: cell.rowIndex, columnIndex: 0 }
    this.focusedCell.highlight({ cell: firstCell, state })
    this.#startSelection(firstCell, isColumn ? 'columns' : 'rows')
    this.#updateSelection(cell)
  }

  /**
   * Extends the selection to the cell.
   * Selecting columns or rows, it extends them to the column or the row of the cell, if it has one.
   */
  #updateSelection(cell: Cell) {
    const state = this.instance.state
    if (this.#selectionType === 'columns') {
      if (isRowNumbering(cell) || isCornerCell(cell)) {
        return false
      }
      // the pivot is in the first row, so the range covers all rows
      cell = { rowIndex: state.rowHeights.length - 1, columnIndex: cell.columnIndex }
    } else if (this.#selectionType === 'rows') {
      if (isColumnHeading(cell) || isCornerCell(cell)) {
        return false
      }
      // the pivot is in the first column, so the range covers all columns
      cell = { rowIndex: cell.rowIndex, columnIndex: state.columnWidths.length - 1 }
    }
    return this.rangeSelectionController.selectionUpdate(cell)
  }

  #endSelection() {
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

  #isInInput(target: EventTarget | null) {
    return this.inputController.inputField.contains(target)
  }
}
