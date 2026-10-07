import type { DomRect } from 'lib/core/types.ts'
import { uberlay } from 'lib/plugins/editable/styles.ts'
import { BORDER_STYLE } from 'lib/core/constants.ts'

const highlightedBoxStyles: Partial<CSSStyleDeclaration> = {
  position: 'absolute',
  borderWidth: '0',
  padding: '0',
  lineHeight: '0',
}

interface HighlightedBoxOptions {
  name: string
  borderWidth: number
  borderStyle?: BORDER_STYLE
  color: string
}

export class HighlightedArea {
  public readonly name: string
  public readonly container: HTMLDivElement

  private readonly borderWidth: number
  private readonly borderStyle: BORDER_STYLE
  private readonly color: string

  public readonly borderTop: HTMLDivElement
  public readonly borderBottom: HTMLDivElement
  public readonly borderLeft: HTMLDivElement
  public readonly borderRight: HTMLDivElement

  constructor(options: HighlightedBoxOptions) {
    this.borderWidth = options.borderWidth
    this.borderStyle = options.borderStyle || BORDER_STYLE.SOLID
    this.color = options.color

    this.container = document.createElement('div')
    Object.assign(this.container.style, uberlay)

    this.name = options.name
    this.container.setAttribute('data-name', options.name)

    this.borderTop = this.createBorder('top')
    this.borderBottom = this.createBorder('bottom')
    this.borderLeft = this.createBorder('left')
    this.borderRight = this.createBorder('right')

    this.container.appendChild(this.borderTop)
    this.container.appendChild(this.borderBottom)
    this.container.appendChild(this.borderLeft)
    this.container.appendChild(this.borderRight)

    this.hide()
  }

  public hide() {
    this.container.style.display = 'none'
  }

  public show(domRect: DomRect) {
    this.container.style.display = 'block'

    this.container.style.top = `${domRect.top}px`
    this.container.style.left = `${domRect.left}px`

    this.borderTop.style.width = `${domRect.width}px`
    this.borderBottom.style.width = `${domRect.width}px`
    this.borderBottom.style.top = `${(domRect.height || 0) - 1}px`
    this.borderLeft.style.height = `${domRect.height}px`
    this.borderRight.style.left = `${(domRect.width || 0) - 1}px`
    this.borderRight.style.height = `${(domRect.height || 0) + 2}px`
  }

  public destroy() {
    this.borderTop.remove()
    this.borderBottom.remove()
    this.borderLeft.remove()
    this.borderRight.remove()
    this.container.remove()
  }

  private createBorder(type: 'top' | 'right' | 'bottom' | 'left') {
    const elBorder = document.createElement('div')
    Object.assign(elBorder.style, highlightedBoxStyles)
    elBorder.setAttribute('data-name', 'elBorder')
    elBorder.style.borderColor = this.color
    elBorder.style.borderStyle = this.borderStyle

    switch (type) {
      case 'top':
        elBorder.style.top = '-1px'
        elBorder.style.left = '-1px'
        elBorder.style.borderTopWidth = `${this.borderWidth}px`
        break
      case 'right':
        elBorder.style.top = '-1px'
        elBorder.style.borderRightWidth = `${this.borderWidth}px`
        break
      case 'bottom':
        elBorder.style.left = '-1px'
        elBorder.style.borderBottomWidth = `${this.borderWidth}px`
        break
      case 'left':
        elBorder.style.left = '-1px'
        elBorder.style.borderLeftWidth = `${this.borderWidth}px`
        break
    }

    return elBorder
  }
}
