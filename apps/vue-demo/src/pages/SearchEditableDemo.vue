<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { FastSheets, type Column, type Cell } from 'fast-sheets'
import { FastSheetsEditablePlugin } from 'fast-sheets/editable'
import { FastSheetsSearchPlugin } from 'fast-sheets/search'

let fastSheets: FastSheets
let searchPlugin: FastSheetsSearchPlugin
let generatedData: string[][] = []
const searchQuery = defineModel<string>()
const elContainer = ref<HTMLDivElement | null>(null)

const generateData = () => {
  const columns: Column[] = [
    {
      name: 'Column 1',
      width: 100,
    },
    {
      name: 'Column 2',
      width: 100,
    },
    {
      name: 'Column 3',
      minWidth: 100,
    },
    {
      name: 'Column 4',
      minWidth: 100,
    },
    {
      name: 'Column 5',
      width: 100,
    },
  ]

  // const rowsCount = 100
  const rowsCount = 3000
  // const rowsCount = 1000000 // max height of an element in Chrome is ~1.6m px
  const data = Array.from({ length: rowsCount }, (_, rowIndex) =>
    columns.map((_, columnIndex) => {
      if (rowIndex === 0 && columnIndex === 2) {
        return `${columnIndex + 1} : ${rowIndex + 1}\nwith new line`
      } else if (rowIndex === 0 && columnIndex === 3) {
        return `${columnIndex + 1} : ${rowIndex + 1}\nwith new line\nand another line`
      }
      return `${columnIndex + 1} : ${rowIndex + 1}`
    }),
  )

  return { data, columns }
}

const init = () => {
  if (elContainer.value) {
    const { data, columns } = generateData()
    generatedData = data

    fastSheets = new FastSheets({
      elContainer: elContainer.value,
      data,
      columns,
      isRowNumberVisible: true,
    })

    const editablePlugin = new FastSheetsEditablePlugin({
      canAddRows: true,
      canAddColumns: true,
      onInsertRows(index, count) {
        fastSheets.insertRows(index, count)
      },
      onRemoveRows(index, count) {
        fastSheets.removeRows(index, count)
      },
      onInsertColumns(index, count) {
        fastSheets.insertColumns(index, count)
      },
      onRemoveColumns(index, count) {
        fastSheets.removeColumns(index, count)
      },
      onUpdate(modifiedCells) {
        fastSheets.updateCells(modifiedCells)
      },
    })

    fastSheets.use(editablePlugin)

    searchPlugin = new FastSheetsSearchPlugin()
    fastSheets.use(searchPlugin)
  }
}

const search = () => {
  const cells: Cell[] = []
  generatedData.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      if (searchQuery.value && cell.includes(searchQuery.value)) {
        cells.push({ rowIndex, columnIndex })
      }
    })
  })
  searchPlugin.highlightResult(cells)
}

onMounted(() => {
  init()
})

onUnmounted(() => {
  fastSheets.destroy()
})
</script>

<template>
  <div style="flex-grow: 1; height: 100%">
    <div style="height: 50px; display: flex; align-items: center; gap: 10px">
      <form @submit.prevent="search">
        <label><input type="text" v-model="searchQuery" /></label>&nbsp;
        <button type="submit">Search</button>
      </form>
    </div>
    <div ref="elContainer" style="width: 100%; height: calc(100% - 15px); margin-top: 15px" />
  </div>
</template>
