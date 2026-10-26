import { expect, type Page, test } from '@playwright/test'
import { initFastSheets, initFastSheetsWithEditable } from 'tests/e2e/utils/instance.ts'
import { clickCell, getCellMouseCoords } from 'tests/e2e/utils/cell.ts'
import { pasteFromClipboard } from 'tests/e2e/utils/clipboard.ts'

const COLUMNS = [
  { name: 'A', width: 100 },
  { name: 'B', width: 100 },
  { name: 'C', width: 100 },
]

const RED = 'rgb(255, 0, 0)'
const BLUE = 'rgb(0, 0, 255)'
const GREEN = 'rgb(0, 128, 0)'

/** the color of the canvas at a point in grid coordinates, after a new frame */
const getPixel = (page: Page, point: { x: number; y: number }) =>
  page.evaluate(({ x, y }) => {
    const { state, renderer } = window.fastSheets
    renderer.renderImmediate()
    const { elCanvas } = state.options
    const scale = elCanvas.width / elCanvas.getBoundingClientRect().width
    const [r, g, b] = elCanvas
      .getContext('2d')!
      .getImageData(Math.floor(x * scale), Math.floor(y * scale), 1, 1).data
    return `rgb(${r}, ${g}, ${b})`
  }, point)

/** a point just inside the top-left corner of a data cell: past the border, above the text */
const getCellInnerPoint = (page: Page, cell: { rowIndex: number; columnIndex: number }) =>
  page.evaluate(({ rowIndex, columnIndex }) => {
    const { state } = window.fastSheets
    return {
      x: (state.horizontalOffsets[columnIndex] || 0) + 4,
      y: (state.verticalOffsets[rowIndex] || 0) + 4,
    }
  }, cell)

const getUpdates = (page: Page) => page.evaluate(() => window.updates)

const getInput = (page: Page) => page.locator('[data-name="elInput"]')

test.describe('style hooks', () => {
  test('cellStyle changes the background of data cells and headings', async ({ page }) => {
    await page.goto('/')
    await initFastSheets({ page, rowsCount: 4, columns: COLUMNS, isRowNumberVisible: true })
    await page.evaluate(() => {
      window.fastSheets.use({
        name: 'colors',
        setup() {},
        destroy() {},
        cellStyle(cell, style) {
          if (cell.rowIndex === 1 && cell.columnIndex === 1) {
            style.backgroundColor = 'rgb(255, 0, 0)'
          } else if (cell.rowIndex === -1 && cell.columnIndex === 0) {
            style.backgroundColor = 'rgb(0, 0, 255)'
          }
        },
      })
    })

    expect(
      await getPixel(page, await getCellInnerPoint(page, { rowIndex: 1, columnIndex: 1 })),
    ).toBe(RED)
    expect(
      await getPixel(page, await getCellInnerPoint(page, { rowIndex: 1, columnIndex: 0 })),
    ).toBe('rgb(255, 255, 255)')
    const headingPoint = await page.evaluate(() => ({
      x: (window.fastSheets.state.horizontalOffsets[0] || 0) + 4,
      y: window.fastSheets.state.options.borderWidth + 4,
    }))
    expect(await getPixel(page, headingPoint)).toBe(BLUE)
  })

  test('formatCellText gets the raw text of the corner, headings, row numbers and data cells', async ({
    page,
  }) => {
    await page.goto('/')
    await initFastSheets({ page, rowsCount: 2, columns: COLUMNS, isRowNumberVisible: true })
    const log = await page.evaluate(() => {
      window.hookLog = []
      window.fastSheets.use({
        name: 'format',
        setup() {},
        destroy() {},
        formatCellText(cell, text) {
          if (cell.rowIndex <= 0 && cell.columnIndex <= 0) {
            window.hookLog.push(`${cell.rowIndex}:${cell.columnIndex}:${text}`)
          }
          return `[${text}]`
        },
      })
      window.fastSheets.renderer.renderImmediate()
      return window.hookLog
    })

    const firstValue = await page.evaluate(() => window.fastSheets.state.options.data[0]![0])
    // the corner, a column heading, a row number and a data cell
    expect(log).toEqual(['-1:-1:', '-1:0:A', '0:-1:1', `0:0:${firstValue}`])
  })
})

