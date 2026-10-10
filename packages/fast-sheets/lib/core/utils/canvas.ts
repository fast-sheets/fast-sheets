import type { CanvasSize, Viewport } from 'lib/core'
import { DEFAULT_BORDER_COLOR } from 'lib/core/constants.ts'

export const getCanvasSize = ({
  offsetWidth: containerWidth,
  offsetHeight: containerHeight,
}: HTMLElement): CanvasSize => {
  return {
    widthWithPixelRatio: Math.round(containerWidth * window.devicePixelRatio),
    heightWithPixelRatio: Math.round(containerHeight * window.devicePixelRatio),
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
  ctx.setTransform(
    window.devicePixelRatio,
    0,
    0,
    window.devicePixelRatio,
    (x - viewport.left) * window.devicePixelRatio,
    (y - viewport.top) * window.devicePixelRatio,
  )
}
