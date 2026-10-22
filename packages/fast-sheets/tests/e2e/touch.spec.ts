import { expect, type Page, test } from '@playwright/test'
import { initFastSheetsWithEditable } from 'tests/e2e/utils/instance.ts'
import { getCellMouseCoords } from 'tests/e2e/utils/cell.ts'

test.use({ hasTouch: true })

const columns = [
  { name: 'A', width: 100 },
  { name: 'B', width: 100 },
]

const getInput = (page: Page) => page.locator('[data-name="elInput"]')

const doubleTap = async (page: Page, rowIndex: number, columnIndex: number) => {
  const { x, y } = await getCellMouseCoords({ page, columnIndex, rowIndex })
  await page.touchscreen.tap(x + 5, y + 5)
  await page.touchscreen.tap(x + 5, y + 5)
}

test.describe('double tap', () => {
  test('opens the cell editor', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await doubleTap(page, 1, 1)

    await expect(getInput(page)).toBeVisible()
    await expect(getInput(page)).toBeFocused()
    await expect(getInput(page)).toHaveText('r1c1')
  })

  test('keeps the editor open when the keyboard makes the grid shorter', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await doubleTap(page, 1, 1)
    await expect(getInput(page)).toBeFocused()

    // a grid sized to the visible part of the page, such as 100dvh, gets shorter on a phone
    // when the keyboard opens
    await page.getByTestId('fast-sheets').evaluate((el: HTMLElement) => {
      el.style.height = '200px'
    })
    // let the resize observers run
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    )

    await expect(getInput(page)).toBeVisible()
    await expect(getInput(page)).toBeFocused()
    expect(await page.evaluate(() => window.updates)).toEqual([])
  })
})
