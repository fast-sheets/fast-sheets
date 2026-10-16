import { expect, type Page } from '@playwright/test'

export const getCellMouseCoords = ({
  page,
  rowIndex,
  columnIndex,
}: {
  page: Page
  rowIndex: number
  columnIndex: number
}) => {
  return page.evaluate(
    ({ columnIndex, rowIndex }) => {
      const state = window.fastSheets.state
      const x = (state.horizontalOffsets[columnIndex] || 0) + 1
      const y = (state.verticalOffsets[rowIndex] || 0) + 1
      return { x, y }
    },
    { columnIndex, rowIndex },
  )
}

export const clickHeaderCell = async ({
  page,
  columnIndex,
}: {
  page: Page
  columnIndex: number
}) => {
  const point = await getCellMouseCoords({ page, columnIndex, rowIndex: 0 })
  expect(point).not.toBeUndefined()
  if (point) {
    await page.mouse.click(point.x, 1)
  }
}

export const clickCell = async ({
  page,
  rowIndex,
  columnIndex,
}: {
  page: Page
  rowIndex: number
  columnIndex: number
}) => {
  const point = await getCellMouseCoords({ page, columnIndex, rowIndex })
  expect(point).not.toBeUndefined()
  if (point) {
    await page.mouse.click(point.x, point.y)
  }
}
