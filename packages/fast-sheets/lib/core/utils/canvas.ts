import type { CanvasSize, Viewport } from 'lib/core'
import { DEFAULT_BORDER_COLOR } from 'lib/core/constants.ts'

export const getDevicePixelRatio = () => Math.max(window.devicePixelRatio, 1)

export const getCanvasSize = ({
  offsetWidth: containerWidth,
  offsetHeight: containerHeight,
}: HTMLElement): CanvasSize => {
  const devicePixelRatio = getDevicePixelRatio()
  return {
    widthWithPixelRatio: Math.round(containerWidth * devicePixelRatio),
    heightWithPixelRatio: Math.round(containerHeight * devicePixelRatio),
    width: `${containerWidth}px`,
    height: `${containerHeight}px`,
  }
}

export const clearCanvas = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = DEFAULT_BORDER_COLOR
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

export const getContext = (canvas: HTMLCanvasElement) => canvas.getContext('2d', { alpha: false })

export const setTransform = (
  viewport: Viewport,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
) => {
  const devicePixelRatio = getDevicePixelRatio()
  ctx.setTransform(
    devicePixelRatio,
    0,
    0,
    devicePixelRatio,
    (x - viewport.left) * devicePixelRatio,
    (y - viewport.top) * devicePixelRatio,
  )
}
