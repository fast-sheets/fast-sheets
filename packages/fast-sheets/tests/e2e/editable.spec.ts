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

/** the selected range, or undefined while its box is hidden */
const getSelectedRange = (page: Page) =>
  page.evaluate(() => {
    const { range, borders } = window.fastSheetsEditablePlugin.selectedRange
    return borders.container.style.display === 'none' ? undefined : { ...range }
  })

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
        lastVisibleRowIndex: fastSheets.layout.findRowIndex(state.viewport.bottom),
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

    for (const key of ['F2', 'F5', 'PageDown', 'CapsLock', 'Home', 'Escape']) {
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
          metaF: press({ key: 'f', metaKey: true }),
          arrowRight: press({ key: 'ArrowRight' }),
        }
      })

      expect(prevented).toEqual({
        f5: false,
        f12: false,
        ctrlR: false,
        metaF: false,
        arrowRight: true,
      })
    })
  })
})

test.describe('page scrolled', () => {
  test('a click focuses the cell under the pointer', async ({ page }) => {
    await page.goto('/')
    const columns = [
      { name: 'A', width: 100 },
      { name: 'B', width: 100 },
    ]
    await initFastSheetsWithEditable({ page, rowsCount: 10, columns, isRowNumberVisible: true })
    // the page is taller than the window and scrolled, as it often is on a phone
    const { x, y } = await page.evaluate(() => {
      document.body.style.paddingTop = '200px'
      document.body.style.height = '3000px'
      window.scrollTo(0, 260)
      const { state } = window.fastSheets
      const rect = state.options.elScrollInner.getBoundingClientRect()
      return {
        x: rect.left + (state.horizontalOffsets[0] || 0) + 5,
        y: rect.top + (state.verticalOffsets[2] || 0) + 5,
      }
    })
    await page.mouse.click(x, y)

    expect(await getFocusedCell(page)).toEqual({ rowIndex: 2, columnIndex: 0 })
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

  test('discards what was typed and closes on Escape', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    const { x, y } = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 1 })
    await page.mouse.dblclick(x, y)
    await page.keyboard.type('xyz')
    await page.keyboard.press('Escape')

    await expect(getInput(page)).toBeHidden()
    expect(await getUpdates(page)).toEqual([])
    expect(await getFocusedCell(page)).toEqual({ rowIndex: 1, columnIndex: 1 })
    // the focus is back on the grid, so arrows move the focused cell again
    await page.keyboard.press('ArrowDown')
    expect(await getFocusedCell(page)).toEqual({ rowIndex: 2, columnIndex: 1 })
  })

  test('restores the cell text on Escape after typing started the editing', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await clickCell({ page, columnIndex: 1, rowIndex: 1 })
    await page.keyboard.press('x')
    await page.keyboard.type('y')
    await page.keyboard.press('Escape')

    await expect(getInput(page)).toBeHidden()
    expect(await getUpdates(page)).toEqual([
      [{ rowIndex: 1, columnIndex: 1, value: 'r1c1x' }],
      [{ rowIndex: 1, columnIndex: 1, value: 'r1c1' }],
    ])
  })

  test('a double click in the editor keeps what was typed', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 6, columns, isRowNumberVisible: true })
    const { x, y } = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 1 })
    await page.mouse.dblclick(x, y)
    await page.keyboard.type('abc')
    const typed = await getInput(page).textContent()
    const box = (await getInput(page).boundingBox())!
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2)

    await expect(getInput(page)).toBeFocused()
    await expect(getInput(page)).toHaveText(typed!)
  })

  test('a click in the editor keeps the focused cell', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 6, columns, isRowNumberVisible: true })
    const { x, y } = await getCellMouseCoords({ page, columnIndex: 0, rowIndex: 1 })
    await page.mouse.dblclick(x + 5, y + 5)
    // a wrapping text makes the editor taller than its cell, over the rows below it
    await page.keyboard.type(' a long text that is wider than the cell so it wraps')
    const box = (await getInput(page).boundingBox())!
    const rowBelow = await getCellMouseCoords({ page, columnIndex: 0, rowIndex: 3 })
    expect(box.y + box.height).toBeGreaterThan(rowBelow.y + 5)
    await page.mouse.click(box.x + 20, rowBelow.y + 5)

    await expect(getInput(page)).toBeFocused()
    expect(await getFocusedCell(page)).toEqual({ rowIndex: 1, columnIndex: 0 })
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

  test('scrolls the grid by the mouse wheel over it', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 1000, columns, isRowNumberVisible: true })
    const { x, y } = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 1 })
    await page.mouse.dblclick(x, y)
    await expect(getInput(page)).toBeVisible()
    await page.mouse.wheel(0, 100)

    const getScrollTop = () =>
      page.evaluate(() => window.fastSheets.state.options.elScroll.scrollTop)
    await expect.poll(getScrollTop).toBeGreaterThan(0)
    await page.waitForTimeout(300)
    expect(await getScrollTop()).toBe(100)
  })
})

