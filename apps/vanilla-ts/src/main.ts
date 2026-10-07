import { FastSheets } from 'fast-sheets'

const elContainer = document.getElementById('fast-sheets')
const { data, columns } = generateData()
if (elContainer) {
  new FastSheets({ elContainer, data, columns, isRowNumberVisible: true })
}

function generateData() {
  const columnWidths = [100, 100, undefined, undefined, 100]

  const columns = columnWidths.map((width, i) => ({
    name: `Column ${i}`,
    width,
  }))

  const data = Array.from({ length: 3000 }, (_, i) => columns.map((_, j) => `${j} : ${i}`))
  return { data, columns }
}
