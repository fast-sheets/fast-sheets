import { expect, test } from '@playwright/test'
import { initFastSheetsWithPlugins } from 'tests/e2e/utils/core.ts'

test.describe('init instance', () => {
  test('has all elements', async ({ page }) => {
    await page.goto('/')
    const columns = [
      { name: 'A', width: 100 },
      { name: 'B', width: 100 },
      { name: 'C', width: 100 },
    ]
    await initFastSheetsWithPlugins({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await expect(page.getByTestId('fast-sheets').locator(' > *')).toHaveCount(4)
  })
})

test.describe('destroy instance', () => {
  test('removes all elements', async ({ page }) => {
    await page.goto('/')
    const columns = [
      { name: 'A', width: 100 },
      { name: 'B', width: 100 },
      { name: 'C', width: 100 },
    ]
    await initFastSheetsWithPlugins({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await page.evaluate(() => {
      window.fastSheets.destroy()
    })
    await expect(page.getByTestId('fast-sheets').locator(' > *')).toHaveCount(0)
  })
})
