/**
 * Export the rendered document.
 *
 * - PDF: the browser's own print dialog ("Save as PDF"); the print styles
 *   hide the side bar and buttons.
 * - HTML: one self-contained file. The page styles are inlined, pictures are
 *   embedded when they can be read, and math fonts are embedded when the
 *   document uses math. Nothing is uploaded: the file is built in the page
 *   and handed to the browser's download.
 */
import className from '@/config/class-name'
import { safeCall } from './runtime'

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

/** ask the background worker to read a picture next to the document */
function readImage(url: string): Promise<string | null> {
  return new Promise(resolve => {
    const sent = safeCall(() =>
      chrome.runtime.sendMessage(
        { action: 'readImage', data: { url } },
        res => {
          void chrome.runtime.lastError
          resolve(typeof res?.dataUrl === 'string' ? res.dataUrl : null)
        },
      ),
    )
    if (sent === undefined && !chrome.runtime?.id) resolve(null)
  })
}

const FONT_URL = /url\(chrome-extension:\/\/[^/]+\/(fonts\/[\w.-]+)\)/g

async function pageCss(withMathFonts: boolean): Promise<string> {
  let css = ''
  try {
    css = await (await fetch(chrome.runtime.getURL('css/content.css'))).text()
  } catch {
    return ''
  }
  if (!withMathFonts) return css.replace(/@font-face\s*\{[^}]*\}/g, '')
  const files = Array.from(
    new Set(Array.from(css.matchAll(FONT_URL), m => m[1])),
  )
  const data: Record<string, string> = {}
  await Promise.all(
    files.map(async file => {
      try {
        const res = await fetch(chrome.runtime.getURL(file))
        data[file] = await toDataUrl(await res.blob())
      } catch {
        // the font is skipped; the browser falls back to another one
      }
    }),
  )
  return css.replace(FONT_URL, (all, file) =>
    data[file] ? `url(${data[file]})` : all,
  )
}

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]),
  )

export async function buildHtml(
  article: HTMLElement,
  title: string,
  extraCss = '',
): Promise<string> {
  const copy = article.cloneNode(true) as HTMLElement
  copy
    .querySelectorAll(`.${className.COPY_BTN}, .${className.HEAD_ANCHOR}`)
    .forEach(el => el.remove())
  copy.removeAttribute('style')

  // pictures: embed what can be read, otherwise keep a full address
  const originals = Array.from(article.querySelectorAll('img'))
  const images = Array.from(copy.querySelectorAll('img'))
  await Promise.all(
    images.map(async (img, i) => {
      const src = originals[i]?.src
      if (!src || src.startsWith('data:')) return
      img.setAttribute('src', (await readImage(src)) || src)
    }),
  )
  // links: relative ones would break once the file is moved
  const links = Array.from(
    article.querySelectorAll<HTMLAnchorElement>('a[href]'),
  )
  Array.from(copy.querySelectorAll('a[href]')).forEach((a, i) => {
    const href = a.getAttribute('href')
    if (href && !href.startsWith('#') && links[i]) {
      a.setAttribute('href', links[i].href)
    }
  })

  const css = await pageCss(!!copy.querySelector('.katex'))
  const html = document.documentElement
  const theme = Object.entries(html.dataset)
    .map(([k, v]) => {
      const name = k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())
      return ` data-${name}="${escapeHtml(v ?? '')}"`
    })
    .join('')
  const reading = article.getAttribute('style')
  return [
    '<!DOCTYPE html>',
    `<html lang="${escapeHtml(html.lang || 'en')}"${theme}>`,
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    `<style>${css}</style>`,
    '<style>body.md-reader .md-reader__body{padding-left:0}</style>',
    extraCss
      ? `<style>${extraCss.replace(/<\/style/gi, '<\\/style')}</style>`
      : '',
    '</head>',
    '<body class="md-reader">',
    `<main class="${className.MD_BODY}">`,
    `<article class="${copy.className}"${
      reading ? ` style="${escapeHtml(reading)}"` : ''
    }>`,
    copy.innerHTML,
    '</article>',
    '</main>',
    '</body>',
    '</html>',
  ].join('\n')
}

export function download(content: string, name: string, type: string) {
  const blob = new Blob([content], { type })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export async function exportHtml(
  article: HTMLElement,
  title: string,
  fileBase: string,
  extraCss = '',
) {
  const html = await buildHtml(article, title, extraCss)
  download(html, `${fileBase}.html`, 'text/html;charset=utf-8')
}

export function printPage() {
  window.print()
}
