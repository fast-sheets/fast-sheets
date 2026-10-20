interface Window {
  isFixtureReady?: boolean
  data: import('lib/core/types').Data
  updates: import('lib/plugins/editable/types').ModifiedCell[][]
  FastSheets: typeof import('lib/core').FastSheets
  FastSheetsEditablePlugin: typeof import('lib/plugins/editable').FastSheetsEditablePlugin
  fastSheets: import('lib/core/types').FastSheetsInstance
  fastSheetsEditablePlugin: InstanceType<
    typeof import('lib/plugins/editable').FastSheetsEditablePlugin
  >
}