test.describe('cell editor on a touch screen', () => {
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

  test('opens on a double tap', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await doubleTap(page, 1, 1)

    await expect(getInput(page)).toBeVisible()
    await expect(getInput(page)).toBeFocused()
    await expect(getInput(page)).toHaveText('r1c1')
  })

  test('opens the first cell when the second tap lands just below it', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 6, columns, isRowNumberVisible: true })
    const { x } = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 1 })
    // the border between rows 1 and 2
    const border = await page.evaluate(() => window.fastSheets.state.verticalOffsets[2]!)
    await page.touchscreen.tap(x + 5, border - 4) // the bottom of row 1
    await page.touchscreen.tap(x + 5, border + 6) // the top of row 2

    await expect(getInput(page)).toBeFocused()
    await expect(getInput(page)).toHaveText('r1c1')
    expect(await getFocusedCell(page)).toEqual({ rowIndex: 1, columnIndex: 1 })
  })

  test('does not open when the second tap is far from the first', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 6, columns, isRowNumberVisible: true })
    const first = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 1 })
    const second = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 4 })
    await page.touchscreen.tap(first.x + 5, first.y + 5)
    await page.touchscreen.tap(second.x + 5, second.y + 5)

    await expect(getInput(page)).toBeHidden()
    expect(await getFocusedCell(page)).toEqual({ rowIndex: 4, columnIndex: 1 })
  })

  test('does not open again on a third quick tap', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 6, columns, isRowNumberVisible: true })
    await page.evaluate(() => {
      const { inputController } = window.fastSheetsEditablePlugin
      const showInput = inputController.showInput.bind(inputController)
      inputController.showInput = (cellInfo) => {
        window.showInputCount = (window.showInputCount ?? 0) + 1
        showInput(cellInfo)
      }
    })
    const { x, y } = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 1 })
    await page.touchscreen.tap(x + 5, y + 5)
    await page.touchscreen.tap(x + 5, y + 5)
    await page.touchscreen.tap(x + 5, y + 5)

    await expect(getInput(page)).toBeFocused()
    expect(await page.evaluate(() => window.showInputCount)).toBe(1)
  })

  test('a single tap lets the keyboard move the focused cell', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 6, columns, isRowNumberVisible: true })
    const { x, y } = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 1 })
    await page.touchscreen.tap(x + 5, y + 5)
    await page.keyboard.press('ArrowDown')

    expect(await getFocusedCell(page)).toEqual({ rowIndex: 2, columnIndex: 1 })
  })

  test('a tap focuses the grid when the browser sends no mouse events for it', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 6, columns, isRowNumberVisible: true })
    // as on iOS when a tap changes what is on screen: the mousedown does not focus anything
    await page.evaluate(() => {
      window.addEventListener('mousedown', (e) => e.preventDefault(), { capture: true })
    })
    const { x, y } = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 1 })
    await page.touchscreen.tap(x + 5, y + 5)
    await page.keyboard.press('ArrowDown')

    expect(await getFocusedCell(page)).toEqual({ rowIndex: 2, columnIndex: 1 })
  })

  test('a touch that stops momentum scrolling does not focus a cell', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 6, columns, isRowNumberVisible: true })
    const { x, y } = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 1 })
    // The grid keeps scrolling after a flick: a scroll event every frame. Browsers send no mouse
    // events for a touch that stops the scrolling, but Chromium can't tell these scroll events
    // apart from real ones, so its mouse events are stopped here
    await page.evaluate(() => {
      const { elScroll } = window.fastSheets.state.options
      const scroll = () => elScroll.dispatchEvent(new Event('scroll'))
      const stopMouseDown = (e: MouseEvent) => e.stopPropagation()
      window.addEventListener('mousedown', stopMouseDown, { capture: true })
      scroll()
      const intervalId = setInterval(scroll, 16)
      setTimeout(() => {
        clearInterval(intervalId)
        window.removeEventListener('mousedown', stopMouseDown, { capture: true })
      }, 500)
    })
    await page.touchscreen.tap(x + 5, y + 5)
    expect(await getFocusedCell(page)).toBeUndefined()

    // once the scrolling has stopped, a tap focuses the cell
    await page.waitForTimeout(700)
    await page.touchscreen.tap(x + 5, y + 5)
    expect(await getFocusedCell(page)).toEqual({ rowIndex: 1, columnIndex: 1 })
  })

  test('a mouse click on another cell right after a tap is not ignored', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 6, columns, isRowNumberVisible: true })
    const tapped = await getCellMouseCoords({ page, columnIndex: 0, rowIndex: 1 })
    const clicked = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 4 })
    // a device with both a touchscreen and a mouse
    await page.touchscreen.tap(tapped.x + 5, tapped.y + 5)
    await page.mouse.click(clicked.x + 5, clicked.y + 5)

    expect(await getFocusedCell(page)).toEqual({ rowIndex: 4, columnIndex: 1 })
  })

  /** taps the middle of the open cell editor */
  const tapInput = async (page: Page) => {
    const box = (await getInput(page).boundingBox())!
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  }

  test('a tap in the editor keeps it open with what was typed', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 6, columns, isRowNumberVisible: true })
    await doubleTap(page, 1, 1)
    await page.keyboard.type('abc')
    const typed = await getInput(page).textContent()
    await tapInput(page)

    await expect(getInput(page)).toBeFocused()
    await expect(getInput(page)).toHaveText(typed!)
    expect(await getUpdates(page)).toEqual([])
  })

  test('a double tap in the editor keeps what was typed', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 6, columns, isRowNumberVisible: true })
    await doubleTap(page, 1, 1)
    await page.keyboard.type('abc')
    const typed = await getInput(page).textContent()
    await tapInput(page)
    await tapInput(page)

    await expect(getInput(page)).toBeFocused()
    await expect(getInput(page)).toHaveText(typed!)
    expect(await getUpdates(page)).toEqual([])
  })

  test('a tap on another cell saves and closes the editor', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 6, columns, isRowNumberVisible: true })
    await doubleTap(page, 1, 1)
    await page.keyboard.type('x')
    const typed = await getInput(page).textContent()
    const other = await getCellMouseCoords({ page, columnIndex: 0, rowIndex: 4 })
    await page.touchscreen.tap(other.x + 5, other.y + 5)

    await expect(getInput(page)).toBeHidden()
    expect(await getUpdates(page)).toEqual([[{ rowIndex: 1, columnIndex: 1, value: typed }]])
    expect(await getFocusedCell(page)).toEqual({ rowIndex: 4, columnIndex: 0 })
  })

  test('a tap on a column name saves and closes the editor', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 6, columns, isRowNumberVisible: true })
    await doubleTap(page, 1, 1)
    await page.keyboard.type('x')
    const typed = await getInput(page).textContent()
    const { x } = await getCellMouseCoords({ page, columnIndex: 0, rowIndex: 0 })
    await page.touchscreen.tap(x + 5, 5)

    await expect(getInput(page)).toBeHidden()
    expect(await getUpdates(page)).toEqual([[{ rowIndex: 1, columnIndex: 1, value: typed }]])
    expect(await getFocusedCell(page)).toBeUndefined()
  })

  test('a tap on the top left corner selects all cells', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 3, columns, isRowNumberVisible: true })
    await page.touchscreen.tap(5, 5)

    expect(
      await page.evaluate(() => ({ ...window.fastSheetsEditablePlugin.selectedRange.range })),
    ).toEqual({ rowStart: 0, rowEnd: 2, columnStart: 0, columnEnd: 1 })
  })

  test('stays open when the keyboard makes the grid shorter', async ({ page }) => {
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
      const { state, layout } = window.fastSheets
      const pick = () => ({
        rowHeights: [...state.rowHeights],
        verticalOffsets: [...state.verticalOffsets],
        totalHeight: state.totalHeight,
      })
      const afterEdit = pick()
      layout.init()
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

test.describe('select all', () => {
  const columns = [
    { name: 'A', width: 100 },
    { name: 'B', width: 100 },
    { name: 'C', width: 100 },
  ]
  // the first generated cell has a line break, so it is quoted
  const allCellsText = '"r0\nc0"\tr0c1\tr0c2\nr1c0\tr1c1\tr1c2\nr2c0\tr2c1\tr2c2'
  const allCellsRange = { rowStart: 0, rowEnd: 2, columnStart: 0, columnEnd: 2 }

  for (const shortcut of ['Control+a', 'Meta+a']) {
    test(`${shortcut} selects all cells and keeps the focused cell`, async ({ page }) => {
      await page.goto('/')
      await initFastSheetsWithEditable({ page, rowsCount: 3, columns, isRowNumberVisible: true })
      await clickCell({ page, columnIndex: 1, rowIndex: 1 })
      await page.keyboard.press(shortcut)

      expect(await getSelectedRange(page)).toEqual(allCellsRange)
      expect(await getFocusedCell(page)).toEqual({ rowIndex: 1, columnIndex: 1 })
      expect((await copyToClipboard(page)).text).toBe(allCellsText)
    })
  }

  test('Ctrl+A is prevented on the grid', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 3, columns, isRowNumberVisible: true })
    const prevented = await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'a',
        code: 'KeyA',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
      window.fastSheets.state.options.elContainer.dispatchEvent(event)
      return event.defaultPrevented
    })
    expect(prevented).toBe(true)
  })

  test('a click on the top left corner selects all cells', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 3, columns, isRowNumberVisible: true })
    await page.mouse.click(5, 5)

    expect(await getSelectedRange(page)).toEqual(allCellsRange)
    expect(await getFocusedCell(page)).toEqual({ rowIndex: 0, columnIndex: 0 })
    expect((await copyToClipboard(page)).text).toBe(allCellsText)
  })

  test('a click on a column name does not select all cells', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 3, columns, isRowNumberVisible: true })
    await clickHeaderCell({ page, columnIndex: 1 })

    expect(await getSelectedRange(page)).toBeUndefined()
    expect(await getFocusedCell(page)).toBeUndefined()
  })

  test('Ctrl+A in the cell editor selects its text, not the cells', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 3, columns, isRowNumberVisible: true })
    const { x, y } = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 1 })
    await page.mouse.dblclick(x, y)
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type('new')
    await page.keyboard.press('Enter')

    expect(await getSelectedRange(page)).toBeUndefined()
    expect(await getUpdates(page)).toEqual([[{ rowIndex: 1, columnIndex: 1, value: 'new' }]])
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

  test('pastes into the open cell editor, not into the cells', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    const { x, y } = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 1 })
    await page.mouse.dblclick(x, y)
    const input = page.locator('[data-name="elInput"]')
    await expect(input).toBeFocused()

    await page.evaluate(() => navigator.clipboard.writeText('pasted'))
    await page.keyboard.press('ControlOrMeta+V')

    await expect(input).toHaveText('r1c1pasted')
    expect(await getUpdates(page)).toEqual([])

    await page.keyboard.press('Enter')
    expect(await getUpdates(page)).toEqual([[{ rowIndex: 1, columnIndex: 1, value: 'r1c1pasted' }]])
  })

  test('pastes formatted text into the cell editor as plain text', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    const { x, y } = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 1 })
    await page.mouse.dblclick(x, y)
    const input = page.locator('[data-name="elInput"]')
    await expect(input).toBeFocused()

    // as a web page puts it on the clipboard: formatted HTML along with its plain text
    await page.evaluate(() =>
      navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob(['<b>bold</b> <a href="https://a/">link</a>'], {
            type: 'text/html',
          }),
          'text/plain': new Blob(['bold link'], { type: 'text/plain' }),
        }),
      ]),
    )
    await page.keyboard.press('ControlOrMeta+V')

    await expect(input).toHaveText('r1c1bold link')
    await expect(input.locator('*')).toHaveCount(0)
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

