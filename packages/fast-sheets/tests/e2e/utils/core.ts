import { type Page } from '@playwright/test'
import { type Column } from 'lib/core'
import { generateData } from 'tests/utils/generators.ts'

export const initFastSheets = async ({
  page,
  rowsCount,
  columns,
  isRowNumberVisible = false,
}: {
  page: Page
  rowsCount: number
  columns: Column[]
  isRowNumberVisible: boolean
}) => {
  await page.waitForFunction(() => window.isFixtureReady === true)

  const data = generateData(rowsCount, columns.length)
  await page.getByTestId('fast-sheets').evaluate(
    (elContainer: HTMLElement, { data, columns, isRowNumberVisible }) => {
      window.updates = []

      window.fastSheets = new window.FastSheets({ elContainer, data, columns, isRowNumberVisible })
      const editablePlugin = new window.FastSheetsEditablePlugin({
        onUpdate(cells) {
          window.updates.push(cells)
        },
      })
      window.fastSheets.use(editablePlugin)
    },
    { data, columns, isRowNumberVisible },
  )
  await page.waitForFunction(
    (rowsCount) => window.fastSheets.state.rowHeights.length === rowsCount,
    rowsCount,
  )
}
