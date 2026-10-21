import { getDevicePixelRatio } from 'lib/core/utils/canvas.ts'

export const roundToPixels = (value: number) => {
  const devicePixelRatio = getDevicePixelRatio()
  return Math.floor(value * devicePixelRatio) / devicePixelRatio
}