test.describe('custom fonts', () => {
  test('cellStyle can render a cell with a font from renderer.getFont', async ({ page }) => {
    await page.goto('/')
    await initFastSheets({ page, rowsCount: 4, columns: COLUMNS, isRowNumberVisible: true })
    const fonts = await page.evaluate(() => {
      const { renderer } = window.fastSheets
      window.fastSheets.use({
        name: 'big-font',
        setup() {},
        destroy() {},
        cellStyle(cell, style) {
          if (cell.rowIndex === 1 && cell.columnIndex === 1) {
            style.font = renderer.getFont('bold 16px serif')
          }
        },
      })
      renderer.renderImmediate()
      const font = renderer.getFont('bold 16px serif')
      return {
        name: font.font,
        isMeasured: font.fontHeight > 0,
        isCached: renderer.getFont('bold 16px serif') === font,
      }
    })

    expect(fonts).toEqual({ name: 'bold 16px serif', isMeasured: true, isCached: true })
  })
})

test.describe('rendering hooks', () => {
  test('afterFrameRender renders on top of the cells', async ({ page }) => {
    await page.goto('/')
    await initFastSheets({ page, rowsCount: 4, columns: COLUMNS, isRowNumberVisible: true })
    await page.evaluate(() => {
      window.fastSheets.use({
        name: 'overlay',
        setup() {},
        destroy() {},
        afterFrameRender({ ctx, setOrigin }) {
          const { state } = window.fastSheets
          setOrigin(state.horizontalOffsets[1] || 0, state.verticalOffsets[1] || 0)
          ctx.fillStyle = 'rgb(0, 128, 0)'
          ctx.fillRect(0, 0, 10, 10)
        },
      })
    })

    expect(
      await getPixel(page, await getCellInnerPoint(page, { rowIndex: 1, columnIndex: 1 })),
    ).toBe(GREEN)
  })

  test('afterFrameRender gets the visible range as it is, before the headings are left out', async ({
    page,
  }) => {
    await page.goto('/')
    await initFastSheets({ page, rowsCount: 4, columns: COLUMNS, isRowNumberVisible: true })
    const visibleRange = await page.evaluate(() => {
      let range
      window.fastSheets.use({
        name: 'range',
        setup() {},
        destroy() {},
        afterFrameRender({ visibleRange }) {
          range = { ...visibleRange }
        },
      })
      window.fastSheets.renderer.renderImmediate()
      return range
    })

    // the grid is not scrolled, so the viewport begins at the header-row and the numbering-column
    expect(visibleRange).toMatchObject({ rowStart: -1, columnStart: -1 })
  })

  test('renderCellBorders renders around a cell after its neighbors', async ({ page }) => {
    await page.goto('/')
    await initFastSheets({ page, rowsCount: 4, columns: COLUMNS, isRowNumberVisible: true })
    await page.evaluate(() => {
      window.fastSheets.use({
        name: 'borders',
        setup() {},
        destroy() {},
        renderCellBorders({ ctx, cell, width, height, borderWidth }) {
          if (cell.rowIndex === 1 && cell.columnIndex === 1) {
            ctx.fillStyle = 'rgb(255, 0, 0)'
            ctx.fillRect(width, 0, borderWidth, height) // the right border, shared with the next cell
          }
        },
      })
    })

    const point = await page.evaluate(() => {
      const { state } = window.fastSheets
      return {
        x: (state.horizontalOffsets[2] || 0) - 0.5,
        y: (state.verticalOffsets[1] || 0) + 4,
      }
    })
    expect(await getPixel(page, point)).toBe(RED)
  })
})

test.describe('input hooks', () => {
  test('run from the last registered plugin, which can stop the others', async ({ page }) => {
    await page.goto('/')
    await initFastSheets({ page, rowsCount: 4, columns: COLUMNS, isRowNumberVisible: true })
    await page.evaluate(() => {
      window.hookLog = []
      for (const name of ['bottom', 'top']) {
        window.fastSheets.use({
          name,
          setup() {},
          destroy() {},
          onMouseDown(e) {
            const { clientX, clientY } = e.native
            const cell = window.fastSheets.renderer.findCellAtPoint(clientX, clientY)
            window.hookLog.push(`${name}:${cell?.rowIndex}:${cell?.columnIndex}`)
            if (window.shouldStopEvents) {
              e.stop()
            }
          },
        })
      }
    })

    await clickCell({ page, rowIndex: 1, columnIndex: 2 })
    expect(await page.evaluate(() => window.hookLog)).toEqual(['top:1:2', 'bottom:1:2'])

    await page.evaluate(() => {
      window.hookLog = []
      window.shouldStopEvents = true
    })
    await clickCell({ page, rowIndex: 1, columnIndex: 2 })
    expect(await page.evaluate(() => window.hookLog)).toEqual(['top:1:2'])
  })

  test('a plugin above the editable plugin can keep it from opening the editor', async ({
    page,
  }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({
      page,
      rowsCount: 4,
      columns: COLUMNS,
      isRowNumberVisible: true,
    })
    await page.evaluate(() => {
      window.fastSheets.use({
        name: 'checkbox',
        setup() {},
        destroy() {},
        onDoubleClick(e) {
          const { clientX, clientY } = e.native
          if (window.fastSheets.renderer.findCellAtPoint(clientX, clientY)?.columnIndex === 0) {
            e.stop()
          }
        },
      })
    })

    const point = await getCellMouseCoords({ page, rowIndex: 1, columnIndex: 0 })
    await page.mouse.dblclick(point.x, point.y)
    await expect(getInput(page)).toBeHidden()

    const otherPoint = await getCellMouseCoords({ page, rowIndex: 1, columnIndex: 1 })
    await page.mouse.dblclick(otherPoint.x, otherPoint.y)
    await expect(getInput(page)).toBeVisible()
  })
})

