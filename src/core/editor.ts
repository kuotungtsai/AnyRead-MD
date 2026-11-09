import debounce from 'lodash.debounce'
import Ele from './ele'
import className from '@/config/class-name'

export interface EditorLabels {
  save: string
  saveAs: string
  close: string
  saved: string
  unsaved: string
  saveFailed: string
  firstSaveHint: string
}

export interface EditorOptions {
  labels: EditorLabels
  getContent(): string
  /** called (debounced) while typing to refresh the preview */
  onInput(content: string): void
  /** called after a successful save */
  onSaved(content: string): void
}

type FileHandle = {
  name: string
  createWritable(): Promise<{
    write(data: Blob | string): Promise<void>
    close(): Promise<void>
  }>
}

const fileNameFromUrl = () => {
  const last = location.pathname.split('/').pop() || 'document.md'
  try {
    return decodeURIComponent(last)
  } catch {
    return last
  }
}

/**
 * Split-view markdown editor. The textarea takes the left half of the page,
 * the rendered preview stays on the right.
 *
 * Saving: browsers do not let extensions write to a file:// path directly, so
 * the first save opens the system "Save as" dialog (File System Access API),
 * pre-filled with the current file name. Pick the same file to overwrite it.
 * The handle is reused for later saves while the tab stays open.
 */
export function createEditor(opts: EditorOptions) {
  const { labels } = opts
  let editing = false
  let dirty = false
  let fileHandle: FileHandle = null
  let originalTitle = document.title

  const panel = new Ele<HTMLElement>('div', { className: className.EDITOR })
  const bar = new Ele<HTMLElement>('div', { className: className.EDITOR_BAR })
  const saveBtn = new Ele<HTMLElement>('button', { title: 'Ctrl+S' })
  saveBtn.textContent = labels.save
  const saveAsBtn = new Ele<HTMLElement>('button', { title: 'Ctrl+Shift+S' })
  saveAsBtn.textContent = labels.saveAs
  const closeBtn = new Ele<HTMLElement>('button', { title: 'Esc' })
  closeBtn.textContent = labels.close
  const status = new Ele<HTMLElement>('span', {
    className: className.EDITOR_STATUS,
  })
  bar.append([saveBtn, saveAsBtn, status, closeBtn])

  const textarea = new Ele<HTMLTextAreaElement>('textarea', {
    className: className.EDITOR_TEXTAREA,
    spellcheck: 'false',
  })
  panel.append([bar, textarea])
  panel.hide()

  const ta = textarea.ele

  const setStatus = (text: string, isError = false) => {
    status.textContent = text
    status.classList.toggle('error', isError)
  }

  const setDirty = (value: boolean) => {
    dirty = value
    document.title = (dirty ? '● ' : '') + originalTitle.replace(/^● /, '')
    setStatus(dirty ? labels.unsaved : '')
  }

  const preview = debounce(() => opts.onInput(ta.value), 200)

  ta.addEventListener('input', () => {
    if (!dirty) setDirty(true)
    preview()
  })

  // keep preview roughly aligned with the editor scroll position
  ta.addEventListener('scroll', () => {
    const max = ta.scrollHeight - ta.clientHeight
    if (max <= 0) return
    const ratio = ta.scrollTop / max
    const docMax = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo({ top: ratio * docMax })
  })

  // Tab inserts spaces instead of moving focus
  ta.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault()
      const { selectionStart: s, selectionEnd: end } = ta
      ta.setRangeText('  ', s, end, 'end')
      ta.dispatchEvent(new Event('input'))
    }
  })

  async function pickHandle(): Promise<FileHandle> {
    const picker = (window as any).showSaveFilePicker
    if (typeof picker !== 'function') return null
    return picker({
      suggestedName: fileNameFromUrl(),
      types: [
        {
          description: 'Markdown',
          accept: { 'text/markdown': ['.md', '.markdown', '.mkd', '.mdx'] },
        },
      ],
    })
  }

  function download(content: string) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = fileNameFromUrl()
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  async function save(forcePick = false) {
    const content = ta.value
    try {
      if (forcePick || !fileHandle) {
        if (!fileHandle) setStatus(labels.firstSaveHint)
        const handle = await pickHandle()
        if (!handle) {
          // File System Access API unavailable: fall back to a download
          download(content)
          setDirty(false)
          opts.onSaved(content)
          return
        }
        fileHandle = handle
      }
      const writable = await fileHandle.createWritable()
      await writable.write(content)
      await writable.close()
      setDirty(false)
      setStatus(`${labels.saved} → ${fileHandle.name}`)
      opts.onSaved(content)
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setStatus(dirty ? labels.unsaved : '')
        return
      }
      console.error(err)
      setStatus(`${labels.saveFailed}: ${err?.message || err}`, true)
    }
  }

  saveBtn.on('click', () => save())
  saveAsBtn.on('click', () => save(true))
  closeBtn.on('click', () => close())

  document.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (!editing) return
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        e.stopPropagation()
        save(e.shiftKey)
      } else if (e.key === 'Escape' && document.activeElement === ta) {
        // leave textarea focus first; a second Esc closes is too surprising
        ta.blur()
      }
    },
    true,
  )

  window.addEventListener('beforeunload', e => {
    if (dirty) {
      e.preventDefault()
      e.returnValue = ''
    }
  })

  function open() {
    if (editing) return
    editing = true
    originalTitle = document.title
    if (!dirty) ta.value = opts.getContent() ?? ''
    panel.show()
    document.body.classList.add(className.EDITING)
    ta.focus()
  }

  function close() {
    if (!editing) return
    editing = false
    panel.hide()
    document.body.classList.remove(className.EDITING)
  }

  return {
    panel,
    open,
    close,
    toggle() {
      editing ? close() : open()
    },
    get isEditing() {
      return editing
    },
    get isDirty() {
      return dirty
    },
    /** keep title prefix in sync after preview re-render */
    syncTitle() {
      originalTitle = document.title.replace(/^● /, '')
      if (dirty) document.title = '● ' + originalTitle
    },
  }
}
