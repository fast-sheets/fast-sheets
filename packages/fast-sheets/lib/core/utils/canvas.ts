import type { CanvasSize, Viewport } from 'lib/core/types.ts'
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
    width: containerWidth,
    height: containerHeight,
  }
}

/** Fills the whole canvas with the border color, which shows between the cells rendered over it. */
export const clearCanvas = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
  // the previous frame leaves its scale and scroll offset in the transform; without a reset
  // the fill would be shifted and miss the bottom-right part of the canvas
  ctx.setTransform(1, 0, 0, 1, 0, 0)
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
