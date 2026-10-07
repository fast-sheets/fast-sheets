export interface ModifiedCell {
  rowIndex: number
  columnIndex: number
  value: string
}

export interface RawOptions {
  selectionColor?: string
  onUpdate: (modifiedCells: ModifiedCell[]) => void
}

export interface Options extends RawOptions {
  selectionColor: string
}
