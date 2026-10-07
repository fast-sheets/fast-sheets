import { FastSheets } from 'fast-sheets'
import { useEffect, useRef } from 'react'

function generateData() {
  const columnWidths = [100, 100, undefined, undefined, 100]

  const columns = columnWidths.map((width, i) => ({
    name: `Column ${i}`,
    width,
  }))

  const data = Array.from({ length: 3000 }, (_, i) => columns.map((_, j) => `${j} : ${i}`))
  return { data, columns }
}

function App() {
  const elContainer = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (elContainer.current) {
      const { data, columns } = generateData()
      const fastSheets = new FastSheets({
        elContainer: elContainer.current,
        data,
        columns,
        isRowNumberVisible: true,
      })

      return () => {
        fastSheets.destroy()
      }
    }
  }, [])

  return <div ref={elContainer} style={{ height: '100dvh' }}></div>
}

export default App
