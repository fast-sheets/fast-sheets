import { expect, test } from '@playwright/test'
import { initFastSheets } from 'tests/e2e/utils/instance.ts'
import { getCellMouseCoords } from 'tests/e2e/utils/cell.ts'
import {
  getEventListeners,
  trackAnimationFrames,
  trackEventListeners,
  trackResizeObservers,
} from 'tests/e2e/utils/resource-tracker.ts'

const COLUMNS = [
  { name: 'A', width: 100 },
  { name: 'B', width: 100 },
  { name: 'C', width: 100 },
]

test.describe('init instance', () => {
  test('has all elements', async ({ page }) => {
    await page.goto('/')
    await initFastSheets({ page, rowsCount: 4, columns: COLUMNS, isRowNumberVisible: true })
    await expect(page.getByTestId('fast-sheets').locator(' > *')).toHaveCount(2)
  })
})

test.describe('before the first layout', () => {
  test('rendering does nothing instead of throwing', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => window.isFixtureReady === true)
    const error = await page.getByTestId('fast-sheets').evaluate((elContainer: HTMLElement) => {
      // the resize observer lays the grid out later, so nothing is measured yet
      const fastSheets = new window.FastSheets({
        elContainer,
        data: [['a', 'b']],
        columns: [{ name: 'A' }, { name: 'B' }],
      })
      const searchPlugin = new window.FastSheetsSearchPlugin()
      fastSheets.use(searchPlugin)
      try {
        searchPlugin.highlightResult([{ rowIndex: 0, columnIndex: 0 }])
        fastSheets.renderer.renderImmediate()
        return ''
      } catch (err) {
        return String(err)
      }
    })
    expect(error).toBe('')
  })
})

test.describe('cell borders', () => {
  test('are rendered after scrolling', async ({ page }) => {
    await page.goto('/')
    const columns = Array.from({ length: 15 }, (_, i) => ({ name: `C${i}`, width: 100 }))
    await initFastSheets({ page, rowsCount: 200, columns, isRowNumberVisible: true })

    const borders = await page.evaluate(() => {
      const { state, renderer } = window.fastSheets
      const { elCanvas, elScroll } = state.options
      const ctx = elCanvas.getContext('2d')!
      const scale = elCanvas.width / elCanvas.getBoundingClientRect().width
      /** the color of the grid at a point, in grid coordinates */
      const getPixel = (x: number, y: number) => {
        const canvasX = Math.floor((x - state.viewport.left) * scale)
        const canvasY = Math.floor((y - state.viewport.top) * scale)
        const [r, g, b] = ctx.getImageData(canvasX, canvasY, 1, 1).data
        return `rgb(${r}, ${g}, ${b})`
      }

      // scroll in small steps, as a wheel does, rendering a frame at each step
      for (let step = 1; step <= 10; step++) {
        elScroll.scrollTop = step * 23
        elScroll.scrollLeft = step * 17
        renderer.renderImmediate()
      }

      // near the bottom-right corner: the part a clear shifted by the scroll position misses
      const rowIndex = renderer.findRowIndex(state.viewport.bottom) - 1
      const columnIndex = renderer.findColumnIndex(state.viewport.right) - 1
      const top = state.verticalOffsets[rowIndex]!
      const left = state.horizontalOffsets[columnIndex]!
      return {
        // the 1px borders right above and left of a cell
        horizontal: getPixel(left + 50, top - 0.5),
        vertical: getPixel(left - 0.5, top + 10),
      }
    })

    const borderColor = 'rgb(233, 233, 233)' // DEFAULT_BORDER_COLOR
    expect(borders).toEqual({ horizontal: borderColor, vertical: borderColor })
  })
})

test.describe('mouse wheel', () => {
  test('scrolls the grid once by the wheel delta', async ({ page }) => {
    await page.goto('/')
    await initFastSheets({ page, rowsCount: 1000, columns: COLUMNS, isRowNumberVisible: true })
    const { x, y } = await getCellMouseCoords({ page, columnIndex: 1, rowIndex: 2 })
    await page.mouse.move(x, y)
    await page.mouse.wheel(0, 100)

    const getScrollTop = () =>
      page.evaluate(() => window.fastSheets.state.options.elScroll.scrollTop)
    await expect.poll(getScrollTop).toBeGreaterThan(0)
    // a second scroll by the same delta would come right after the first
    await page.waitForTimeout(300)
    expect(await getScrollTop()).toBe(100)
  })
})

test.describe('plugins', () => {
  test('hasPlugin follows the plugins that are added and destroyed', async ({ page }) => {
    await page.goto('/')
    const columns = [
      { name: 'A', width: 100 },
      { name: 'B', width: 100 },
    ]
    await initFastSheets({ page, rowsCount: 2, columns, isRowNumberVisible: true })
    const registered = await page.evaluate(() => {
      const fastSheets = window.fastSheets
      const names = () => ['editable', 'search'].filter((name) => fastSheets.hasPlugin(name))
      const editable = new window.FastSheetsEditablePlugin({ onUpdate() {} })
      const search = new window.FastSheetsSearchPlugin()
      const withNone = names()
      fastSheets.use(editable)
      fastSheets.use(search)
      const withBoth = names()
      editable.destroy()
      const withSearch = names()
      search.destroy()
      return { withNone, withBoth, withSearch, afterAll: names() }
    })

    expect(registered).toEqual({
      withNone: [],
      withBoth: ['editable', 'search'],
      withSearch: ['search'],
      afterAll: [],
    })
  })
})

