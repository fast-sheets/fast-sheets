interface Window {
  isFixtureReady?: boolean
  data: import('lib/core/types').Data
  updates: import('lib/plugins/editable/types').ModifiedCell[][]
  FastSheets: typeof import('lib/core').FastSheets
  FastSheetsEditablePlugin: typeof import('lib/plugins/editable').FastSheetsEditablePlugin
  FastSheetsSearchPlugin: typeof import('lib/plugins/search').FastSheetsSearchPlugin
  fastSheets: import('lib/core/types').FastSheetsInstance
  fastSheetsEditablePlugin: InstanceType<
    typeof import('lib/plugins/editable').FastSheetsEditablePlugin
  >
  resourceTracker: import('tests/e2e/utils/resource-tracker.ts').ResourceTracker
}
