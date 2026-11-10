/** Reading layout and the user's own CSS (options page). */
import type { Reading } from './reading-config'

const CUSTOM_CSS_ID = 'anyread-md-custom-css'
export const LINE_HEIGHT_CLASS = 'md-reader__reading-line-height'

/** 0 means "keep the theme's value" */
export function applyReading(article: HTMLElement, reading: Reading) {
  const { fontSize = 0, width = 0, lineHeight = 0 } = reading || ({} as Reading)
  article.style.fontSize = fontSize ? `${fontSize}px` : ''
  if (lineHeight) {
    article.style.setProperty('--reading-line-height', String(lineHeight))
  } else {
    article.style.removeProperty('--reading-line-height')
  }
  article.classList.toggle(LINE_HEIGHT_CLASS, !!lineHeight)
  if (width) article.style.setProperty('--reading-width', `${width}px`)
  else article.style.removeProperty('--reading-width')
}

/** added after the extension's own styles so it can override them */
export function applyCustomCss(css = '') {
  let style = document.getElementById(CUSTOM_CSS_ID)
  if (!css.trim()) {
    style?.remove()
    return
  }
  if (!style) {
    style = document.createElement('style')
    style.id = CUSTOM_CSS_ID
    document.head.appendChild(style)
  }
  style.textContent = css
}
