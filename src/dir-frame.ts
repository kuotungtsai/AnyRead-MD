/**
 * Runs on Chrome's built-in file:// directory listing page.
 *
 * - Inside a hidden iframe created by md-reader (marked `#mdr-dir=<nonce>`):
 *   reads the listing and posts the entries back to the parent viewer page.
 * - As the top-level page: replaces the plain listing with an md-reader
 *   folder view (markdown files first, filter box, breadcrumb).
 *
 * Nothing is sent anywhere else.
 */
import storage from '@/core/storage'
import i18n from '@/config/i18n'
import { isMarkdownName, viewableMatcher } from '@/core/file-types'
import { listDir } from '@/core/files'
import { findMatches, type Match } from '@/core/search'

export interface DirEntry {
  name: string
  url: string
  isDir: boolean
  size?: string
  date?: string
}

const MARK = 'mdr-dir='

function collectEntries(): DirEntry[] {
  const rows = Array.from(document.querySelectorAll('#tbody tr'))
  return rows
    .map(tr => {
      const a = tr.querySelector<HTMLAnchorElement>('a.icon')
      const cells = tr.querySelectorAll('td')
      return a
        ? {
            name: (a.textContent || '').replace(/\/$/, '').trim(),
            url: a.href,
            isDir: a.classList.contains('dir'),
            size: cells[1]?.textContent?.trim() || '',
            date: cells[2]?.textContent?.trim() || '',
          }
        : null
    })
    .filter(e => e && e.name && e.name !== '..')
}

function whenListed(fn: () => void) {
  if (document.querySelector('#tbody')) fn()
  else window.addEventListener('load', fn, { once: true })
}

/* ---------- hidden iframe mode ---------- */
function frameMode() {
  const nonce = location.hash.slice(1 + MARK.length)
  whenListed(() =>
    window.parent.postMessage(
      { type: 'md-reader:dir', nonce, entries: collectEntries() },
      '*',
    ),
  )
}

/* ---------- top-level folder view ---------- */
const STYLE = `
:root{--bg:#fff;--fg:#2d3d50;--sub:#909090;--line:#eaebee;--hover:#f3f6ff;--primary:#607cd2;--side:#f9fafb}
@media (prefers-color-scheme:dark){:root{--bg:#1d1f23;--fg:#d5d9e0;--sub:#8b919c;--line:#2c2f36;--hover:#262a33;--primary:#7b97ec;--side:#23262c}}
body.mdr-dir{margin:0;background:var(--bg);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Microsoft JhengHei',sans-serif}
body.mdr-dir > :not(.mdr-view){display:none !important}
.mdr-view{max-width:960px;margin:0 auto;padding:28px 32px 60px}
.mdr-crumbs{font-size:14px;color:var(--sub);word-break:break-all}
.mdr-crumbs a{color:var(--sub);text-decoration:none}.mdr-crumbs a:hover{color:var(--primary)}
.mdr-view h1{margin:6px 0 18px;font-size:24px}
.mdr-bar{display:flex;gap:12px;align-items:center;margin-bottom:12px;flex-wrap:wrap}
.mdr-bar input[type=search]{flex:1;min-width:200px;padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:var(--side);color:var(--fg);font-size:14px;outline:none}
.mdr-bar input[type=search]:focus{border-color:var(--primary)}
.mdr-bar label{font-size:13px;color:var(--sub);user-select:none;cursor:pointer}
.mdr-list{list-style:none;margin:0;padding:0;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.mdr-list li a{display:flex;align-items:center;gap:10px;padding:9px 14px;color:inherit;text-decoration:none;border-top:1px solid var(--line)}
.mdr-list li:first-child a{border-top:none}
.mdr-list li a:hover,.mdr-list li a.sel{background:var(--hover)}
.mdr-icon{width:1.4em;text-align:center;flex:none}
.mdr-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mdr-md .mdr-name{font-weight:600;color:var(--primary)}
.mdr-code .mdr-name{color:var(--primary)}
.mdr-other{opacity:.6}
.mdr-meta{flex:none;font-size:12px;color:var(--sub);white-space:nowrap}
.mdr-meta.size{width:80px;text-align:right}.mdr-meta.date{width:170px;text-align:right}
.mdr-empty{padding:16px;color:var(--sub);font-size:14px}
.mdr-hint{margin-top:10px;font-size:12px;color:var(--sub)}
.mdr-results{margin-top:14px}
.mdr-results h2{margin:0 0 8px;font-size:14px;color:var(--sub);font-weight:600}
.mdr-hit{display:block;padding:8px 12px;border:1px solid var(--line);border-radius:8px;margin-bottom:6px;color:inherit;text-decoration:none}
.mdr-hit:hover{background:var(--hover)}
.mdr-hit b{color:var(--primary);font-size:13px}
.mdr-hit span{display:block;margin-top:2px;font-size:13px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mdr-hit mark{background:#ffe58a;color:#2d3d50;border-radius:2px}
@media (max-width:640px){.mdr-meta.date{display:none}}
`

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  for (const k in attrs) e.setAttribute(k, attrs[k])
  if (text !== undefined) e.textContent = text
  return e
}

