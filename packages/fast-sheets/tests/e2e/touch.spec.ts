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

  test('keeps the editor open when the tap mouse events go to the grid', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    // Safari and Chrome on iOS send the mouse events of a tap to the element under the finger
    // when the touch started, which is the grid, not the editor opened by the tap.
    // They also send no dblclick for a double tap
    await page.evaluate(() => {
      window.addEventListener('dblclick', (e) => e.stopPropagation(), { capture: true })
      window.addEventListener('touchend', () => {
        const elInput = document.querySelector<HTMLElement>('[data-name="elInput"]')!
        elInput.style.pointerEvents = 'none'
        setTimeout(() => (elInput.style.pointerEvents = ''), 300)
      })
    })
    await doubleTap(page, 1, 1)

    await expect(getInput(page)).toBeVisible()
    await expect(getInput(page)).toBeFocused()
    await page.keyboard.type('x')
    await page.keyboard.press('Enter')
    expect(await page.evaluate(() => window.updates)).toEqual([
      [{ rowIndex: 1, columnIndex: 1, value: 'r1c1x' }],
    ])
  })

  test('sends no mouse events or click for the tap that opened the editor', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    await page.evaluate(() => {
      window.tapEvents = []
      for (const type of ['touchend', 'mousedown', 'mouseup', 'click']) {
        window.addEventListener(type, (e) => {
          // the touchend listener on window runs after the grid's, so it sees the cancel
          window.tapEvents.push(type === 'touchend' ? `touchend:${e.defaultPrevented}` : type)
        })
      }
    })
    await doubleTap(page, 1, 1)
    await expect(getInput(page)).toBeFocused()

    expect(await page.evaluate(() => window.tapEvents)).toEqual([
      // the first tap only focuses the cell, so its mouse events are kept
      'touchend:false',
      'mousedown',
      'mouseup',
      'click',
      // the second tap opens the editor
      'touchend:true',
    ])
  })

  test('turns off the double tap zoom over the grid', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    const touchAction = await page.evaluate(
      () => window.fastSheets.state.options.elContainer.style.touchAction,
    )
    expect(touchAction).toBe('manipulation')
  })
  test('gives the container its touch-action back on destroy', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('fast-sheets').evaluate((el: HTMLElement) => {
      el.style.touchAction = 'pan-y'
    })
    await initFastSheetsWithEditable({ page, rowsCount: 4, columns, isRowNumberVisible: true })
    const touchAction = await page.evaluate(() => {
      window.fastSheetsEditablePlugin.destroy()
      return window.fastSheets.state.options.elContainer.style.touchAction
    })
    expect(touchAction).toBe('pan-y')
  })
})