test.describe('headings of the selection', () => {
  const columns = [
    { name: 'A', width: 100 },
    { name: 'B', width: 100 },
    { name: 'C', width: 100 },
  ]
  const white = '#ffffff'
  const highlighted = '#d3e3fd'

  /** the background colors of the column names and the row numbers, read from the canvas */
  const getHeadingColors = (page: Page) =>
    page.evaluate(() => {
      const { state } = window.fastSheets
      const ctx = state.options.elCanvas.getContext('2d')!
      const ratio = Math.max(window.devicePixelRatio, 1)
      // a point near the top left corner of the heading, away from its text and borders
      const getColor = (x: number, y: number) => {
        const [r, g, b] = ctx.getImageData((x + 3) * ratio, (y + 3) * ratio, 1, 1).data
        return '#' + [r, g, b].map((value) => value!.toString(16).padStart(2, '0')).join('')
      }
      const top = state.options.borderWidth
      const left = state.options.borderWidth
      return {
        columns: state.horizontalOffsets.map((offset) => getColor(offset, top)),
        rows: state.verticalOffsets.map((offset) => getColor(left, offset)),
      }
    })

  test('are highlighted for the focused cell', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 3, columns, isRowNumberVisible: true })
    expect(await getHeadingColors(page)).toEqual({
      columns: [white, white, white],
      rows: [white, white, white],
    })

    await clickCell({ page, columnIndex: 1, rowIndex: 2 })
    await expect
      .poll(() => getHeadingColors(page))
      .toEqual({ columns: [white, highlighted, white], rows: [white, white, highlighted] })
  })

  test('are highlighted for a selected range', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 3, columns, isRowNumberVisible: true })
    await clickCell({ page, columnIndex: 1, rowIndex: 0 })
    await page.keyboard.down('Shift')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.up('Shift')

    await expect
      .poll(() => getHeadingColors(page))
      .toEqual({
        columns: [white, highlighted, highlighted],
        rows: [highlighted, highlighted, white],
      })
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

  test('a new width keeps the cell editor open at the new place of its cell', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    const { x, y } = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 1 })
    await page.mouse.dblclick(x, y)
    await page.keyboard.type('yz')
    const getInputPlace = () =>
      page.evaluate(() => {
        const { state } = window.fastSheets
        const elInput = document.querySelector<HTMLElement>('[data-name="elInput"]')!
        return {
          left: parseFloat(elInput.style.left),
          minWidth: parseFloat(elInput.style.minWidth),
          cellLeft: state.horizontalOffsets[1],
          cellWidth: state.columnWidths[1],
        }
      })
    const before = await getInputPlace()
    await resizeGrid(page, 600)
    const after = await getInputPlace()

    // the columns got narrower and the editor followed its cell
    expect(after.cellWidth).toBeLessThan(before.cellWidth!)
    expect(after).toEqual({
      left: after.cellLeft,
      minWidth: after.cellWidth,
      cellLeft: after.cellLeft,
      cellWidth: after.cellWidth,
    })
    await expect(page.locator('[data-name="elInput"]')).toBeFocused()
    await expect(page.locator('[data-name="elInput"]')).toHaveText('r1c1yz')
    expect(await page.evaluate(() => window.updates)).toEqual([])

    await page.keyboard.press('Enter')
    expect(await page.evaluate(() => window.updates)).toEqual([
      [{ rowIndex: 1, columnIndex: 1, value: 'r1c1yz' }],
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

test.describe('clear', () => {
  const columns = [
    { name: 'A', width: 100 },
    { name: 'B', width: 100 },
    { name: 'C', width: 100 },
  ]
  const getCellValue = (page: Page, rowIndex: number, columnIndex: number) =>
    page.evaluate(
      ([rowIndex, columnIndex]) => window.fastSheets.state.options.data[rowIndex!]![columnIndex!],
      [rowIndex, columnIndex],
    )

  for (const key of ['Backspace', 'Delete']) {
    test(`${key} clears the focused cell`, async ({ page }) => {
      await page.goto('/')
      await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
      await clickCell({ page, columnIndex: 1, rowIndex: 1 })
      await page.keyboard.press(key)

      await expect(page.locator('[data-name="elInput"]')).toBeHidden()
      expect(await getUpdates(page)).toEqual([[{ rowIndex: 1, columnIndex: 1, value: '' }]])
      expect(await getCellValue(page, 1, 1)).toBe('')
      expect(await getCellValue(page, 1, 2)).toBe('r1c2')
    })

    test(`${key} clears a selected range and keeps it selected`, async ({ page }) => {
      await page.goto('/')
      await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
      await clickCell({ page, columnIndex: 1, rowIndex: 1 })
      // Shift is held across the arrows, as releasing it starts a new selection
      await page.keyboard.down('Shift')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.up('Shift')
      await page.keyboard.press(key)

      expect(await getUpdates(page)).toEqual([
        [
          { rowIndex: 1, columnIndex: 1, value: '' },
          { rowIndex: 1, columnIndex: 2, value: '' },
          { rowIndex: 2, columnIndex: 1, value: '' },
          { rowIndex: 2, columnIndex: 2, value: '' },
        ],
      ])
      expect(await getCellValue(page, 1, 0)).toBe('r1c0')
      expect(await getCellValue(page, 3, 1)).toBe('r3c1')
      expect(await getSelectedRange(page)).toEqual({
        rowStart: 1,
        rowEnd: 2,
        columnStart: 1,
        columnEnd: 2,
      })
    })
  }

  test('Delete leaves the cells a plugin does not let be edited', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await page.evaluate(() => {
      window.fastSheets.use({
        name: 'read-only',
        setup() {},
        destroy() {},
        canEditCell: (cell) => cell.columnIndex !== 1,
      })
    })
    await clickCell({ page, columnIndex: 0, rowIndex: 1 })
    await page.keyboard.down('Shift')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.up('Shift')
    await page.keyboard.press('Delete')

    expect(await getUpdates(page)).toEqual([
      [
        { rowIndex: 1, columnIndex: 0, value: '' },
        { rowIndex: 1, columnIndex: 2, value: '' },
      ],
    ])
    expect(await getCellValue(page, 1, 1)).toBe('r1c1')
  })

  test('Delete in the cell editor deletes the next character, not the cell', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    const { x, y } = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 1 })
    await page.mouse.dblclick(x, y)
    await page.keyboard.press('Home')
    await page.keyboard.press('Delete')
    await page.keyboard.press('Enter')

    await expect(page.locator('[data-name="elInput"]')).toBeHidden()
    expect(await getUpdates(page)).toEqual([[{ rowIndex: 1, columnIndex: 1, value: '1c1' }]])
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
      searchPlugin.highlightResult([{ rowIndex: 1, columnIndex: 1 }])
    })

    // select two cells, the search hit included
    await clickCell({ page, rowIndex: 1, columnIndex: 1 })
    await page.keyboard.press('Shift+ArrowRight')

    const selected = 'rgb(233, 240, 254)' // DEFAULT_SELECTION_BACKGROUND_COLOR
    expect(await getCellBackgroundPixel(page, { rowIndex: 1, columnIndex: 1 })).toBe(selected)
    expect(await getCellBackgroundPixel(page, { rowIndex: 1, columnIndex: 2 })).toBe(selected)
    // a cell outside the selection
    expect(await getCellBackgroundPixel(page, { rowIndex: 1, columnIndex: 0 })).toBe(
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
