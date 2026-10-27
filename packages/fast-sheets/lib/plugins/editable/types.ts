import type { Cell, ModifiedCell } from 'lib/core/types.ts'

export interface RawOptions {
  selectionColor?: string
  onUpdate: (modifiedCells: ModifiedCell[]) => void
  /** Whether a data cell can be edited. All cells can be edited by default. */
  canEditCell?: (cell: Readonly<Cell>) => boolean
}

export interface Options extends RawOptions {
  selectionColor: string
  canEditCell: (cell: Readonly<Cell>) => boolean
}
