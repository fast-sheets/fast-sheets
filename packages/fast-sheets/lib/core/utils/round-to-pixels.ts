export const roundToPixels = (value: number, devicePixelRatio: number) =>
  Math.round(value * devicePixelRatio) / devicePixelRatio
