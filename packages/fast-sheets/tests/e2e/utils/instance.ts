import { type Page } from '@playwright/test'
import { generateData } from 'tests/utils/generators.ts'
import type { Column } from 'lib/core'

interface InitOptions {
  page: Page
  rowsCount: number
  columns: Column[]
  isRowNumberVisible: boolean
}

const init = async ({
  page,
  rowsCount,
  columns,
  isRowNumberVisible = false,
  isEditable,
}: InitOptions & { isEditable: boolean }) => {
  await page.waitForFunction(() => window.isFixtureReady === true)
  const data = generateData(rowsCount, columns.length)
  await page.getByTestId('fast-sheets').evaluate(
    (elContainer: HTMLElement, { data, columns, isRowNumberVisible, isEditable }) => {
      window.fastSheets = new window.FastSheets({ elContainer, data, columns, isRowNumberVisible })
      if (isEditable) {
        window.updates = []
        window.fastSheetsEditablePlugin = new window.FastSheetsEditablePlugin({
          onUpdate(cells) {
            window.updates.push(cells)
          },
        })
        window.fastSheets.use(window.fastSheetsEditablePlugin)
      }
    },
    { data, columns, isRowNumberVisible, isEditable },
  )
  await page.waitForFunction(
    (rowsCount) => window.fastSheets.state.rowHeights.length === rowsCount,
    rowsCount,
  )
}

/** a core-only grid, without plugins */
export const initFastSheets = (options: InitOptions) => init({ ...options, isEditable: false })

/** a grid with the editable plugin; its updates are collected in `window.updates` */
export const initFastSheetsWithEditable = (options: InitOptions) =>
  init({ ...options, isEditable: true })
