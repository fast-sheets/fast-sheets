import { expect, type Page, test } from '@playwright/test'
import { initFastSheets, initFastSheetsWithPlugins } from 'tests/e2e/utils/instance.ts'
import { clickCell, clickHeaderCell, getCellMouseCoords } from 'tests/e2e/utils/cell.ts'
import { copyToClipboard } from 'tests/e2e/utils/clipboard.ts'
import {
  getEventListeners,
  trackEventListeners,
  trackResizeObservers,
} from 'tests/e2e/utils/resource-tracker.ts'

const getUpdates = (page: Page) => page.evaluate(() => window.updates)

test.describe('last row', () => {
  test('the last data row is rendered', async ({ page }) => {
    await page.goto('/')
    const columns = [
      { name: 'A', width: 100 },
      { name: 'B', width: 100 },
    ]
    await initFastSheetsWithPlugins({ page, rowsCount: 1000, columns, isRowNumberVisible: true })

    const { rowsCount, lastVisibleRowIndex } = await page.evaluate(() => {
      window.fastSheets.state.options.elScroll.scrollTop = 1e9
      const fastSheets = window.fastSheets
      const state = fastSheets.state
      fastSheets.renderer.renderImmediate()
      return {
        rowsCount: state.rowHeights.length,
        lastVisibleRowIndex: fastSheets.renderer.findRowIndex(state.viewport.bottom),
      }
    })

    expect(rowsCount).toBe(1000)
    expect(lastVisibleRowIndex).toBe(999)
  })

  test('ArrowDown reaches the last data row', async ({ page }) => {
    await page.goto('/')
    const columns = [
      { name: 'A', width: 100 },
      { name: 'B', width: 100 },
    ]
    await initFastSheetsWithPlugins({ page, rowsCount: 5, columns, isRowNumberVisible: true })
    await clickCell({ page, columnIndex: 0, rowIndex: 4 })
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter') // opens the editor of the focused cell

    await expect(page.locator('[data-name="elInput"]')).toHaveText('r4c0')
  })

  test.describe('keyboard', () => {
    test('a printable key starts editing', async ({ page }) => {
      await page.goto('/')
      const columns = [
        { name: 'A', width: 100 },
        { name: 'B', width: 100 },
      ]
      await initFastSheetsWithPlugins({ page, rowsCount: 2, columns, isRowNumberVisible: true })
      await clickCell({ page, columnIndex: 1, rowIndex: 1 })
      await page.keyboard.press('x')

      expect(await getUpdates(page)).toEqual([[{ rowIndex: 1, columnIndex: 1, value: 'r1c1x' }]])
    })

    for (const key of ['Delete', 'F2', 'PageDown', 'CapsLock', 'Home', 'Escape']) {
      test(`${key} does not write its name into the cell`, async ({ page }) => {
        await page.goto('/')
        const columns = [
          { name: 'A', width: 100 },
          { name: 'B', width: 100 },
        ]
        await initFastSheetsWithPlugins({ page, rowsCount: 2, columns, isRowNumberVisible: true })
        await clickCell({ page, columnIndex: 1, rowIndex: 2 })
        await page.keyboard.press(key)

        expect(await getUpdates(page)).toEqual([])
      })
    }

    // todo
    // test('browser shortcuts are not prevented, keys are', async ({ page }) => {
    //   await page.goto('/')
    //   const columns = [
    //     { name: 'A', width: 100 },
    //     { name: 'B', width: 100 },
    //   ]
    //   await initEditableFastSheets({ page, rowsCount: 2, columns, isRowNumberVisible: true })
    //   const prevented = await page.evaluate(() => {
    //     const press = (init: KeyboardEventInit) => {
    //       const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
    //       window.fastSheets.state.options.elContainer.dispatchEvent(event)
    //       return event.defaultPrevented
    //     }
    //     return {
    //       f5: press({ key: 'F5' }),
    //       f12: press({ key: 'F12' }),
    //       ctrlR: press({ key: 'r', ctrlKey: true }),
    //       ctrlA: press({ key: 'a', ctrlKey: true }),
    //       arrowRight: press({ key: 'ArrowRight' }),
    //     }
    //   })
    //
    //   expect(prevented).toEqual({
    //     f5: false,
    //     f12: false,
    //     ctrlR: false,
    //     ctrlA: false,
    //     arrowRight: true,
    //   })
    // })
  })
})

