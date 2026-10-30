export const isLeftMouseButton = (e: MouseEvent) => e.button === 0

/** Checks if the mouse is hovering over the element's scrollbar, past its content (padding included). */
export const isScrollbarHovered = (e: MouseEvent, el: HTMLElement) => {
  const { left, top } = el.getBoundingClientRect()
  const x = e.clientX - left - el.clientLeft
  const y = e.clientY - top - el.clientTop
  return x >= el.clientWidth || y >= el.clientHeight
}
