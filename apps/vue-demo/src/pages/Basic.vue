<script setup lang="ts">
import { FastSheets, type Column } from 'fast-sheets'
import { onMounted, onUnmounted, ref, watch } from 'vue'

let fastSheets: InstanceType<typeof FastSheets>
const rowsCount = ref(3000)
const elContainer = ref<HTMLDivElement>()

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

  const data = Array.from({ length: rowsCount.value }, (_, rowIndex) =>
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
  <div style="flex-grow: 1; height: 100%">
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
    <div ref="elContainer" style="width: 100%; height: calc(100% - 50px)" />
  </div>
</template>
