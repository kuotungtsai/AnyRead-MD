import Ele from './ele'
import className from '@/config/class-name'
import type { DirEntry } from '@/dir-frame'

export const MD_EXT_RE = /\.(md|mdx|mkd|markdown)$/i

/**
 * List a file:// directory by loading Chrome's directory listing page in a
 * hidden iframe. The `dir-frame` content script posts the entries back.
 */
export function listDir(dirUrl: string, timeout = 8000): Promise<DirEntry[]> {
  return new Promise((resolve, reject) => {
    const nonce = Math.random().toString(36).slice(2)
    const frame = document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.style.display = 'none'
    frame.src = `${dirUrl}#mdr-dir=${nonce}`

    const onMessage = (e: MessageEvent) => {
      const data = e.data
      if (!data || data.type !== 'md-reader:dir' || data.nonce !== nonce) return
      if (e.source !== frame.contentWindow) return
      cleanup()
      resolve(Array.isArray(data.entries) ? data.entries : [])
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('Directory listing timed out'))
    }, timeout)
    function cleanup() {
      clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      frame.remove()
    }

    window.addEventListener('message', onMessage)
    document.body.appendChild(frame)
  })
}

const stripUrl = (url: string) => url.split('#')[0].split('?')[0]
const dirOf = (url: string) => stripUrl(url).replace(/[^/]*$/, '')
const parentDirOf = (dir: string) => dir.replace(/[^/]+\/$/, '') || dir
const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}
const dirName = (dir: string) =>
  decode(dir.replace(/\/$/, '').split('/').pop() || dir)

function sortEntries(
  entries: DirEntry[],
  isViewable: (name: string) => boolean,
): DirEntry[] {
  return entries
    .filter(e => e.isDir || isViewable(e.name))
    .filter(e => !e.name.startsWith('.'))
    .sort((a, b) =>
      a.isDir !== b.isDir
        ? a.isDir
          ? -1
          : 1
        : a.name.localeCompare(b.name, undefined, { numeric: true }),
    )
}

export function isFileProtocol(): boolean {
  return location.protocol === 'file:'
}

/**
 * Folder tree panel for the side bar. Root starts at the current file's
 * directory; folders expand lazily.
 */
export function createFileTree(
  labels: {
    up: string
    empty: string
    error: string
  },
  /** files listed in the tree: markdown by default */
  isViewable: (name: string) => boolean = name => MD_EXT_RE.test(name),
) {
  const currentFile = stripUrl(location.href)
  let rootDir = dirOf(currentFile)

  const panel = new Ele<HTMLElement>('div', { className: className.FILES })
  const header = new Ele<HTMLElement>('div', {
    className: className.FILES_HEADER,
  })
  const list = new Ele<HTMLElement>('ul', { className: className.FILES_LIST })
  panel.append([header, list])

  function renderHeader() {
    header.innerHTML = null
    const up = new Ele<HTMLElement>('button', {
      className: className.FILES_UP,
      title: labels.up,
    })
    up.textContent = '↑'
    up.on('click', () => {
      const parent = parentDirOf(rootDir)
      if (parent !== rootDir) {
        rootDir = parent
        load()
      }
    })
    const title = new Ele<HTMLElement>('span', {
      className: className.FILES_TITLE,
      title: decode(rootDir),
    })
    title.textContent = dirName(rootDir)
    header.append([up, title])
  }

  function renderEntries(
    target: Ele<HTMLElement>,
    entries: DirEntry[],
    depth: number,
  ) {
    const items = sortEntries(entries, isViewable)
    if (!items.length) {
      const li = new Ele<HTMLElement>('li', {
        className: className.FILES_EMPTY,
      })
      li.textContent = labels.empty
      li.style.paddingLeft = `${1.2 + depth * 0.9}em`
      target.append(li)
      return
    }
    items.forEach(entry => target.append(renderItem(entry, depth)))
  }

  function renderItem(entry: DirEntry, depth: number): Ele<HTMLElement> {
    const li = new Ele<HTMLElement>('li', {
      className: entry.isDir ? className.FILES_DIR : className.FILES_FILE,
    })
    const link = new Ele<HTMLElement>('a', {
      href: entry.url,
      title: entry.name,
    })
    link.style.paddingLeft = `${1.2 + depth * 0.9}em`
    const icon = new Ele<HTMLElement>('span', {
      className: className.FILES_ICON,
    })
    icon.textContent = entry.isDir ? '▸' : '•'
    const text = new Ele<HTMLElement>('span')
    text.textContent = entry.name
    link.append([icon, text])
    li.append(link)

    if (!entry.isDir) {
      if (stripUrl(entry.url) === currentFile) {
        li.classList.add(className.FILES_ACTIVE)
      }
      return li
    }

    let children: Ele<HTMLElement> = null
    let expanded = false
    link.on('click', async (e: Event) => {
      e.preventDefault()
      expanded = !expanded
      icon.textContent = expanded ? '▾' : '▸'
      if (!expanded) {
        children?.hide()
        return
      }
      if (children) {
        children.show()
        return
      }
      children = new Ele<HTMLElement>('ul')
      li.append(children)
      try {
        renderEntries(children, await listDir(entry.url), depth + 1)
      } catch {
        const err = new Ele<HTMLElement>('li', {
          className: className.FILES_EMPTY,
        })
        err.textContent = labels.error
        children.append(err)
      }
    })
    return li
  }

  async function load() {
    renderHeader()
    list.innerHTML = null
    try {
      renderEntries(list, await listDir(rootDir), 0)
    } catch {
      const err = new Ele<HTMLElement>('li', {
        className: className.FILES_EMPTY,
      })
      err.textContent = labels.error
      list.append(err)
    }
  }

  let loaded = false
  return {
    panel,
    /** load lazily on first show */
    ensureLoaded() {
      if (!loaded) {
        loaded = true
        load()
      }
    },
    reload: load,
  }
}
