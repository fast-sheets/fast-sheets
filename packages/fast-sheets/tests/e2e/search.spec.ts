import { expect, type Page, test } from '@playwright/test'
import { initFastSheets } from 'tests/e2e/utils/instance.ts'

/** the color of the top border of a cell, away from its corners */
const getCellTopBorderPixel = (page: Page, cell: { rowIndex: number; columnIndex: number }) =>
  page.evaluate(({ rowIndex, columnIndex }) => {
    const { state, renderer } = window.fastSheets
    renderer.renderImmediate()
    const { elCanvas } = state.options
    const scale = elCanvas.width / elCanvas.getBoundingClientRect().width
    const x = Math.floor(((state.horizontalOffsets[columnIndex] || 0) + 10) * scale)
    // the border is rendered right above the cell
    const y = Math.floor(((state.verticalOffsets[rowIndex] || 0) - 0.5) * scale)
    const [r, g, b] = elCanvas.getContext('2d')!.getImageData(x, y, 1, 1).data
    return `rgb(${r}, ${g}, ${b})`
  }, cell)

const initWithSearchResult = async (page: Page, options?: { selectionColor: string }) => {
  await page.goto('/')
  const columns = [
    { name: 'A', width: 100 },
    { name: 'B', width: 100 },
  ]
  await initFastSheets({ page, rowsCount: 4, columns, isRowNumberVisible: false })
  await page.evaluate((options) => {
    const searchPlugin = new window.FastSheetsSearchPlugin(options)
    window.fastSheetsSearchPlugin = searchPlugin
    window.fastSheets.use(searchPlugin)
    searchPlugin.highlightResult([{ rowIndex: 1, columnIndex: 1 }])
  }, options)
}

test.describe('search results', () => {
  test('are outlined with the selectionColor option', async ({ page }) => {
    await initWithSearchResult(page, { selectionColor: 'rgb(255, 0, 0)' })

    expect(await getCellTopBorderPixel(page, { rowIndex: 1, columnIndex: 1 })).toBe(
      'rgb(255, 0, 0)',
    )
    // a cell that is not a result keeps the default border
    expect(await getCellTopBorderPixel(page, { rowIndex: 1, columnIndex: 0 })).not.toBe(
      'rgb(255, 0, 0)',
    )
  })

  test('are outlined in green by default', async ({ page }) => {
    await initWithSearchResult(page)

    expect(await getCellTopBorderPixel(page, { rowIndex: 1, columnIndex: 1 })).toBe(
      'rgb(8, 197, 0)',
    )
  })

  test('move with their cells when rows and columns are inserted or removed', async ({ page }) => {
    await initWithSearchResult(page)
    await page.evaluate(() => {
      window.fastSheets.insertRows(0, 2)
      window.fastSheets.removeColumns(0)
    })

    expect(
      await page.evaluate(() => [...window.fastSheetsSearchPlugin.searchResult.get(3)!]),
    ).toEqual([0])
    expect(await getCellTopBorderPixel(page, { rowIndex: 3, columnIndex: 0 })).toBe(
      'rgb(8, 197, 0)',
    )

    await page.evaluate(() => {
      window.fastSheets.removeRows(3)
    })
    expect(await page.evaluate(() => window.fastSheetsSearchPlugin.searchResult.size)).toBe(0)
  })

  test('are no longer outlined after the plugin is destroyed', async ({ page }) => {
    await initWithSearchResult(page, { selectionColor: 'rgb(255, 0, 0)' })
    expect(await getCellTopBorderPixel(page, { rowIndex: 1, columnIndex: 1 })).toBe(
      'rgb(255, 0, 0)',
    )

    await page.evaluate(() => {
      window.fastSheetsSearchPlugin.destroy()
    })

    expect(await getCellTopBorderPixel(page, { rowIndex: 1, columnIndex: 1 })).toBe(
      'rgb(233, 233, 233)', // DEFAULT_BORDER_COLOR
    )
  })
})
