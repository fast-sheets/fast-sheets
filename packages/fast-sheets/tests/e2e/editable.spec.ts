import { expect, type Page, test } from '@playwright/test'
import { initFastSheets, initFastSheetsWithEditable } from 'tests/e2e/utils/instance.ts'
import { clickCell, clickHeaderCell, getCellMouseCoords } from 'tests/e2e/utils/cell.ts'
import { copyToClipboard, pasteFromClipboard } from 'tests/e2e/utils/clipboard.ts'
import {
  getEventListeners,
  trackEventListeners,
  trackResizeObservers,
} from 'tests/e2e/utils/resource-tracker.ts'

const getUpdates = (page: Page) => page.evaluate(() => window.updates)

const getFocusedCell = (page: Page) =>
  page.evaluate(() => window.fastSheetsEditablePlugin.focusedCell.cell)

test.describe('last row', () => {
  test('the last data row is rendered', async ({ page }) => {
    await page.goto('/')
    const columns = [
      { name: 'A', width: 100 },
      { name: 'B', width: 100 },
    ]
    await initFastSheetsWithEditable({ page, rowsCount: 1000, columns, isRowNumberVisible: true })

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
    await initFastSheetsWithEditable({ page, rowsCount: 5, columns, isRowNumberVisible: true })
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
      await initFastSheetsWithEditable({ page, rowsCount: 2, columns, isRowNumberVisible: true })
      await clickCell({ page, columnIndex: 1, rowIndex: 1 })
      await page.keyboard.press('x')

      expect(await getUpdates(page)).toEqual([[{ rowIndex: 1, columnIndex: 1, value: 'r1c1x' }]])
    })

    test('a shifted key starts editing with that character', async ({ page }) => {
      await page.goto('/')
      const columns = [
        { name: 'A', width: 100 },
        { name: 'B', width: 100 },
      ]
      await initFastSheetsWithEditable({ page, rowsCount: 2, columns, isRowNumberVisible: true })
      await clickCell({ page, columnIndex: 1, rowIndex: 1 })
      await page.keyboard.press('Shift+X')

      expect(await getUpdates(page)).toEqual([[{ rowIndex: 1, columnIndex: 1, value: 'r1c1X' }]])
    })

    for (const key of ['Delete', 'F2', 'F5', 'PageDown', 'CapsLock', 'Home', 'Escape']) {
      test(`${key} does not write its name into the cell`, async ({ page }) => {
        await page.goto('/')
        const columns = [
          { name: 'A', width: 100 },
          { name: 'B', width: 100 },
        ]
        await initFastSheetsWithEditable({ page, rowsCount: 2, columns, isRowNumberVisible: true })
        await clickCell({ page, columnIndex: 1, rowIndex: 1 })
        expect(await getFocusedCell(page)).toEqual({ rowIndex: 1, columnIndex: 1 })
        await page.keyboard.press(key)

        expect(await getUpdates(page)).toEqual([])
      })
    }

    test('browser shortcuts are not prevented, keys are', async ({ page }) => {
      await page.goto('/')
      const columns = [
        { name: 'A', width: 100 },
        { name: 'B', width: 100 },
      ]
      await initFastSheetsWithEditable({ page, rowsCount: 2, columns, isRowNumberVisible: true })
      await clickCell({ page, columnIndex: 1, rowIndex: 1 })
      expect(await getFocusedCell(page)).toEqual({ rowIndex: 1, columnIndex: 1 })
      const prevented = await page.evaluate(() => {
        const press = (init: KeyboardEventInit) => {
          const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
          window.fastSheets.state.options.elContainer.dispatchEvent(event)
          return event.defaultPrevented
        }
        return {
          f5: press({ key: 'F5' }),
          f12: press({ key: 'F12' }),
          ctrlR: press({ key: 'r', ctrlKey: true }),
          ctrlA: press({ key: 'a', ctrlKey: true }),
          metaF: press({ key: 'f', metaKey: true }),
          arrowRight: press({ key: 'ArrowRight' }),
        }
      })

      expect(prevented).toEqual({
        f5: false,
        f12: false,
        ctrlR: false,
        ctrlA: false,
        metaF: false,
        arrowRight: true,
      })
    })
  })
})