test.describe('copy', () => {
  test('copies the focused cell after a plain click', async ({ page }) => {
    await page.goto('/')
    const columns = [
      { name: 'A', width: 100 },
      { name: 'B', width: 100 },
    ]
    await initFastSheetsWithPlugins({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await clickCell({ page, columnIndex: 1, rowIndex: 3 })
    expect(await copyToClipboard(page)).toEqual({ text: 'r3c1', defaultPrevented: true })
  })

  test('copies a range selected by dragging', async ({ page }) => {
    await page.goto('/')
    const columns = [
      { name: 'A', width: 100 },
      { name: 'B', width: 100 },
      { name: 'C', width: 100 },
    ]
    await initFastSheetsWithPlugins({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    const from = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 1 })
    const to = await getCellMouseCoords({ page, columnIndex: 2, rowIndex: 3 })
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 6 })
    await page.mouse.up()

    expect((await copyToClipboard(page)).text).toBe('r1c1\tr1c2\nr2c1\tr2c2\nr3c1\tr3c2')
  })

  test('does not touch the clipboard when nothing is focused or a header is focused', async ({
    page,
  }) => {
    await page.goto('/')
    const columns = [
      { name: 'A', width: 100 },
      { name: 'B', width: 100 },
      { name: 'C', width: 100 },
    ]
    await initFastSheetsWithPlugins({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    expect(await copyToClipboard(page)).toEqual({ text: '', defaultPrevented: false })

    await clickHeaderCell({ page, columnIndex: 1 })
    expect(await copyToClipboard(page)).toEqual({ text: '', defaultPrevented: false })
  })
})

test.describe('destroy editable plugin', () => {
  test('removes all elements', async ({ page }) => {
    await page.goto('/')
    const columns = [
      { name: 'A', width: 100 },
      { name: 'B', width: 100 },
      { name: 'C', width: 100 },
    ]
    await initFastSheetsWithPlugins({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await page.evaluate(() => {
      window.fastSheetsEditablePlugin.destroy()
    })

    await clickCell({ page, columnIndex: 1, rowIndex: 1 })
    await page.keyboard.press('x')

    expect(await getUpdates(page)).toEqual([])

    const pluginNames = await page.evaluate(() => Object.keys(window.fastSheets.state.plugins))
    expect(pluginNames).not.toContain('editable')

    await expect(page.locator('[data-name="elEditableContainerFront"]')).toHaveCount(0)
    await expect(page.locator('[data-name="elEditableContainerBack"]')).toHaveCount(0)
  })

  test('removes every listener and observer it registered', async ({ page }) => {
    await trackEventListeners(page)
    await trackResizeObservers(page)
    await page.goto('/')
    const columns = [
      { name: 'A', width: 100 },
      { name: 'B', width: 100 },
      { name: 'C', width: 100 },
    ]
    // a core-only grid first, so that the snapshot holds the core listeners only
    await initFastSheets({ page, rowsCount: 20, columns, isRowNumberVisible: true })
    const coreListeners = await getEventListeners(page)
    const coreObservers = await page.evaluate(() => window.resourceTracker.liveObservers())

    await page.evaluate(() => {
      window.fastSheetsEditablePlugin = new window.FastSheetsEditablePlugin({
        onUpdate() {
          // do nothing
        },
      })
      window.fastSheets.use(window.fastSheetsEditablePlugin)
    })
    expect(await getEventListeners(page)).not.toEqual(coreListeners)

    // use the plugin: select, navigate, drag, open the cell editor
    await clickCell({ page, rowIndex: 1, columnIndex: 1 })
    await page.keyboard.press('ArrowDown')
    await page.mouse.move(300, 150)
    await page.keyboard.press('Enter')

    await page.evaluate(() => {
      window.fastSheetsEditablePlugin.destroy()
    })

    expect(await getEventListeners(page)).toEqual(coreListeners)
    expect(await page.evaluate(() => window.resourceTracker.liveObservers())).toBe(coreObservers)
  })

  test('is released together with the grid', async ({ page }) => {
    await trackEventListeners(page)
    await trackResizeObservers(page)
    await page.goto('/')
    await page.waitForFunction(() => window.isFixtureReady === true)
    const originListeners = await getEventListeners(page)
    const columns = [
      { name: 'A', width: 100 },
      { name: 'B', width: 100 },
      { name: 'C', width: 100 },
    ]
    await initFastSheetsWithPlugins({ page, rowsCount: 20, columns, isRowNumberVisible: true })

    await clickCell({ page, rowIndex: 1, columnIndex: 1 })
    await page.keyboard.press('Enter')

    await page.evaluate(() => {
      window.fastSheets.destroy()
    })

    expect(await getEventListeners(page)).toEqual(originListeners)
    expect(await page.evaluate(() => window.resourceTracker.liveObservers())).toBe(0)
    await expect(page.getByTestId('fast-sheets').locator(' > *')).toHaveCount(0)
  })
})
