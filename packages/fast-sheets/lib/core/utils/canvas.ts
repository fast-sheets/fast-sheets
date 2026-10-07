import type { CanvasSize, Viewport } from '../../core/types.ts'
import { DEFAULT_BORDER_COLOR } from '../constants.ts'

export const getCanvasSize = (elCanvasContainer: HTMLElement): CanvasSize => {
  const containerWidth = elCanvasContainer.offsetWidth
  const containerHeight = elCanvasContainer.offsetHeight
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