test.describe('cell editor', () => {
  const columns = [
    { name: 'A', width: 100 },
    { name: 'B', width: 100 },
  ]
  const getInput = (page: Page) => page.locator('[data-name="elInput"]')

  test('saves what was typed when it loses focus', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await clickCell({ page, columnIndex: 1, rowIndex: 1 })
    await page.keyboard.press('x')
    await page.keyboard.type('yz')
    await clickCell({ page, columnIndex: 2, rowIndex: 3 })

    await expect(getInput(page)).toBeHidden()
    expect(await getUpdates(page)).toEqual([
      [{ rowIndex: 1, columnIndex: 1, value: 'r1c1x' }],
      [{ rowIndex: 1, columnIndex: 1, value: 'r1c1xyz' }],
    ])
  })

  test('saves and closes on Enter, without opening again', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await clickCell({ page, columnIndex: 1, rowIndex: 1 })
    await page.keyboard.press('x')
    await page.keyboard.type('y')
    await page.keyboard.press('Enter')

    await expect(getInput(page)).toBeHidden()
    expect(await getUpdates(page)).toEqual([
      [{ rowIndex: 1, columnIndex: 1, value: 'r1c1x' }],
      [{ rowIndex: 1, columnIndex: 1, value: 'r1c1xy' }],
    ])
  })

  test('does not send an unchanged value', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    const { x, y } = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 1 })
    await page.mouse.dblclick(x, y)
    await expect(getInput(page)).toBeVisible()
    await page.keyboard.press('Enter')

    await expect(getInput(page)).toBeHidden()
    expect(await getUpdates(page)).toEqual([])
  })

  test('stays open on Shift+Enter', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    const { x, y } = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 1 })
    await page.mouse.dblclick(x, y)
    await page.keyboard.press('Shift+Enter')

    await expect(getInput(page)).toBeVisible()
    expect(await getUpdates(page)).toEqual([])
  })
})

test.describe('row sizes after an edit', () => {
  test('are the same as when every row is measured again', async ({ page }) => {
    await page.goto('/')
    const columns = [
      { name: 'A', width: 100 },
      { name: 'B', width: 100 },
    ]
    await initFastSheetsWithEditable({ page, rowsCount: 6, columns, isRowNumberVisible: true })
    await page.evaluate(() => {
      window.fastSheetsEditablePlugin.options.onUpdate = (cells) => {
        for (const { rowIndex, columnIndex, value } of cells) {
          window.fastSheets.state.options.data[rowIndex]![columnIndex] = value
        }
      }
    })
    await clickCell({ page, columnIndex: 1, rowIndex: 2 })
    await pasteFromClipboard(page, '"three\nline\ntext"\tb\none')

    const sizes = await page.evaluate(() => {
      const { state, renderer } = window.fastSheets
      const pick = () => ({
        rowHeights: [...state.rowHeights],
        verticalOffsets: [...state.verticalOffsets],
        totalHeight: state.totalHeight,
      })
      const afterEdit = pick()
      renderer.init()
      return { afterEdit, measuredAgain: pick() }
    })
    expect(sizes.afterEdit.rowHeights[2]).toBeGreaterThan(sizes.afterEdit.rowHeights[1]!)
    expect(sizes.afterEdit).toEqual(sizes.measuredAgain)
  })
})

test.describe('copy', () => {
  test('copies the focused cell after a plain click', async ({ page }) => {
    await page.goto('/')
    const columns = [
      { name: 'A', width: 100 },
      { name: 'B', width: 100 },
    ]
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
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
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
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
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    expect(await copyToClipboard(page)).toEqual({ text: '', defaultPrevented: false })

    await clickHeaderCell({ page, columnIndex: 1 })
    expect(await copyToClipboard(page)).toEqual({ text: '', defaultPrevented: false })
  })

  test('quotes a cell with line breaks, tabs or quotes', async ({ page }) => {
    await page.goto('/')
    const columns = [
      { name: 'A', width: 100 },
      { name: 'B', width: 100 },
    ]
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await page.evaluate(() => {
      window.fastSheets.state.options.data[1]![1] = 'say "hi"\nbye'
    })
    await clickCell({ page, columnIndex: 1, rowIndex: 1 })

    expect((await copyToClipboard(page)).text).toBe('"say ""hi""\nbye"')
  })
})

test.describe('paste', () => {
  const columns = [
    { name: 'A', width: 100 },
    { name: 'B', width: 100 },
    { name: 'C', width: 100 },
  ]

  test('pastes rows and columns starting at the focused cell', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await clickCell({ page, columnIndex: 1, rowIndex: 1 })
    await pasteFromClipboard(page, 'a\tb\r\nc\td\r\n')

    expect(await getUpdates(page)).toEqual([
      [
        { rowIndex: 1, columnIndex: 1, value: 'a' },
        { rowIndex: 1, columnIndex: 2, value: 'b' },
        { rowIndex: 2, columnIndex: 1, value: 'c' },
        { rowIndex: 2, columnIndex: 2, value: 'd' },
      ],
    ])
  })

  test('pastes a quoted multi-line cell into one cell', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await clickCell({ page, columnIndex: 1, rowIndex: 1 })
    await pasteFromClipboard(page, '"hello, world!\nsecond line"\thttps://a/nb')

    expect(await getUpdates(page)).toEqual([
      [
        { rowIndex: 1, columnIndex: 1, value: 'hello, world!\nsecond line' },
        { rowIndex: 1, columnIndex: 2, value: 'https://a/nb' },
      ],
    ])
  })

  test('a copied multi-line cell pastes back as one cell', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await page.evaluate(() => {
      window.fastSheets.state.options.data[1]![1] = 'first, line\nsay "hi"'
    })
    await clickCell({ page, columnIndex: 1, rowIndex: 1 })
    const { text } = await copyToClipboard(page)
    await clickCell({ page, columnIndex: 2, rowIndex: 2 })
    await pasteFromClipboard(page, text)

    expect(await getUpdates(page)).toEqual([
      [{ rowIndex: 2, columnIndex: 2, value: 'first, line\nsay "hi"' }],
    ])
  })
})

