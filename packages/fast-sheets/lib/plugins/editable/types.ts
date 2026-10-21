import type { ModifiedCell } from 'lib/core/types.ts'

export interface RawOptions {
  selectionColor?: string
  onUpdate: (modifiedCells: ModifiedCell[]) => void
}

export interface Options extends RawOptions {
  selectionColor: string
}
