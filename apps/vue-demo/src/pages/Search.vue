<script setup lang="ts">
import { FastSheets, type Cell } from 'fast-sheets'
import { onMounted, onUnmounted, ref } from 'vue'
import { FastSheetsSearchPlugin } from 'fast-sheets/search'

let fastSheets: InstanceType<typeof FastSheets>
let searchPlugin: InstanceType<typeof FastSheetsSearchPlugin>
let generatedData: string[][] = []
const searchQuery = defineModel<string>()
const elContainer = ref<HTMLDivElement | null>(null)

const generateData = () => {
  const columnWidths = [100, 100, undefined, undefined, 100]
  const rowsCount = 3000

  const columns = columnWidths.map((width, i) => ({
    header: `Column ${i}`,
    width,
  }))

  const data = Array.from({ length: rowsCount }, (_, i) => columns.map((_, j) => `${j} : ${i}`))

  return { columns, data }
}

const init = () => {
  if (elContainer.value) {
    const { data, columns } = generateData()
    generatedData = data
    fastSheets = new FastSheets({ elContainer: elContainer.value, data, columns })
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
  <div style="flex-grow: 1">
    <div style="height: 50px; display: flex; align-items: center; gap: 10px">
      <form @submit.prevent="search">
        <label><input type="text" v-model="searchQuery" /></label>&nbsp;
        <button type="submit">Search</button>
      </form>
    </div>
    <div ref="elContainer" style="width: 100%; height: calc(100vh - 50px)" />
  </div>
</template>
