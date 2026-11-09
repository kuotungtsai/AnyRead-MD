/**
 * Guards for extension API calls made from the page.
 *
 * When the extension is reloaded or updated, scripts already running in open
 * tabs lose their connection ("Extension context invalidated"). Instead of
 * throwing on every call (auto refresh polls twice a second), we stop, and
 * show a one-time notice asking the user to refresh the page.
 */
import i18n from '@/config/i18n'

let stale = false
let language: string
const staleListeners: Array<() => void> = []

export function setRuntimeLanguage(lang: string) {
  language = lang
}

export function onStale(fn: () => void) {
  staleListeners.push(fn)
}

const isInvalidated = (err: unknown) =>
  /context invalidated/i.test(String((err as any)?.message ?? err))

function markStale() {
  if (stale) return
  stale = true
  staleListeners.forEach(fn => {
    try {
      fn()
    } catch {
      /* ignore */
    }
  })
  showNotice()
}

/** true while the page is still connected to the extension */
export function isAlive(): boolean {
  if (stale) return false
  try {
    if (chrome.runtime?.id) return true
  } catch {
    /* accessing chrome.runtime can itself throw once invalidated */
  }
  markStale()
  return false
}

/** run an extension API call; swallow (and handle) invalidation errors */
export function safeCall<T>(fn: () => T): T | undefined {
  if (!isAlive()) return undefined
  try {
    const result = fn()
    if (result && typeof (result as any).catch === 'function') {
      ;(result as any).catch((err: unknown) => {
        if (isInvalidated(err)) markStale()
        else console.error(err)
      })
    }
    return result
  } catch (err) {
    if (isInvalidated(err)) {
      markStale()
      return undefined
    }
    throw err
  }
}

function showNotice() {
  if (document.querySelector('.mdr-stale-notice')) return
  const t = i18n(language)
  const box = document.createElement('div')
  box.className = 'mdr-stale-notice'
  box.setAttribute('role', 'status')
  Object.assign(box.style, {
    position: 'fixed',
    left: '50%',
    bottom: '20px',
    transform: 'translateX(-50%)',
    zIndex: '2147483000',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px 10px 18px',
    borderRadius: '10px',
    background: '#1e2530',
    color: '#fff',
    font: "14px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft JhengHei',sans-serif",
    boxShadow: '0 8px 30px rgba(0,0,0,.25)',
    maxWidth: 'calc(100vw - 32px)',
    boxSizing: 'border-box',
  } as Partial<CSSStyleDeclaration>)

  const text = document.createElement('span')
  text.textContent = t('stale_notice')
  const reload = document.createElement('button')
  reload.textContent = t('stale_reload')
  Object.assign(reload.style, {
    padding: '5px 12px',
    border: 'none',
    borderRadius: '6px',
    background: 'linear-gradient(135deg,#3ddc9a,#00c4d4)',
    color: '#fff',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    flex: 'none',
    cursor: 'pointer',
  } as Partial<CSSStyleDeclaration>)
  reload.addEventListener('click', () => location.reload())
  const close = document.createElement('button')
  close.textContent = '×'
  close.title = 'Close'
  Object.assign(close.style, {
    border: 'none',
    background: 'none',
    color: '#9aa1ad',
    fontSize: '18px',
    cursor: 'pointer',
  } as Partial<CSSStyleDeclaration>)
  close.addEventListener('click', () => box.remove())

  box.append(text, reload, close)
  document.body.appendChild(box)
}
