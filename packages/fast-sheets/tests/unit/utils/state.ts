import { State } from 'lib/core/State.ts'
import { generateData } from 'tests/utils/generators.ts'

import type { Column } from 'lib/core'

export const createState = ({
  rowsCount,
  columns,
  hasHeaderRow,
  isRowNumberVisible,
  borderWidth = 1,
}: {
  rowsCount: number
  columns: Column[]
  hasHeaderRow: boolean
  isRowNumberVisible: boolean
  borderWidth?: number
}) => {
  const state = new State()
  state.hasHeaderRow = hasHeaderRow
  state.options = {
    elContainer: document.createElement('div'),
    elCanvasContainer: document.createElement('div'),
    elCanvas: document.createElement('canvas'),
    elScroll: document.createElement('div'),
    elScrollInner: document.createElement('div'),
    elScrollPaneX: document.createElement('div'),
    elScrollPaneY: document.createElement('div'),
    borderWidth,
    data: generateData(rowsCount, columns.length),
    columns: [],
    isRowNumberVisible,
  }
  if (hasHeaderRow) {
    state.options.columns = columns
  }
  return state
}
