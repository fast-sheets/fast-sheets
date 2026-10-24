interface Window {
  isFixtureReady?: boolean
  data: import('lib/core/types').Data
  updates: import('lib/plugins/editable/types').ModifiedCell[][]
  showInputCount?: number
  FastSheets: typeof import('lib/core').FastSheets
  FastSheetsEditablePlugin: typeof import('lib/plugins/editable').FastSheetsEditablePlugin
  FastSheetsSearchPlugin: typeof import('lib/plugins/search').FastSheetsSearchPlugin
  fastSheets: import('lib/core').FastSheets
  fastSheetsEditablePlugin: import('lib/plugins/editable').FastSheetsEditablePlugin
  fastSheetsSearchPlugin: import('lib/plugins/search').FastSheetsSearchPlugin
  resourceTracker: import('tests/e2e/utils/resource-tracker.ts').ResourceTracker
}
