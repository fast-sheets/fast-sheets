import { type Page } from '@playwright/test'
import { type Column } from 'lib/core'
import { generateData } from 'tests/utils/generators.ts'

const initFastSheets = async ({
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
      window.fastSheets = new window.FastSheets({ elContainer, data, columns, isRowNumberVisible })
      if (window.fastSheetsEditablePlugin) {
        window.fastSheets.use(window.fastSheetsEditablePlugin)
      }
    },
    { data, columns, isRowNumberVisible },
  )
  await page.waitForFunction(
    (rowsCount) => window.fastSheets.state.rowHeights.length === rowsCount,
    rowsCount,
  )
}

export const initFastSheetsWithPlugins = async ({
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
  await page.evaluate(() => {
    window.updates = []
    window.fastSheetsEditablePlugin = new window.FastSheetsEditablePlugin({
      onUpdate(cells) {
        window.updates.push(cells)
      },
    })
  })
  await initFastSheets({ page, rowsCount, columns, isRowNumberVisible })
}
