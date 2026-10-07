<script setup lang="ts">
import { FastSheets } from 'fast-sheets'
import { onMounted, onUnmounted, ref } from 'vue'

let fastSheetsPlan: InstanceType<typeof FastSheets>
let fastSheetsFact: InstanceType<typeof FastSheets>

const elContainerPlan = ref<HTMLDivElement | null>(null)
const elContainerFact = ref<HTMLDivElement | null>(null)

const generateData = () => {
  const columnWidths = [100, undefined, 100]
  const rowsCount = 10000

  const columns = columnWidths.map((width, i) => ({
    header: `Column ${i}`,
    width,
  }))

  const data = Array.from({ length: rowsCount }, (_, i) => columns.map((_, j) => `${j} : ${i}`))

  return { columns, data }
}

onMounted(() => {
  const { data, columns } = generateData()

  if (elContainerPlan.value) {
    fastSheetsPlan = new FastSheets({ elContainer: elContainerPlan.value, data, columns })
  }

  if (elContainerFact.value) {
    fastSheetsFact = new FastSheets({ elContainer: elContainerFact.value, data, columns })
  }
})

onUnmounted(() => {
  fastSheetsPlan.destroy()
  fastSheetsFact.destroy()
})
</script>

<template>
  <div style="display: flex; width: 100vw">
    <div style="width: 45%; height: 70vh">
      <h2>Plan</h2>
      <div ref="elContainerPlan" style="width: 100%; height: 100%" />
    </div>
    <div style="width: 45%; height: 70vh; margin-left: 10%">
      <h2>Fact</h2>
      <div ref="elContainerFact" style="width: 100%; height: 100%" />
    </div>
  </div>
</template>
