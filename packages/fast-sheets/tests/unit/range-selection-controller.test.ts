import { describe, expect, it } from 'vitest'
import { RangeSelectionController } from 'lib/core/controllers/RangeSelectionController.ts'

describe('RangeSelectionController', () => {
  it('is empty before anything is selected', () => {
    const controller = new RangeSelectionController()
    expect(controller.isEmpty()).toBe(true)
    expect(controller.selectedCellsCount()).toBe(0)
  })

  it('is empty when a selection was started but not extended', () => {
    const controller = new RangeSelectionController()
    controller.selectionStart({ rowIndex: 1, columnIndex: 1 })
    controller.selectionEnd()
    expect(controller.isEmpty()).toBe(true)
    expect(controller.selectedCellsCount()).toBe(0)
  })

  it('counts the cells of a selected range', () => {
    const controller = new RangeSelectionController()
    controller.selectionStart({ rowIndex: 1, columnIndex: 1 })
    controller.selectionUpdate({ rowIndex: 0, columnIndex: 2 })
    controller.selectionEnd()
    expect(controller.isEmpty()).toBe(false)
    expect(controller.selectedCellsCount()).toBe(4)
  })

  it('is empty again after a reset', () => {
    const controller = new RangeSelectionController()
    controller.selectionStart({ rowIndex: 1, columnIndex: 1 })
    controller.selectionUpdate({ rowIndex: 2, columnIndex: 2 })
    controller.reset()
    expect(controller.isEmpty()).toBe(true)
  })

  it('selects a whole range at once', () => {
    const controller = new RangeSelectionController()
    controller.selectRange({ rowStart: 0, rowEnd: 9, columnStart: 0, columnEnd: 2 })
    expect(controller.hasStarted).toBe(false)
    expect(controller.selectedCellsCount()).toBe(30)
    expect(controller.isCellSelected({ rowIndex: 9, columnIndex: 2 })).toBe(true)
    expect(controller.isCellSelected({ rowIndex: 10, columnIndex: 2 })).toBe(false)
  })
})
