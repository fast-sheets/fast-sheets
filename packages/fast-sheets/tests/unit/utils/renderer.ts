import { vi } from 'vitest'
import { Renderer } from 'lib/core/Renderer.ts'
import type { State } from 'lib/core/State.ts'

/** The height the fake context gives every font: the default font height the tests were written for. */
const FONT_HEIGHT = 10

/** A 2D context that measures every font as FONT_HEIGHT high, because jsdom has no canvas. */
const createFakeContext = () =>
  ({
    font: '',
    measureText: () => ({
      actualBoundingBoxAscent: FONT_HEIGHT,
      actualBoundingBoxDescent: 0,
    }),
  }) as unknown as RenderingContext

/**
 * Creates a renderer with measured fonts, so that it can measure rows.
 * It runs `init()` once with a fake canvas context, which also sets the sizes in the state.
 */
export const createMeasuringRenderer = (state: State) => {
  const renderer = new Renderer(state)
  const getContext = vi
    .spyOn(state.options.elCanvas, 'getContext')
    .mockReturnValue(createFakeContext())
  renderer.init()
  getContext.mockRestore()
  return renderer
}
