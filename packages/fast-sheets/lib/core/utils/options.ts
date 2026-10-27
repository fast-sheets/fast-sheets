/**
 * Merges options over their defaults, skipping `undefined` values
 */
export const mergeOptions = <Defaults extends object, Options extends object>(
  defaults: Defaults,
  options: Options,
): Defaults & Options => {
  const merged = { ...defaults } as Record<string, unknown>
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) {
      merged[key] = value
    }
  }
  return merged as Defaults & Options
}
