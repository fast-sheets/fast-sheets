interface Window {
  isFixtureReady?: boolean
  data: import('lib/core/types').Data
  updates: import('lib/plugins/editable/types').ModifiedCell[][]
  showInputCount?: number
  /** what the test plugins of the hook tests saw, in order */
  hookLog: string[]
  /** makes the test plugins of the hook tests stop the events they get */
  shouldStopEvents?: boolean
  FastSheets: typeof import('lib/core').FastSheets
  FastSheetsEditablePlugin: typeof import('lib/plugins/editable').FastSheetsEditablePlugin
  FastSheetsSearchPlugin: typeof import('lib/plugins/search').FastSheetsSearchPlugin
  fastSheets: import('lib/core').FastSheets
  fastSheetsEditablePlugin: import('lib/plugins/editable').FastSheetsEditablePlugin
  fastSheetsSearchPlugin: import('lib/plugins/search').FastSheetsSearchPlugin
  resourceTracker: import('tests/e2e/utils/resource-tracker.ts').ResourceTracker
}