test.describe('data hooks', () => {
  test('canEditCell keeps cells from being edited', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({
      page,
      rowsCount: 4,
      columns: COLUMNS,
      isRowNumberVisible: true,
    })
    await page.evaluate(() => {
      window.fastSheets.use({
        name: 'read-only',
        setup() {},
        destroy() {},
        canEditCell: (cell) => cell.columnIndex !== 1,
      })
    })

    const point = await getCellMouseCoords({ page, rowIndex: 0, columnIndex: 1 })
    await page.mouse.dblclick(point.x, point.y)
    await expect(getInput(page)).toBeHidden()
    await page.keyboard.press('x')
    await page.keyboard.press('Backspace')
    expect(await getUpdates(page)).toEqual([])

    await clickCell({ page, rowIndex: 0, columnIndex: 0 })
    await pasteFromClipboard(page, 'a\tb\tc')
    expect(await getUpdates(page)).toEqual([
      [
        { rowIndex: 0, columnIndex: 0, value: 'a' },
        { rowIndex: 0, columnIndex: 2, value: 'c' },
      ],
    ])
  })

  test('beforeCellsChange can change or reject edits', async ({ page }) => {
    await page.goto('/')
    await initFastSheetsWithEditable({
      page,
      rowsCount: 4,
      columns: COLUMNS,
      isRowNumberVisible: true,
    })
    await page.evaluate(() => {
      window.hookLog = []
      window.fastSheets.use({
        name: 'upper-case',
        setup() {},
        destroy() {},
        beforeCellsChange(changes) {
          if (changes.some(({ value }) => value === 'reject')) {
            return false
          }
          return changes.map((change) => ({ ...change, value: change.value.toUpperCase() }))
        },
        afterCellsChange(changes) {
          window.hookLog.push(...changes.map(({ value }) => value))
        },
      })
    })
    const getFirstValue = () => page.evaluate(() => window.fastSheets.state.options.data[0]![0])

    await clickCell({ page, rowIndex: 0, columnIndex: 0 })
    await pasteFromClipboard(page, 'abc')
    expect(await getUpdates(page)).toEqual([[{ rowIndex: 0, columnIndex: 0, value: 'ABC' }]])
    expect(await getFirstValue()).toBe('ABC')
    expect(await page.evaluate(() => window.hookLog)).toEqual(['ABC'])

    await pasteFromClipboard(page, 'reject')
    expect(await getUpdates(page)).toHaveLength(1)
    expect(await getFirstValue()).toBe('ABC')
  })
})

test.describe('layout hooks', () => {
  test('apply when the plugin is registered and stop when it is removed', async ({ page }) => {
    await page.goto('/')
    await initFastSheets({ page, rowsCount: 4, columns: COLUMNS, isRowNumberVisible: true })
    const widths = await page.evaluate(() => {
      window.hookLog = []
      const fastSheets = window.fastSheets
      const before = [...fastSheets.state.columnWidths]
      fastSheets.use({
        name: 'wide',
        setup() {},
        destroy() {
          fastSheets.unregister('wide')
        },
        getColumnWidth: (columnIndex, width) => (columnIndex === 0 ? 150 : width),
        afterLayout() {
          window.hookLog.push(`afterLayout:${fastSheets.state.columnWidths[0]}`)
        },
      })
      const withPlugin = [...fastSheets.state.columnWidths]
      fastSheets.unregister('wide')
      return { before, withPlugin, after: [...fastSheets.state.columnWidths] }
    })

    expect(widths).toEqual({
      before: [100, 100, 100],
      withPlugin: [150, 100, 100],
      after: [100, 100, 100],
    })
    expect(await page.evaluate(() => window.hookLog)).toEqual(['afterLayout:150'])
  })
})
