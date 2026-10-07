<script setup lang="ts">
import { FastSheets } from 'fast-sheets'
import { onMounted, onUnmounted, ref, watch } from 'vue'

let fastSheets: InstanceType<typeof FastSheets>
const rowsCount = ref(3000)
const elContainer = ref<HTMLDivElement>()

const generateData = () => {
  const columnWidths = [100, 100, undefined, undefined, 100]

  const columns = columnWidths.map((width, i) => ({
    name: `Column ${i}`,
    width,
  }))

  const data = Array.from({ length: rowsCount.value }, (_, rowIndex) =>
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

const init = () => {
  if (elContainer.value) {
    const { data, columns } = generateData()
    fastSheets = new FastSheets({
      elContainer: elContainer.value,
      data,
      columns,
      isRowNumberVisible: true,
    })
  }
}

const onChangeAmount = () => {
  fastSheets.destroy()
  init()
}

watch(rowsCount, onChangeAmount)

onMounted(() => {
  init()
})

onUnmounted(() => {
  fastSheets.destroy()
})
</script>

<template>
  <div style="flex-grow: 1">
    <div style="height: 50px; display: flex; align-items: center">
      <label>
        Amount:
        <select v-model="rowsCount">
          <option>100</option>
          <option>3000</option>
          <option>1000000</option>
        </select>
      </label>
    </div>
    <div ref="elContainer" style="height: calc(100dvh - 50px)" />
  </div>
</template>
