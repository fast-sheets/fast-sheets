/**
 * Returns the index of the last element that is `<= value` in an array sorted in ascending order,
 * or -1 if there is no such element. Same result as `arr.findLastIndex((x) => x <= value)`, in O(log n).
 */
export const findLastIndexLessOrEqual = (sortedArray: readonly number[], value: number) => {
  let low = 0
  let high = sortedArray.length // search in [low, high)
  while (low < high) {
    const mid = (low + high) >>> 1
    if ((sortedArray[mid] as number) <= value) {
      low = mid + 1
    } else {
      high = mid
    }
  }
  return low - 1
}