test.describe('selected range box', () => {
  const columns = [{ name: 'A' }, { name: 'B' }, { name: 'C' }]

  /** the selected range box: whether it is shown, and where it is relative to the grid */
  const getSelectedRangeBox = (page: Page) =>
    page.evaluate(() => {
      const { borders } = window.fastSheetsEditablePlugin.selectedRange
      return {
        display: borders.container.style.display,
        left: parseFloat(borders.container.style.left),
        right:
          parseFloat(borders.container.style.left) + parseFloat(borders.borderRight.style.left),
      }
    })

  const resizeGrid = async (page: Page, width: number) => {
    await page.getByTestId('fast-sheets').evaluate((el: HTMLElement, width) => {
      el.style.width = `${width}px`
    }, width)
    // let the resize observers run
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    )
  }

  test('stays hidden after a plain click', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await clickCell({ page, columnIndex: 1, rowIndex: 1 })

    expect((await getSelectedRangeBox(page)).display).toBe('none')
  })

  test('a new width saves and closes the cell editor', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await clickCell({ page, columnIndex: 1, rowIndex: 1 })
    await page.keyboard.press('x')
    await resizeGrid(page, 600)

    await expect(page.locator('[data-name="elInput"]')).toBeHidden()
    expect(await page.evaluate(() => window.updates)).toEqual([
      [{ rowIndex: 1, columnIndex: 1, value: 'r1c1x' }],
    ])
  })

  test('stays hidden after a resize when nothing is selected', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await clickCell({ page, columnIndex: 1, rowIndex: 1 })
    await resizeGrid(page, 600)

    expect((await getSelectedRangeBox(page)).display).toBe('none')
  })

  test('follows the selected cells after a resize', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    const from = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 1 })
    const to = await getCellMouseCoords({ page, columnIndex: 2, rowIndex: 2 })
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 6 })
    await page.mouse.up()
    await resizeGrid(page, 600)

    const expected = await page.evaluate(() => {
      const state = window.fastSheets.state
      return {
        display: 'block',
        left: state.horizontalOffsets[1],
        right: state.horizontalOffsets[2]! + state.columnWidths[2]! - 1,
      }
    })
    expect(await getSelectedRangeBox(page)).toEqual(expected)
  })
})

test.describe('selection background', () => {
  /** the color painted inside a cell, away from its text */
  const getCellBackgroundPixel = (page: Page, cell: { rowIndex: number; columnIndex: number }) =>
    page.evaluate(({ rowIndex, columnIndex }) => {
      const { state, renderer } = window.fastSheets
      renderer.renderImmediate()
      const { elCanvas } = state.options
      const scale = elCanvas.width / elCanvas.getBoundingClientRect().width
      // just inside the top-left corner: past the border, above the vertically centered text
      const x = Math.round(((state.horizontalOffsets[columnIndex] || 0) + 4) * scale)
      const y = Math.round(((state.verticalOffsets[rowIndex] || 0) + 4) * scale)
      const [r, g, b] = elCanvas.getContext('2d')!.getImageData(x, y, 1, 1).data
      return `rgb(${r}, ${g}, ${b})`
    }, cell)

  test('is kept on a search hit, whatever the plugin order', async ({ page }) => {
    await page.goto('/')
    const columns = [
      { name: 'A', width: 100 },
      { name: 'B', width: 100 },
      { name: 'C', width: 100 },
    ]
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await page.evaluate(() => {
      const searchPlugin = new window.FastSheetsSearchPlugin()
      window.fastSheets.use(searchPlugin) // registered after the editable plugin
      searchPlugin.highlightResult([{ rowIndex: 0, columnIndex: 0 }]) // grid cell (1, 1)
    })

    // select two cells, the search hit included
    await clickCell({ page, rowIndex: 1, columnIndex: 1 })
    await page.keyboard.press('Shift+ArrowRight')

    const selected = 'rgb(233, 240, 254)' // DEFAULT_SELECTION_BACKGROUND_COLOR
    expect(await getCellBackgroundPixel(page, { rowIndex: 1, columnIndex: 1 })).toBe(selected)
    expect(await getCellBackgroundPixel(page, { rowIndex: 1, columnIndex: 2 })).toBe(selected)
    expect(await getCellBackgroundPixel(page, { rowIndex: 1, columnIndex: 3 })).toBe(
      'rgb(255, 255, 255)',
    )
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
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await page.evaluate(() => {
      window.fastSheetsEditablePlugin.destroy()
    })

    await clickCell({ page, columnIndex: 1, rowIndex: 1 })
    await page.keyboard.press('x')

    expect(await getUpdates(page)).toEqual([])

    expect(await page.evaluate(() => window.fastSheets.hasPlugin('editable'))).toBe(false)

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
    await initFastSheetsWithEditable({ page, rowsCount: 20, columns, isRowNumberVisible: true })

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