const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

async function topMode() {
  const data: any = await storage.get()
  if (data?.enable === false || data?.dirView === false) return
  const t = i18n(data?.language)
  // markdown + the extra code types from the options page
  const isViewable = viewableMatcher(data?.codeExts)
  const kind = (e: DirEntry) =>
    e.isDir ? 0 : isMarkdownName(e.name) ? 1 : isViewable(e.name) ? 2 : 3

  whenListed(() => {
    const entries = collectEntries()
    let showAll = data?.dirShowAll === true
    let selected = 0

    const style = el('style')
    style.textContent = STYLE
    document.head.appendChild(style)
    document.head.appendChild(
      el('link', {
        rel: 'icon',
        type: 'image/svg+xml',
        href: chrome.runtime.getURL('images/icon.svg'),
      }),
    )
    document.body.classList.add('mdr-dir')

    const view = el('div', { class: 'mdr-view' })

    // breadcrumb: file:///C:/a/b/  ->  C: / a / b
    const crumbs = el('div', { class: 'mdr-crumbs' })
    const parts = location.pathname.split('/').filter(Boolean)
    parts.forEach((part, i) => {
      const href = 'file:///' + parts.slice(0, i + 1).join('/') + '/'
      if (i) crumbs.append(' / ')
      crumbs.append(el('a', { href }, decode(part)))
    })
    const title = el('h1', {}, decode(parts[parts.length - 1] || '/'))

    const bar = el('div', { class: 'mdr-bar' })
    const filter = el('input', {
      type: 'search',
      placeholder: t('dir_filter'),
    })
    const allLabel = el('label')
    const allBox = el('input', { type: 'checkbox' })
    allBox.checked = showAll
    allLabel.append(allBox, ' ' + t('dir_show_all'))
    bar.append(filter, allLabel)

    const inText = el('label')
    const inTextBox = el('input', { type: 'checkbox' })
    inText.append(inTextBox, ' ' + t('dir_search_text'))
    bar.append(inText)
    const results = el('div', { class: 'mdr-results' })

    /* ----- search inside the Markdown files of this folder ----- */
    const MAX_FILES = 300
    const MAX_DEPTH = 3
    let files: Promise<DirEntry[]> = null
    const texts = new Map<string, Promise<string | null>>()
    let searchRun = 0

    /** Markdown files here and in sub-folders (a few levels, capped) */
    function allFiles(): Promise<DirEntry[]> {
      if (files) return files
      files = (async () => {
        const found: DirEntry[] = []
        const walk = async (items: DirEntry[], depth: number) => {
          for (const e of items) {
            if (found.length >= MAX_FILES) return
            if (e.name.startsWith('.')) continue
            if (!e.isDir) {
              if (isMarkdownName(e.name)) found.push(e)
            } else if (depth < MAX_DEPTH && e.name !== 'node_modules') {
              try {
                await walk(await listDir(e.url), depth + 1)
              } catch {
                // unreadable folder: skip it
              }
            }
          }
        }
        await walk(entries, 0)
        return found
      })()
      return files
    }

    function readText(url: string): Promise<string | null> {
      if (!texts.has(url)) {
        texts.set(
          url,
          new Promise(resolve =>
            chrome.runtime.sendMessage(
              { action: 'readFile', data: { url } },
              res => {
                void chrome.runtime.lastError
                resolve(res?.ok ? res.text ?? '' : null)
              },
            ),
          ),
        )
      }
      return texts.get(url)
    }

    const relPath = (url: string) =>
      decode(url.slice(location.href.split('#')[0].length))

    function hitRow(e: DirEntry, m: Match, q: string) {
      const a = el('a', {
        class: 'mdr-hit',
        href: e.url,
        title: relPath(e.url),
      })
      a.append(el('b', {}, `${relPath(e.url)} : ${m.line}`))
      const line = el('span')
      const i = m.text.toLowerCase().indexOf(q.toLowerCase())
      if (i < 0) line.textContent = m.text
      else {
        line.append(
          m.text.slice(0, i),
          el('mark', {}, m.text.slice(i, i + q.length)),
          m.text.slice(i + q.length),
        )
      }
      a.append(line)
      return a
    }

    async function searchText() {
      const run = ++searchRun
      const q = filter.value.trim()
      results.textContent = ''
      if (!inTextBox.checked || q.length < 2) return
      const head = el('h2', {}, t('dir_searching'))
      results.append(head)
      const list = await allFiles()
      let total = 0
      for (const e of list) {
        if (run !== searchRun) return
        const text = await readText(e.url)
        if (run !== searchRun) return
        if (!text) continue
        for (const m of findMatches(text, q, 3)) {
          if (total >= 200) break
          total++
          results.append(hitRow(e, m, q))
        }
      }
      head.textContent = total
        ? `${t('dir_search_found')}: ${total}`
        : t('dir_search_none')
    }
    let searchTimer: number = null
    const queueSearch = () => {
      clearTimeout(searchTimer)
      searchTimer = window.setTimeout(searchText, 250)
    }
    inTextBox.addEventListener('change', queueSearch)

    const list = el('ul', { class: 'mdr-list' })
    const hint = el('div', { class: 'mdr-hint' }, t('dir_hint'))

    function visible(): DirEntry[] {
      const q = filter.value.trim().toLowerCase()
      const items = entries.filter(
        e => (showAll || kind(e) < 3) && !e.name.startsWith('.'),
      )
      return items
        .filter(e => !q || e.name.toLowerCase().includes(q))
        .sort((a, b) => {
          return (
            kind(a) - kind(b) ||
            a.name.localeCompare(b.name, undefined, { numeric: true })
          )
        })
    }

    function render() {
      list.textContent = ''
      const items = visible()
      const parent = parts.length > 1
      if (parent) {
        const li = el('li')
        const a = el('a', { href: '../' })
        a.append(
          el('span', { class: 'mdr-icon' }, '↰'),
          el('span', { class: 'mdr-name' }, t('dir_up')),
        )
        li.append(a)
        list.append(li)
      }
      if (!items.length) {
        list.append(el('li', { class: 'mdr-empty' }, t('files_empty')))
      }
      items.forEach(e => {
        const k = kind(e)
        const li = el('li', {
          class: ['mdr-dir-item', 'mdr-md', 'mdr-code', 'mdr-other'][k],
        })
        const a = el('a', { href: e.url, title: e.name })
        a.append(
          el('span', { class: 'mdr-icon' }, ['📁', '📝', '📃', '📄'][k]),
          el('span', { class: 'mdr-name' }, e.name),
          el('span', { class: 'mdr-meta size' }, e.isDir ? '' : e.size || ''),
          el('span', { class: 'mdr-meta date' }, e.date || ''),
        )
        li.append(a)
        list.append(li)
      })
      selected = Math.min(selected, list.querySelectorAll('a').length - 1)
      highlight()
    }

    function highlight() {
      list.querySelectorAll('a').forEach((a, i) => {
        a.classList.toggle('sel', i === selected)
        if (i === selected) a.scrollIntoView({ block: 'nearest' })
      })
    }

    filter.addEventListener('input', () => {
      selected = 0
      render()
      queueSearch()
    })
    allBox.addEventListener('change', () => {
      showAll = allBox.checked
      storage.set('dirShowAll', showAll)
      render()
    })
    // keyboard: ↑/↓ to move, Enter to open, typing goes to the filter
    document.addEventListener('keydown', e => {
      const links = list.querySelectorAll('a')
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const n = links.length
        selected = (selected + (e.key === 'ArrowDown' ? 1 : n - 1)) % n
        highlight()
      } else if (e.key === 'Enter' && links[selected]) {
        e.preventDefault()
        location.href = (links[selected] as HTMLAnchorElement).href
      } else if (
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        document.activeElement !== filter
      ) {
        filter.focus()
      }
    })

    view.append(crumbs, title, bar, list, hint, results)
    document.body.append(view)
    document.title = decode(parts[parts.length - 1] || '/')
    render()
  })
}

if (window.top !== window) {
  if (location.hash.slice(1).startsWith(MARK)) frameMode()
} else {
  topMode()
}
