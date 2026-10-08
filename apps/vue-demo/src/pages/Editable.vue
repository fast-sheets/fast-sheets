<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { FastSheets } from 'fast-sheets'
import { FastSheetsEditablePlugin } from 'fast-sheets/editable'

let fastSheets: InstanceType<typeof FastSheets>
const elContainer = ref<HTMLDivElement | null>(null)

const generateData = () => {
  // const rowsCount = 100
  const rowsCount = 3000
  // const rowsCount = 1000000 // max height of an element in Chrome is ~1.6m px
  const columnWidths = [100, 100, undefined, undefined, 100]

  const columns = columnWidths.map((width, i) => ({
    name: `Column ${i}`,
    width,
  }))

  const data = Array.from({ length: rowsCount }, (_, rowIndex) =>
    columns.map((_, columnIndex) => {
      if (rowIndex === 0 && columnIndex === 2) {
        return `${columnIndex} : ${rowIndex}\nwith new line`
      } else if (rowIndex === 0 && columnIndex === 3) {
        return `${columnIndex} : ${rowIndex}\nwith new line\nand another line`
      }
      return `${columnIndex} : ${rowIndex}`
    }),
  )

  return { data, columns }
}

onMounted(() => {
  if (elContainer.value) {
    const { data, columns } = generateData()

    fastSheets = new FastSheets({
      elContainer: elContainer.value,
      data,
      columns,
      isRowNumberVisible: true,
    })

    const editablePlugin = new FastSheetsEditablePlugin({
      onUpdate(changedCells) {
        changedCells.forEach(({ rowIndex, columnIndex, value }) => {
          if (data[rowIndex]) {
            data[rowIndex][columnIndex] = value
          }
        })
      },
    })

    fastSheets.use(editablePlugin)
  }
})

onUnmounted(() => {
  fastSheets.destroy()
})
</script>

<template>
  <div ref="elContainer" style="width: 100vw; height: 100vh" />
</template>
