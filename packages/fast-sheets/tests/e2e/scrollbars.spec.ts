import { expect, type Page, test } from '@playwright/test'
import { initFastSheetsWithEditable } from 'tests/e2e/utils/instance.ts'
import { getCellMouseCoords } from 'tests/e2e/utils/cell.ts'

// headless Chromium hides the scrollbars by default; this option needs a worker of its own
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } })

const getFocusedCell = (page: Page) =>
  page.evaluate(() => window.fastSheetsEditablePlugin.focusedCell.cell)

/** the selected range, or undefined while its box is hidden */
const getSelectedRange = (page: Page) =>
  page.evaluate(() => {
    const { range, borders } = window.fastSheetsEditablePlugin.selectedRange
    return borders.container.style.display === 'none' ? undefined : { ...range }
  })

test.describe('scrollbars', () => {
  // wider and taller than the 800 x 400 grid, so it has both scrollbars
  const columns = Array.from({ length: 12 }, (_, index) => ({ name: `C${index}`, width: 100 }))

  for (const scrollbar of ['vertical', 'horizontal']) {
    test(`a click on the ${scrollbar} scrollbar keeps the selection`, async ({ page }) => {
      await page.goto('/')
      await initFastSheetsWithEditable({ page, rowsCount: 100, columns, isRowNumberVisible: true })
      const from = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 1 })
      const to = await getCellMouseCoords({ page, columnIndex: 2, rowIndex: 3 })
      await page.mouse.move(from.x + 5, from.y + 5)
      await page.mouse.down()
      await page.mouse.move(to.x + 5, to.y + 5, { steps: 6 })
      await page.mouse.up()

      const point = await page.evaluate((scrollbar) => {
        const { elScroll } = window.fastSheets.state.options
        const { right, bottom } = elScroll.getBoundingClientRect()
        // the middle of the scrollbar track, below or to the right of the content
        return scrollbar === 'vertical'
          ? { x: right - 5, y: bottom / 2 }
          : { x: right / 2, y: bottom - 5 }
      }, scrollbar)
      await page.mouse.click(point.x, point.y)

      expect(await getSelectedRange(page)).toEqual({
        rowStart: 1,
        rowEnd: 3,
        columnStart: 1,
        columnEnd: 2,
      })
      expect(await getFocusedCell(page)).toEqual({ rowIndex: 1, columnIndex: 1 })
    })
  }
})
