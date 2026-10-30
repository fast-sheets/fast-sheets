import { expect, type Page, test } from '@playwright/test'
import { initFastSheetsWithEditable } from 'tests/e2e/utils/instance.ts'
import { clickCell, getCellMouseCoords } from 'tests/e2e/utils/cell.ts'
import { getEventListeners, trackEventListeners } from 'tests/e2e/utils/resource-tracker.ts'

const columns = [
  { name: 'A', width: 100 },
  { name: 'B', width: 100 },
  { name: 'C', width: 100 },
]

const getMenu = (page: Page) => page.locator('[data-name="elContextMenu"]')

const getMenuItem = (page: Page, label: string) =>
  getMenu(page).getByRole('menuitem', { name: label, exact: true })

const getMenuLabels = (page: Page) =>
  getMenu(page).locator('[data-name="elContextMenuItem"]').allTextContents()

const getCalls = (page: Page) => page.evaluate(() => window.rowsAndColumnsCalls)

const getData = (page: Page) => page.evaluate(() => window.fastSheets.state.options.data)

const getFocusedCell = (page: Page) =>
  page.evaluate(() => window.fastSheetsEditablePlugin.focusedCell.cell)

const rightClickCell = async (page: Page, rowIndex: number, columnIndex: number) => {
  const { x, y } = await getCellMouseCoords({ page, rowIndex, columnIndex })
  await page.mouse.click(x + 5, y + 5, { button: 'right' })
}

/** a right click inside the column name */
const rightClickColumnName = async (page: Page, columnIndex: number) => {
  const { x } = await getCellMouseCoords({ page, columnIndex, rowIndex: 0 })
  await page.mouse.click(x + 5, 5, { button: 'right' })
}

/** a point inside the row number */
const getRowNumberPoint = async (page: Page, rowIndex: number) => {
  const { y } = await getCellMouseCoords({ page, columnIndex: 0, rowIndex })
  return { x: 5, y: y + 5 }
}

const initGrid = (page: Page, options: { canAddRows?: boolean; canAddColumns?: boolean } = {}) =>
  initFastSheetsWithEditable({
    page,
    rowsCount: 3,
    columns,
    isRowNumberVisible: true,
    canAddRows: true,
    canAddColumns: true,
    ...options,
  })

