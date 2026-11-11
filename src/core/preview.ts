/**
 * Linked-file preview: a link to another Markdown file opens in a pane on the
 * right half of the page instead of replacing the document being read.
 *
 * The file is read through the background worker (a local page may read
 * local Markdown files, a web page only files on its own site) and rendered
 * with the same settings as the main document.
 */
import Ele from './ele'
import className from '@/config/class-name'
import { fileName } from './file-types'
import { headingIndex, isSameFile, previewTarget } from './links'
import { safeCall } from './runtime'

export interface PreviewLabels {
  open: string
  close: string
  back: string
  forward: string
  resize: string
  loading: string
  error: string
}

export interface PreviewOptions {
  labels: PreviewLabels
  /** render markdown source into the target with the page's settings */
  render(target: HTMLElement, source: string): void
  /** a click inside the preview (copy button, image zoom...) */
  onClick(target: HTMLElement): void
}

const stripHash = (url: string) => url.split('#')[0]

function readFile(url: string): Promise<string | null> {
  return new Promise(resolve => {
    const sent = safeCall(() =>
      chrome.runtime.sendMessage({ action: 'readFile', data: { url } }, res => {
        void chrome.runtime.lastError
        resolve(res?.ok ? res.text ?? '' : null)
      }),
    )
    if (sent === undefined && !chrome.runtime?.id) resolve(null)
  })
}

/** make relative images and links point at the previewed file's folder */
function rebase(root: HTMLElement, base: string) {
  const fix = (el: Element, attr: string) => {
    const value = el.getAttribute(attr)
    if (!value || value.startsWith('#')) return
    try {
      el.setAttribute(attr, new URL(value, base).href)
    } catch {
      // leave it as written
    }
  }
  root.querySelectorAll('[src]').forEach(el => fix(el, 'src'))
  root.querySelectorAll('a[href]').forEach(el => fix(el, 'href'))
}

/** open an address in a new tab, keeping the page being read */
function openInNewTab(url: string) {
  window.open(url, '_blank', 'noopener')
}

/** links the pane hands to a new tab (not mailto:, javascript: ...) */
const TAB_PROTOCOLS = /^(https?|file):$/

/** the pane's share of the window width, kept on this device */
const WIDTH_KEY = 'previewWidth'
const MIN_WIDTH = 0.2
const MAX_WIDTH = 0.8
const clampWidth = (n: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n))

function setWidth(share: number) {
  document.body.style.setProperty(
    '--preview-width',
    `${(clampWidth(share) * 100).toFixed(2)}vw`,
  )
}

