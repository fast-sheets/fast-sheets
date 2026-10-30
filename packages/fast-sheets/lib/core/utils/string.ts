/**
 * Counts the lines in a string: number of "\n" + 1
 */
export const getLinesCount = (text: string) => {
  let linesCount = 1
  let index = text.indexOf('\n')
  while (index !== -1) {
    linesCount++
    index = text.indexOf('\n', index + 1)
  }
  return linesCount
}

const ENGLISH_PLURAL_RULES = new Intl.PluralRules('en')
const ENGLISH_NUMBER_FORMATTER = new Intl.NumberFormat('en')

/**
 * The count with the English noun form that fits it: "1 row", "3 rows", "1,000 rows".
 * The count is formatted with English digit grouping by `Intl.NumberFormat`.
 * The plural category comes from `Intl.PluralRules`, so 0 and fractions take the plural too.
 * Both round fractions the same way, so the noun form always fits the number shown.
 */
export const formatNounWithNumber = (count: number, singular: string, plural: string) => {
  const category = ENGLISH_PLURAL_RULES.select(count)
  const word = category === 'one' ? singular : plural
  const formattedNumber = ENGLISH_NUMBER_FORMATTER.format(count)
  return `${formattedNumber} ${word}`
}
