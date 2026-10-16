import type { Page } from '@playwright/test'

/**
 * dispatches a copy event on the grid and returns what the grid put on the clipboard
 **/
export const copyToClipboard = (page: Page) =>
  page.evaluate(() => {
    const clipboardData = new DataTransfer()
    const event = new ClipboardEvent('copy', { bubbles: true, cancelable: true, clipboardData })
    window.fastSheets.state.options.elContainer.dispatchEvent(event)
    return { text: clipboardData.getData('text/plain'), defaultPrevented: event.defaultPrevented }
  })
