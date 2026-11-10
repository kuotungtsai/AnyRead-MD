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
import { anchorOf, isSameFile, previewTarget } from './links'
import { safeCall } from './runtime'

export interface PreviewLabels {
  open: string
  close: string
  back: string
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

export function createLinkPreview(opts: PreviewOptions) {
  const { labels } = opts
  let current: string = null
  const history: string[] = []

  const panel = new Ele<HTMLElement>('aside', { className: className.PREVIEW })
  const bar = new Ele<HTMLElement>('div', { className: className.PREVIEW_BAR })
  const backBtn = new Ele<HTMLElement>('button', { title: labels.back })
  backBtn.textContent = '←'
  const title = new Ele<HTMLElement>('span', {
    className: className.PREVIEW_TITLE,
  })
  const openBtn = new Ele<HTMLElement>('button')
  openBtn.textContent = labels.open
  const closeBtn = new Ele<HTMLElement>('button', { title: 'Esc' })
  closeBtn.textContent = labels.close
  bar.append([backBtn, title, openBtn, closeBtn])

  // same structure as the main document so the theme applies
  const content = new Ele<HTMLElement>('article', {
    className: `${className.MD_CONTENT} centered`,
  })
  const body = new Ele<HTMLElement>(
    'div',
    { className: className.MD_BODY },
    content,
  )
  panel.append([bar, body])
  panel.hide()

  function scrollToAnchor(hash: string) {
    if (!hash) {
      panel.ele.scrollTop = 0
      return
    }
    let wanted = hash
    try {
      wanted = decodeURIComponent(hash)
    } catch {
      // keep as is
    }
    const heads = Array.from(
      content.ele.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6'),
    )
    const target = heads.find(h => {
      const name = anchorOf(h.textContent || '')
      return name === hash || decodeURIComponent(name) === wanted
    })
    if (target) target.scrollIntoView({ block: 'start' })
  }

  async function show(url: string, remember = true) {
    const file = stripHash(url)
    const hash = url.includes('#') ? url.slice(url.indexOf('#') + 1) : ''
    if (remember && current && stripHash(current) !== file) {
      history.push(current)
    }
    current = url
    backBtn.toggle(history.length > 0)
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
    scrollToAnchor(hash)
  }

  function close() {
    if (!current) return
    current = null
    history.length = 0
    panel.hide()
    content.innerHTML = null
    document.body.classList.remove(className.PREVIEWING)
  }

  backBtn.on('click', () => {
    const prev = history.pop()
    if (prev) show(prev, false)
  })
  openBtn.on('click', () => {
    if (current) location.href = current
  })
  closeBtn.on('click', close)

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
          show(next)
          return
        }
        if (isSameFile(href, current)) {
          e.preventDefault()
          scrollToAnchor(href.split('#')[1] || '')
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
    open: (url: string) => show(url),
    close,
    get isOpen() {
      return !!current
    },
    /** re-render with new settings (theme, plugins) */
    refresh() {
      if (current) show(current, false)
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
