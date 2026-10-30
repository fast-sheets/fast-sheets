import type { Cell, ModifiedCell } from 'lib/core/types.ts'

/**
 * The texts of the context menu items. Each gets the number of selected rows or columns the item acts on,
 * so that an app can build the whole sentence with its own i18n library, plurals and word order included.
 */
export interface ContextMenuLabels {
  insertRowsAbove: (count: number) => string
  insertRowsBelow: (count: number) => string
  deleteRows: (count: number) => string
  insertColumnsLeft: (count: number) => string
  insertColumnsRight: (count: number) => string
  deleteColumns: (count: number) => string
}

/** The texts the plugin shows, grouped by the part of its UI they belong to. */
export interface Labels {
  contextMenu: ContextMenuLabels
}

/** Texts to replace the English defaults. Missing ones keep their default. */
export interface RawLabels {
  contextMenu?: Partial<ContextMenuLabels>
}

export interface RawOptions {
  selectionColor?: string
  onUpdate: (modifiedCells: ModifiedCell[]) => void
  /** Whether a data cell can be edited. All cells can be edited by default. */
  canEditCell?: (cell: Readonly<Cell>) => boolean
  /** Texts to replace the English defaults, such as the ones of the context menu items. Missing ones keep their default. */
  labels?: RawLabels
  /** Whether the context menu offers to insert and delete rows. Off by default. */
  canAddRows?: boolean
  /** Whether the context menu offers to insert and delete columns. Off by default. */
  canAddColumns?: boolean
  /** Reports `count` rows inserted before the row at `index`. The app applies it using `instance.insertRows()`. */
  onInsertRows?: (index: number, count: number) => void
  /** Reports `count` rows deleted from the row at `index`. The app applies it using `instance.removeRows()`. */
  onRemoveRows?: (index: number, count: number) => void
  /** Reports `count` columns inserted before the column at `index`. The app applies it using `instance.insertColumns()`. */
  onInsertColumns?: (index: number, count: number) => void
  /** Reports `count` columns deleted from the column at `index`. The app applies it using `instance.removeColumns()`. */
  onRemoveColumns?: (index: number, count: number) => void
}

export interface Options extends RawOptions {
  selectionColor: string
  canEditCell: (cell: Readonly<Cell>) => boolean
  canAddRows: boolean
  canAddColumns: boolean
  labels: Labels
}