export function createLinkPreview(opts: PreviewOptions) {
  const { labels } = opts
  let current: string = null
  /** files shown in the pane, like a tab's history; `at` is the one shown */
  const visits: { url: string; scroll: number }[] = []
  let at = -1

  const panel = new Ele<HTMLElement>('aside', { className: className.PREVIEW })
  const bar = new Ele<HTMLElement>('div', { className: className.PREVIEW_BAR })
  const button = (act: string, text: string, tip: string) => {
    const btn = new Ele<HTMLButtonElement>('button', { title: tip })
    btn.ele.dataset.act = act
    btn.textContent = text
    return btn
  }
  const backBtn = button('back', '←', labels.back)
  const forwardBtn = button('forward', '→', labels.forward)
  const title = new Ele<HTMLElement>('span', {
    className: className.PREVIEW_TITLE,
  })
  const openBtn = button('open', labels.open, labels.open)
  const closeBtn = button('close', labels.close, 'Esc')
  bar.append([backBtn, forwardBtn, title, openBtn, closeBtn])

  // same structure as the main document so the theme applies
  const content = new Ele<HTMLElement>('article', {
    className: `${className.MD_CONTENT} centered`,
  })
  const body = new Ele<HTMLElement>(
    'div',
    { className: className.MD_BODY },
    content,
  )
  // drag the left edge to change the width; double-click for half and half
  const resizer = new Ele<HTMLElement>('div', {
    className: className.PREVIEW_RESIZER,
    title: labels.resize,
  })
  panel.append([resizer, bar, body])
  panel.hide()

  safeCall(() =>
    chrome.storage.local.get(WIDTH_KEY, data => {
      void chrome.runtime.lastError
      const share = Number(data?.[WIDTH_KEY])
      if (share > 0) setWidth(share)
    }),
  )
  const saveWidth = (share: number) =>
    safeCall(() => chrome.storage.local.set({ [WIDTH_KEY]: clampWidth(share) }))

  let dragShare = 0
  resizer.on('pointerdown', (e: PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    resizer.ele.setPointerCapture(e.pointerId)
    document.body.classList.add(className.PREVIEW_RESIZING)
    dragShare = 0
  })
  resizer.on('pointermove', (e: PointerEvent) => {
    if (!resizer.ele.hasPointerCapture(e.pointerId)) return
    dragShare = clampWidth((window.innerWidth - e.clientX) / window.innerWidth)
    setWidth(dragShare)
  })
  const endDrag = (e: PointerEvent) => {
    if (!resizer.ele.hasPointerCapture(e.pointerId)) return
    resizer.ele.releasePointerCapture(e.pointerId)
    document.body.classList.remove(className.PREVIEW_RESIZING)
    if (dragShare) saveWidth(dragShare)
  }
  resizer.on('pointerup', endDrag)
  resizer.on('pointercancel', endDrag)
  resizer.on('dblclick', () => {
    setWidth(0.5)
    saveWidth(0.5)
  })

  function scrollToAnchor(hash: string) {
    if (!hash) {
      panel.ele.scrollTop = 0
      return
    }
    const heads = Array.from(
      content.ele.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6'),
    )
    const i = headingIndex(
      heads.map(h => h.textContent || ''),
      hash,
    )
    if (i >= 0) heads[i].scrollIntoView({ block: 'start' })
  }

  function updateButtons() {
    backBtn.ele.disabled = at <= 0
    forwardBtn.ele.disabled = at >= visits.length - 1
  }

  /** a new file in the pane: what was ahead of it is dropped, like a tab */
  function visit(url: string) {
    const here = visits[at]
    if (here) here.scroll = panel.ele.scrollTop
    if (here && stripHash(here.url) === stripHash(url)) {
      here.url = url // the same file, another section
    } else {
      visits.splice(at + 1)
      visits.push({ url, scroll: 0 })
      at = visits.length - 1
    }
    return show(url)
  }

  /** step through the pane's history: -1 back, +1 forward */
  function go(step: number) {
    const to = at + step
    if (!current || to < 0 || to >= visits.length) return
    visits[at].scroll = panel.ele.scrollTop
    at = to
    return show(visits[at].url, visits[at].scroll)
  }

  async function show(url: string, scroll?: number) {
    const file = stripHash(url)
    const hash = url.includes('#') ? url.slice(url.indexOf('#') + 1) : ''
    current = url
    updateButtons()
    title.textContent = fileName(file)
    title.ele.title = decodeSafe(file)
    panel.show()
    document.body.classList.add(className.PREVIEWING)

    content.textContent = labels.loading
    const source = await readFile(file)
    if (current !== url) return // another link was clicked meanwhile
    if (source === null) {
      content.textContent = labels.error
      return
    }
    opts.render(content.ele, source)
    rebase(content.ele, file)
    if (scroll !== undefined) panel.ele.scrollTop = scroll
    else scrollToAnchor(hash)
  }

  function close() {
    if (!current) return
    current = null
    visits.length = 0
    at = -1
    panel.hide()
    content.innerHTML = null
    document.body.classList.remove(className.PREVIEWING)
  }

  backBtn.on('click', () => go(-1))
  forwardBtn.on('click', () => go(1))
  openBtn.on('click', () => {
    if (current) openInNewTab(current)
  })
  closeBtn.on('click', close)

  // the mouse's back / forward side buttons step through the pane, not the tab
  panel.on('mouseup', (e: MouseEvent) => {
    if (e.button !== 3 && e.button !== 4) return
    e.preventDefault()
    go(e.button === 3 ? -1 : 1)
  })

  content.on(
    'click',
    (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest?.('a[href]')
      if (link && current && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const href = link.getAttribute('href')
        if (href.startsWith('#')) {
          e.preventDefault()
          scrollToAnchor(href.slice(1))
          return
        }
        const next = previewTarget(href, current)
        if (next) {
          e.preventDefault()
          visit(next)
          return
        }
        if (isSameFile(href, current)) {
          e.preventDefault()
          scrollToAnchor(href.split('#')[1] || '')
          return
        }
        // anything else (a picture, a folder, another site) must not replace
        // the document on the left, so it gets a tab of its own
        const url = (link as HTMLAnchorElement).href
        if (url && TAB_PROTOCOLS.test(new URL(url).protocol)) {
          e.preventDefault()
          openInNewTab(url)
          return
        }
      }
      opts.onClick(target)
    },
    true,
  )

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !current) return
    const tag = (document.activeElement?.tagName || '').toLowerCase()
    if (tag === 'textarea' || tag === 'input') return
    // an open image viewer handles Esc itself
    if (document.querySelector(`.${className.MODAL}`)) return
    close()
  })

  return {
    panel,
    open: (url: string) => visit(url),
    close,
    get isOpen() {
      return !!current
    },
    /** re-render with new settings (theme, plugins) */
    refresh() {
      if (current) show(current, panel.ele.scrollTop)
    },
  }
}

function decodeSafe(s: string) {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}
