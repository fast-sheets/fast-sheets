import { type Page } from '@playwright/test'
import { generateData } from 'tests/utils/generators.ts'
import type { Column } from 'lib/core'

interface InitOptions {
  page: Page
  rowsCount: number
  columns: Column[]
  isRowNumberVisible: boolean
  canAddRows?: boolean
  canAddColumns?: boolean
}

const init = async ({
  page,
  rowsCount,
  columns,
  isRowNumberVisible = false,
  canAddRows = false,
  canAddColumns = false,
  isEditable,
}: InitOptions & { isEditable: boolean }) => {
  await page.waitForFunction(() => window.isFixtureReady === true)
  const data = generateData(rowsCount, columns.length)
  await page.getByTestId('fast-sheets').evaluate(
    (
      elContainer: HTMLElement,
      { data, columns, isRowNumberVisible, canAddRows, canAddColumns, isEditable },
    ) => {
      window.fastSheets = new window.FastSheets({ elContainer, data, columns, isRowNumberVisible })
      if (isEditable) {
        window.updates = []
        window.rowsAndColumnsCalls = []
        window.fastSheetsEditablePlugin = new window.FastSheetsEditablePlugin({
          onUpdate(cells) {
            window.updates.push(cells)
            window.fastSheets.updateCells(cells)
          },
          canAddRows,
          canAddColumns,
          onInsertRows(index, count) {
            window.rowsAndColumnsCalls.push({ callback: 'onInsertRows', index, count })
            window.fastSheets.insertRows(index, count)
          },
          onRemoveRows(index, count) {
            window.rowsAndColumnsCalls.push({ callback: 'onRemoveRows', index, count })
            window.fastSheets.removeRows(index, count)
          },
          onInsertColumns(index, count) {
            window.rowsAndColumnsCalls.push({ callback: 'onInsertColumns', index, count })
            window.fastSheets.insertColumns(index, count)
          },
          onRemoveColumns(index, count) {
            window.rowsAndColumnsCalls.push({ callback: 'onRemoveColumns', index, count })
            window.fastSheets.removeColumns(index, count)
          },
        })
        window.fastSheets.use(window.fastSheetsEditablePlugin)
      }
    },
    { data, columns, isRowNumberVisible, canAddRows, canAddColumns, isEditable },
  )
  await page.waitForFunction(
    (rowsCount) => window.fastSheets.state.rowHeights.length === rowsCount,
    rowsCount,
  )
}

/** a core-only grid, without plugins */
export const initFastSheets = (options: InitOptions) => init({ ...options, isEditable: false })

/**
 * a grid with the editable plugin; its updates are collected in `window.updates`,
 * and its rows and columns callbacks in `window.rowsAndColumnsCalls`
 */
export const initFastSheetsWithEditable = (options: InitOptions) =>
  init({ ...options, isEditable: true })
