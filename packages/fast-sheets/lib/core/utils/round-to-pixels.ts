import { getDevicePixelRatio } from 'lib/core/utils/canvas'

export const roundToPixels = (value: number) => {
  const devicePixelRatio = getDevicePixelRatio()
  return Math.floor(value * devicePixelRatio) / devicePixelRatio
}
