import type { Cell, Coordinate } from 'lib/core/types.ts'
import { getDistance } from 'lib/core/utils/coordinates.ts'

// max tap duration threshold (in ms)
const MAX_TAP_DURATION = 300
// max distance the finger may move during a tap (in px)
const MAX_TAP_MOVEMENT = 10
// max delay between taps for a double-tap (in ms)
const MAX_DOUBLE_TAP_DELAY = 300
// max distance allowed between double-tap inputs (in px)
const MAX_DOUBLE_TAP_DISTANCE = 30
// time window to suppress ghost mouse events after a tap (in ms)
const MAX_GHOST_MOUSE_DELAY = 1000
// distance threshold to associate ghost mouse events with a touch event (in px)
const MAX_GHOST_MOUSE_DISTANCE = 25
// time after the last scroll during which a touch only stops the scrolling (in ms)
const MAX_SCROLL_STOP_DELAY = 100

/** Checks if the touch duration exceeds the maximum tap duration threshold */
const isLongPress = (tapStartTime: number, tapEndTime: number) =>
  tapEndTime - tapStartTime > MAX_TAP_DURATION

/** Checks if the finger moved too far during the touch to register a tap, as in a swipe */
const isSwipe = (tapStart: Coordinate, tapEnd: Coordinate) =>
  getDistance(tapStart, tapEnd) > MAX_TAP_MOVEMENT

/** Checks if the second tap landed close enough to the first tap to register a double-tap */
const isWithinDoubleTapDistance = (firstTap: Coordinate, secondTap: Coordinate) =>
  getDistance(firstTap, secondTap) <= MAX_DOUBLE_TAP_DISTANCE

/** Checks if the mouse event coordinates are close enough to the touch-end position to be considered emulated */
const isWithinGhostMouseDistance = (tapEnd: Coordinate, mouseEvent: Coordinate) =>
  getDistance(tapEnd, mouseEvent) <= MAX_GHOST_MOUSE_DISTANCE

export interface TapInfo {
  /** Indicates whether the pointer event marks the end of a finger tap (excludes mouse, pen, long-press, or swipe inputs) */
  isTap: boolean
  isDoubleTap: boolean
  /** The cell targeted by the tap. For the second tap of a double-tap, this returns the first tap's cell. */
  targetCell: Cell | undefined
}

/**
 * Detects finger taps and double-taps on cells.
 *
 * Since a finger rarely lands on the exact same pixel twice, a rapid second tap near the first
 * is registered as a double-tap on the original cell (even if it visually lands on an adjacent cell).
 * Farther taps are treated as distinct single taps.
 */
export class TouchDetector {
  // The tap currently in progress. Its start time defaults to -Infinity when idle.
  #tapStartTime = -Infinity
  #tapStartCoordinate: Coordinate = { x: 0, y: 0 }
  #tapCell: Cell | undefined

  // The historical tap metadata used to evaluate double-taps and subsequent ghost mouse events.
  #prevTapEndTime = -Infinity
  #prevTapStartCoordinate: Coordinate | undefined
  #prevTapEndCoordinate: Coordinate | undefined
  #prevTapCell: Cell | undefined

  // The time of the last scroll, used to tell a touch that stops momentum scrolling from a tap.
  #lastScrollTime = -Infinity

  /** Saves the time of a scroll event, so a touch that stops the scrolling isn't registered as a tap */
  saveScroll(e: Event) {
    this.#lastScrollTime = e.timeStamp
  }

  /** Saves the initial touch-start event timestamp, coordinates, and targeted cell */
  savePointerDown(e: PointerEvent, cell: Cell | undefined) {
    // Ignores additional fingers, so they don't overwrite the tap in progress
    if (e.pointerType === 'touch' && e.isPrimary) {
      // A touch while the content is still scrolling only stops the scrolling
      if (e.timeStamp - this.#lastScrollTime < MAX_SCROLL_STOP_DELAY) {
        this.#tapStartTime = -Infinity
        return
      }
      this.#tapStartTime = e.timeStamp
      this.#tapStartCoordinate = { x: e.clientX, y: e.clientY }
      this.#tapCell = cell
    }
  }

  /** Forgets the tap in progress (i.e., when the browser takes over touch handling to scroll) */
  cancel() {
    this.#tapStartTime = -Infinity
  }

  #getTimeSinceLastTap(timestamp: number) {
    return timestamp - this.#prevTapEndTime
  }

  getTapInfo(e: PointerEvent): TapInfo {
    // Leaves the tap in progress to its own finger when an additional finger, a mouse or a pen lifts
    if (e.pointerType !== 'touch' || !e.isPrimary) {
      return { isTap: false, isDoubleTap: false, targetCell: undefined }
    }
    const tapStartTime = this.#tapStartTime
    const tapEndTime = e.timeStamp
    const tapEndCoordinate: Coordinate = { x: e.clientX, y: e.clientY }
    const timeSinceLastTap = this.#getTimeSinceLastTap(tapStartTime)
    this.#tapStartTime = -Infinity

    // Handles pointer up instances without a tap in progress (where start time remains -Infinity)
    if (
      isLongPress(tapStartTime, tapEndTime) ||
      isSwipe(this.#tapStartCoordinate, tapEndCoordinate)
    ) {
      return { isTap: false, isDoubleTap: false, targetCell: undefined }
    }

    // Measures the dead-space interval from the end of the first tap to the start of the second
    const isDoubleTap =
      timeSinceLastTap <= MAX_DOUBLE_TAP_DELAY &&
      !!this.#prevTapStartCoordinate &&
      isWithinDoubleTapDistance(this.#prevTapStartCoordinate, this.#tapStartCoordinate)
    const targetCell = isDoubleTap ? this.#prevTapCell : this.#tapCell

    // Finalize current tap metrics and cache them as historical data
    this.#prevTapEndTime = tapEndTime
    this.#prevTapEndCoordinate = tapEndCoordinate
    if (isDoubleTap) {
      // Clear coordinate history so a rapid third tap starts a brand-new gesture sequence
      this.#prevTapStartCoordinate = undefined
    } else {
      this.#prevTapStartCoordinate = this.#tapStartCoordinate
      this.#prevTapCell = this.#tapCell
    }
    return { isTap: true, isDoubleTap, targetCell }
  }

  /**
   * Checks whether an incoming mouse event was fired as an emulated "ghost" event following a touch sequence.
   *
   * Mobile viewports fire fallback mouse events (mousedown, mouseup, click) after touch interactions finish.
   * Since pointer events handle this gesture flow natively, consumers can call this method to selectively ignore
   * duplicated mouse events triggered at the tap coordinates within the ghost-delay threshold.
   */
  isGhostMouseEvent(e: MouseEvent) {
    const timeSinceLastTap = this.#getTimeSinceLastTap(e.timeStamp)
    const coordinate: Coordinate = { x: e.clientX, y: e.clientY }
    return (
      timeSinceLastTap < MAX_GHOST_MOUSE_DELAY &&
      !!this.#prevTapEndCoordinate &&
      isWithinGhostMouseDistance(this.#prevTapEndCoordinate, coordinate)
    )
  }
}
