/**
 * Finds the index of the "floor" of a value in a sorted array.
 * The "floor" is the largest element less than or equal to the given value.
 * Equivalent to arr.findLastIndex((x) => x <= value), but executes using binary search.
 *
 * @param {readonly number[]} sortedArray - The array sorted in ascending order to search within.
 * @param {number} value - The target value to find the floor of.
 * @returns {number} The index of the floor element, or -1 if no such element exists.
 *
 * @example
 * const arr = [10, 20, 30];
 * findFloorIndex(arr, 25); // Returns 1 (index of 20)
 * findFloorIndex(arr, 5); // Returns -1 (no element is <= 5)
 */
export const findFloorIndex = (sortedArray: readonly number[], value: number): number => {
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
