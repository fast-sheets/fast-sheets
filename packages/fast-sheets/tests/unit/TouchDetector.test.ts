import { describe, expect, it } from 'vitest'
import { TouchDetector } from 'lib/core/utils/TouchDetector.ts'
import type { Cell } from 'lib/core/types.ts'

/** a pointer event with the given time: a real one would take the current time */
const touch = (
  timeStamp: number,
  clientX = 10,
  clientY = 10,
  pointerType = 'touch',
  isPrimary = true,
) => ({ pointerType, timeStamp, clientX, clientY, isPrimary }) as PointerEvent

/** a mouse event with the given time, at a point */
const mouse = (timeStamp: number, clientX = 10, clientY = 10) =>
  ({ timeStamp, clientX, clientY }) as MouseEvent

const row1: Cell = { rowIndex: 1, columnIndex: 0 }
const row2: Cell = { rowIndex: 2, columnIndex: 0 }

/** a touch from `down` to `up` at a point, returning what the detector made of it */
const tap = (
  detector: TouchDetector,
  cell: Cell | undefined,
  { down, up, x = 10, y = 10 }: { down: number; up: number; x?: number; y?: number },
) => {
  detector.savePointerDown(touch(down, x, y), cell)
  return detector.getTapInfo(touch(up, x, y))
}

describe('TouchDetector', () => {
  it('detects a tap and then a double tap', () => {
    const detector = new TouchDetector()
    expect(tap(detector, row1, { down: 1000, up: 1050 })).toEqual({
      isTap: true,
      isDoubleTap: false,
      targetCell: row1,
    })
    expect(tap(detector, row1, { down: 1200, up: 1250 })).toEqual({
      isTap: true,
      isDoubleTap: true,
      targetCell: row1,
    })
  })

  it('gives a drifted second tap the first tap cell', () => {
    const detector = new TouchDetector()
    tap(detector, row1, { down: 1000, up: 1050, y: 10 })
    expect(tap(detector, row2, { down: 1200, up: 1250, y: 30 })).toEqual({
      isTap: true,
      isDoubleTap: true,
      targetCell: row1,
    })
  })

  it('makes a far second tap a new tap on its own cell', () => {
    const detector = new TouchDetector()
    tap(detector, row1, { down: 1000, up: 1050, y: 10 })
    expect(tap(detector, row2, { down: 1200, up: 1250, y: 100 })).toEqual({
      isTap: true,
      isDoubleTap: false,
      targetCell: row2,
    })
  })

  it('makes a late second tap a new tap', () => {
    const detector = new TouchDetector()
    tap(detector, row1, { down: 1000, up: 1050 })
    expect(tap(detector, row1, { down: 1400, up: 1450 }).isDoubleTap).toBe(false)
  })

  it('measures the time between taps from the end of the first one', () => {
    const detector = new TouchDetector()
    // a slow first tap: its start is 500ms before the second tap, its end only 250ms
    tap(detector, row1, { down: 1000, up: 1250 })
    expect(tap(detector, row1, { down: 1500, up: 1550 }).isDoubleTap).toBe(true)
  })

  it('starts over after a double tap', () => {
    const detector = new TouchDetector()
    tap(detector, row1, { down: 1000, up: 1050 })
    tap(detector, row1, { down: 1150, up: 1200 })
    expect(tap(detector, row1, { down: 1300, up: 1350 }).isDoubleTap).toBe(false)
  })

  it('detects a tap off the cells', () => {
    const detector = new TouchDetector()
    expect(tap(detector, undefined, { down: 1000, up: 1050 })).toEqual({
      isTap: true,
      isDoubleTap: false,
      targetCell: undefined,
    })
  })

  it('ignores an additional finger during a tap', () => {
    const detector = new TouchDetector()
    detector.savePointerDown(touch(1000, 10, 10), row1)
    // a second finger lands and lifts far away while the first one is still down
    detector.savePointerDown(touch(1020, 10, 100, 'touch', false), row2)
    expect(detector.getTapInfo(touch(1040, 10, 100, 'touch', false)).isTap).toBe(false)

    expect(detector.getTapInfo(touch(1050, 10, 10))).toEqual({
      isTap: true,
      isDoubleTap: false,
      targetCell: row1,
    })
  })

  it('does not take a touch that stops scrolling for a tap', () => {
    const detector = new TouchDetector()
    detector.saveScroll({ timeStamp: 1000 } as Event)
    detector.savePointerDown(touch(1050), row1)
    expect(detector.getTapInfo(touch(1100)).isTap).toBe(false)

    // once the scrolling has stopped, a touch taps again
    detector.savePointerDown(touch(1200), row1)
    expect(detector.getTapInfo(touch(1250)).isTap).toBe(true)
  })

  it('keeps the tap in progress when a mouse button is released', () => {
    const detector = new TouchDetector()
    detector.savePointerDown(touch(1000), row1)
    expect(detector.getTapInfo(touch(1020, 10, 10, 'mouse')).isTap).toBe(false)
    expect(detector.getTapInfo(touch(1050)).isTap).toBe(true)
  })

  it('does not take a swipe for a tap', () => {
    const detector = new TouchDetector()
    detector.savePointerDown(touch(1000, 10, 10), row1)
    expect(detector.getTapInfo(touch(1100, 10, 40)).isTap).toBe(false)

    // a finger that moves a little still taps
    detector.savePointerDown(touch(2000, 10, 10), row1)
    expect(detector.getTapInfo(touch(2100, 14, 16)).isTap).toBe(true)
  })

  it('does not take a long press, a mouse or a cancelled touch for a tap', () => {
    const detector = new TouchDetector()
    expect(tap(detector, row1, { down: 1000, up: 1500 }).isTap).toBe(false)

    detector.savePointerDown(touch(2000, 10, 10, 'mouse'), row1)
    expect(detector.getTapInfo(touch(2050, 10, 10, 'mouse')).isTap).toBe(false)

    detector.savePointerDown(touch(3000), row1)
    detector.cancel()
    expect(detector.getTapInfo(touch(3050)).isTap).toBe(false)

    // a pointer up without a pointer down
    expect(detector.getTapInfo(touch(4000)).isTap).toBe(false)
  })

  it('tells the mouse events made for a tap', () => {
    const detector = new TouchDetector()
    // a mouse event soon after page load is not made by a tap
    expect(detector.isGhostMouseEvent(mouse(100))).toBe(false)

    tap(detector, row1, { down: 1000, up: 1050, x: 10, y: 10 })
    expect(detector.isGhostMouseEvent(mouse(1100, 12, 14))).toBe(true)
    // too late
    expect(detector.isGhostMouseEvent(mouse(2100, 10, 10))).toBe(false)
  })

  it('does not take a mouse event far from the tap for one made by it', () => {
    const detector = new TouchDetector()
    tap(detector, row1, { down: 1000, up: 1050, x: 10, y: 10 })
    // a real mouse click elsewhere right after the tap
    expect(detector.isGhostMouseEvent(mouse(1100, 10, 100))).toBe(false)
  })

  it('tells the mouse events made for a double tap', () => {
    const detector = new TouchDetector()
    tap(detector, row1, { down: 1000, up: 1050, x: 10, y: 10 })
    tap(detector, row2, { down: 1200, up: 1250, x: 10, y: 30 })
    // the dblclick comes where the second tap ended
    expect(detector.isGhostMouseEvent(mouse(1300, 10, 30))).toBe(true)
  })
})