test.describe('context menu', () => {
  test('is off by default', async ({ page }) => {
    await page.goto('/')
    await initGrid(page, { canAddRows: false, canAddColumns: false })
    await rightClickCell(page, 1, 1)

    await expect(getMenu(page)).toBeHidden()
  })

  test('a right click on a data cell offers the row and the column items', async ({ page }) => {
    await page.goto('/')
    await initGrid(page)
    await rightClickCell(page, 1, 1)

    await expect(getMenu(page)).toBeVisible()
    expect(await getMenuLabels(page)).toEqual([
      'Insert 1 row above',
      'Insert 1 row below',
      'Delete 1 row',
      'Insert 1 column left',
      'Insert 1 column right',
      'Delete 1 column',
    ])
    // like a left click, it focuses the cell
    expect(await getFocusedCell(page)).toEqual({ rowIndex: 1, columnIndex: 1 })
  })

  test('offers only the row items when canAddColumns is off', async ({ page }) => {
    await page.goto('/')
    await initGrid(page, { canAddColumns: false })
    await rightClickCell(page, 1, 1)

    expect(await getMenuLabels(page)).toEqual([
      'Insert 1 row above',
      'Insert 1 row below',
      'Delete 1 row',
    ])
  })

  test('a column name offers only the column items', async ({ page }) => {
    await page.goto('/')
    await initGrid(page)
    await rightClickColumnName(page, 2)

    expect(await getMenuLabels(page)).toEqual([
      'Insert 1 column left',
      'Insert 1 column right',
      'Delete 1 column',
    ])
  })

  test('a column name has no menu when canAddColumns is off', async ({ page }) => {
    await page.goto('/')
    await initGrid(page, { canAddColumns: false })
    await rightClickColumnName(page, 2)

    await expect(getMenu(page)).toBeHidden()
  })

  test('shows the labels the app gives, and the defaults for the others', async ({ page }) => {
    await page.goto('/')
    await initGrid(page)
    await page.evaluate(() => {
      window.fastSheetsEditablePlugin.destroy()
      window.fastSheetsEditablePlugin = new window.FastSheetsEditablePlugin({
        onUpdate() {
          // do nothing
        },
        canAddRows: true,
        labels: {
          contextMenu: {
            insertRowsAbove: (count) => `Zeilen einfügen (${count}) oberhalb`,
          },
        },
      })
      window.fastSheets.use(window.fastSheetsEditablePlugin)
    })
    await rightClickCell(page, 1, 1)

    expect((await getMenuLabels(page)).slice(0, 2)).toEqual([
      'Zeilen einfügen (1) oberhalb',
      'Insert 1 row below',
    ])
  })

  test('inserts a row above', async ({ page }) => {
    await page.goto('/')
    await initGrid(page)
    await rightClickCell(page, 1, 1)
    await getMenuItem(page, 'Insert 1 row above').click()

    await expect(getMenu(page)).toBeHidden()
    expect(await getCalls(page)).toEqual([{ callback: 'onInsertRows', index: 1, count: 1 }])
    expect(await getData(page)).toEqual([
      ['r0\nc0', 'r0c1', 'r0c2'],
      ['', '', ''],
      ['r1c0', 'r1c1', 'r1c2'],
      ['r2c0', 'r2c1', 'r2c2'],
    ])
    expect(await page.evaluate(() => window.fastSheets.state.rowHeights.length)).toBe(4)
    // the focus stays on its cell, which moved down
    expect(await getFocusedCell(page)).toEqual({ rowIndex: 2, columnIndex: 1 })
  })

  test('inserts a column right', async ({ page }) => {
    await page.goto('/')
    await initGrid(page)
    await rightClickColumnName(page, 0)
    await getMenuItem(page, 'Insert 1 column right').click()

    expect(await getCalls(page)).toEqual([{ callback: 'onInsertColumns', index: 1, count: 1 }])
    expect((await getData(page))[1]).toEqual(['r1c0', '', 'r1c1', 'r1c2'])
    const { columnsCount, columnWidthsCount } = await page.evaluate(() => ({
      columnsCount: window.fastSheets.state.options.columns.length,
      columnWidthsCount: window.fastSheets.state.columnWidths.length,
    }))
    expect(columnsCount).toBe(4)
    expect(columnWidthsCount).toBe(4)
  })

  test('inserting a column on the left moves the focus right with its cell', async ({ page }) => {
    await page.goto('/')
    await initGrid(page)
    await rightClickCell(page, 1, 1)
    await getMenuItem(page, 'Insert 1 column left').click()

    expect(await getFocusedCell(page)).toEqual({ rowIndex: 1, columnIndex: 2 })
  })

  test('deleting the focused column moves the focus to the column that took its place', async ({
    page,
  }) => {
    await page.goto('/')
    await initGrid(page)
    await rightClickCell(page, 1, 2)
    await getMenuItem(page, 'Delete 1 column').click()

    // the last column is gone, so the focus goes to the new last one
    expect(await getFocusedCell(page)).toEqual({ rowIndex: 1, columnIndex: 1 })
  })

  test('deletes the selected rows', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({
      page,
      rowsCount: 5,
      columns,
      isRowNumberVisible: true,
      canAddRows: true,
      canAddColumns: true,
    })
    // drag over the row numbers 1 to 3
    const from = await getRowNumberPoint(page, 1)
    const to = await getRowNumberPoint(page, 3)
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 6 })
    await page.mouse.up()

    // a right click inside the selection keeps it
    await page.mouse.click(to.x, to.y, { button: 'right' })
    expect(await getMenuLabels(page)).toEqual([
      'Insert 3 rows above',
      'Insert 3 rows below',
      'Delete 3 rows',
    ])
    await getMenuItem(page, 'Delete 3 rows').click()

    expect(await getCalls(page)).toEqual([{ callback: 'onRemoveRows', index: 1, count: 3 }])
    expect((await getData(page)).map((row) => row[1])).toEqual(['r0c1', 'r4c1'])
    // the focus goes to the row that took the place of the deleted ones
    expect(await getFocusedCell(page)).toEqual({ rowIndex: 1, columnIndex: 0 })
  })

  test('deletes a column of a data cell', async ({ page }) => {
    await page.goto('/')
    await initGrid(page)
    await rightClickCell(page, 0, 1)
    await getMenuItem(page, 'Delete 1 column').click()

    expect(await getCalls(page)).toEqual([{ callback: 'onRemoveColumns', index: 1, count: 1 }])
    expect((await getData(page))[2]).toEqual(['r2c0', 'r2c2'])
    expect(await page.evaluate(() => window.fastSheets.state.options.columns)).toEqual([
      { name: 'A', width: 100 },
      { name: 'C', width: 100 },
    ])
  })

  test('cannot delete all rows', async ({ page }) => {
    await page.goto('/')
    await initGrid(page)
    await page.keyboard.press('Tab') // focuses the grid
    await page.evaluate(() => window.fastSheetsEditablePlugin.selectAllCells())
    await rightClickCell(page, 1, 1)

    await expect(getMenuItem(page, 'Delete 3 rows')).toBeDisabled()
    await expect(getMenuItem(page, 'Delete 3 columns')).toBeDisabled()
  })

  test('a right click outside the selection selects the cell under it', async ({ page }) => {
    await page.goto('/')
    await initGrid(page)
    await clickCell({ page, rowIndex: 0, columnIndex: 0 })
    await page.keyboard.press('Shift+ArrowRight')
    await rightClickCell(page, 2, 2)

    expect(await getFocusedCell(page)).toEqual({ rowIndex: 2, columnIndex: 2 })
    expect(await getMenuLabels(page)).toContain('Delete 1 row')
  })

  test('Escape closes the menu and gives the focus back to the grid', async ({ page }) => {
    await page.goto('/')
    await initGrid(page)
    await rightClickCell(page, 1, 1)
    await expect(getMenuItem(page, 'Insert 1 row above')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(getMenuItem(page, 'Insert 1 row below')).toBeFocused()
    await page.keyboard.press('Escape')

    await expect(getMenu(page)).toBeHidden()
    await expect(page.getByTestId('fast-sheets')).toBeFocused()
    expect(await getCalls(page)).toEqual([])
  })

  test('a click outside closes the menu without a change', async ({ page }) => {
    await page.goto('/')
    await initGrid(page)
    await rightClickCell(page, 1, 1)
    await clickCell({ page, rowIndex: 0, columnIndex: 0 })

    await expect(getMenu(page)).toBeHidden()
    expect(await getCalls(page)).toEqual([])
    expect(await getFocusedCell(page)).toEqual({ rowIndex: 0, columnIndex: 0 })
  })

  test('Enter chooses the focused item', async ({ page }) => {
    await page.goto('/')
    await initGrid(page)
    await rightClickCell(page, 2, 0)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')

    expect(await getCalls(page)).toEqual([{ callback: 'onInsertRows', index: 3, count: 1 }])
  })

  test('the app may reject a change', async ({ page }) => {
    await page.goto('/')
    await initGrid(page)
    await page.evaluate(() => {
      window.fastSheetsEditablePlugin.options.onRemoveRows = (index, count) => {
        window.rowsAndColumnsCalls.push({ callback: 'onRemoveRows', index, count })
      }
    })
    await rightClickCell(page, 1, 1)
    await getMenuItem(page, 'Delete 1 row').click()

    expect(await getCalls(page)).toEqual([{ callback: 'onRemoveRows', index: 1, count: 1 }])
    expect(await getData(page)).toHaveLength(3)
  })

  test('is removed with the plugin, and so are its listeners', async ({ page }) => {
    await trackEventListeners(page)
    await page.goto('/')
    await page.waitForFunction(() => window.isFixtureReady === true)
    const originListeners = await getEventListeners(page)
    await initGrid(page)
    await rightClickCell(page, 1, 1)
    await expect(getMenu(page)).toBeVisible()

    await page.evaluate(() => {
      window.fastSheets.destroy()
    })

    await expect(getMenu(page)).toHaveCount(0)
    expect(await getEventListeners(page)).toEqual(originListeners)
  })
})