test.describe('destroy instance', () => {
  test('removes all elements', async ({ page }) => {
    await page.goto('/')
    await initFastSheets({ page, rowsCount: 4, columns: COLUMNS, isRowNumberVisible: true })
    await expect(page.getByTestId('fast-sheets').locator(' > *')).toHaveCount(2)
    await page.evaluate(() => {
      window.fastSheets.destroy()
    })
    await expect(page.getByTestId('fast-sheets').locator(' > *')).toHaveCount(0)
  })

  test('releases the canvas bitmap', async ({ page }) => {
    await page.goto('/')
    await initFastSheets({ page, rowsCount: 4, columns: COLUMNS, isRowNumberVisible: true })

    const size = await page.evaluate(() => {
      const { elCanvas } = window.fastSheets.state.options
      window.fastSheets.destroy()
      return { width: elCanvas.width, height: elCanvas.height }
    })

    expect(size).toEqual({ width: 0, height: 0 })
  })

  test('can be called more than once', async ({ page }) => {
    await page.goto('/')
    await initFastSheets({ page, rowsCount: 4, columns: COLUMNS, isRowNumberVisible: true })

    const error = await page.evaluate(() => {
      try {
        window.fastSheets.destroy()
        window.fastSheets.destroy()
        return null
      } catch (e) {
        return String(e)
      }
    })

    expect(error).toBeNull()
  })

  test('does not remove elements it did not create', async ({ page }) => {
    await page.goto('/')
    await initFastSheets({ page, rowsCount: 4, columns: COLUMNS, isRowNumberVisible: true })

    const isElementKept = await page
      .getByTestId('fast-sheets')
      .evaluate(async (elContainer: HTMLElement) => {
        // the caller keeps its own scroller in its own wrapper and passes it in
        const elWrapper = document.createElement('div')
        document.body.appendChild(elWrapper)
        const elScroll = document.createElement('div')
        elWrapper.appendChild(elScroll)

        const fastSheets = new window.FastSheets({
          elContainer,
          elScroll,
          data: [['a']],
        })
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        fastSheets.destroy()

        return elWrapper.contains(elScroll)
      })

    expect(isElementKept).toBe(true)
  })

  test('removes every listener it registered', async ({ page }) => {
    await trackEventListeners(page)
    await page.goto('/')
    await page.waitForFunction(() => window.isFixtureReady === true)
    const originListeners = await getEventListeners(page)
    await initFastSheets({ page, rowsCount: 20, columns: COLUMNS, isRowNumberVisible: true })

    expect(await getEventListeners(page)).not.toEqual(originListeners)

    await page.evaluate(() => {
      window.fastSheets.destroy()
    })

    expect(await getEventListeners(page)).toEqual(originListeners)
  })

  test('disconnects its ResizeObservers', async ({ page }) => {
    await trackResizeObservers(page)
    await page.goto('/')
    await initFastSheets({ page, rowsCount: 20, columns: COLUMNS, isRowNumberVisible: true })
    expect(await page.evaluate(() => window.resourceTracker.liveObservers())).toBeGreaterThan(0)

    await page.evaluate(() => {
      window.fastSheets.destroy()
    })

    expect(await page.evaluate(() => window.resourceTracker.liveObservers())).toBe(0)
  })

  test('cancels the animation frame that is pending when it is destroyed', async ({ page }) => {
    await trackAnimationFrames(page)
    await page.goto('/')
    await initFastSheets({ page, rowsCount: 20, columns: COLUMNS, isRowNumberVisible: true })

    const result = await page.evaluate(async () => {
      const { fastSheets } = window
      let renders = 0
      const renderImmediate = fastSheets.renderer.renderImmediate.bind(fastSheets.renderer)
      fastSheets.renderer.renderImmediate = () => {
        renders++
        renderImmediate()
      }

      fastSheets.renderer.render() // requests a frame
      const pendingBeforeDestroy = window.resourceTracker.pendingFrames()
      fastSheets.destroy()
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })

      return {
        pendingBeforeDestroy,
        renders,
        pendingAfterDestroy: window.resourceTracker.pendingFrames(),
      }
    })

    expect(result.pendingBeforeDestroy).toBeGreaterThan(0)
    expect(result.renders).toBe(0) // the stale frame must not render into a destroyed grid
    expect(result.pendingAfterDestroy).toBe(0)
  })

  test('does not accumulate resources when the grid is created and destroyed repeatedly', async ({
    page,
  }) => {
    await trackEventListeners(page)
    await trackResizeObservers(page)
    await trackAnimationFrames(page)
    await page.goto('/')

    // the way a framework wrapper mounts and unmounts the grid
    const cycles = await page
      .getByTestId('fast-sheets')
      .evaluate(async (elContainer: HTMLElement) => {
        const data = [
          ['a', 'b'],
          ['c', 'd'],
        ]
        const columns = [
          { name: 'A', width: 100 },
          { name: 'B', width: 100 },
        ]

        const listenersBefore = window.resourceTracker.listeners().length
        const results = []
        for (let i = 0; i < 5; i++) {
          const fastSheets = new window.FastSheets({ elContainer, data, columns })
          const nextFrames = () =>
            new Promise<void>((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
            })
          await nextFrames()
          fastSheets.destroy()
          await nextFrames()
          results.push({
            newListeners: window.resourceTracker.listeners().length - listenersBefore,
            liveObservers: window.resourceTracker.liveObservers(),
            pendingFrames: window.resourceTracker.pendingFrames(),
            containerChildren: elContainer.children.length,
          })
        }
        return results
      })

    const released = { newListeners: 0, liveObservers: 0, pendingFrames: 0, containerChildren: 0 }
    expect(cycles).toEqual(Array(5).fill(released))
  })
})
