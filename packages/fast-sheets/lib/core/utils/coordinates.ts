import type { Coordinate } from 'lib/core/types.ts'

/**
 * Calculates the distance between two coordinates
 */
export const getDistance = (from: Coordinate, to: Coordinate) =>
  Math.hypot(to.x - from.x, to.y - from.y)
