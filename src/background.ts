import storage from '@/core/storage'
import commands from '@/core/commands'
import {
  MD_EXTS,
  isMarkdownName,
  matchPatterns,
  patternsFor,
  sanitizeExts,
  webBases,
} from '@/core/file-types'
import { sameSite } from '@/core/links'

chrome.runtime.onMessage.addListener(({ action, data }, sender, callback) => {
  messageHandler(action, data, sender, callback)
  return true
})

async function messageHandler(
  action: string,
  data: any,
  sender: chrome.runtime.MessageSender,
  callback?: (response?: any) => void,
) {
  switch (action) {
    case 'storage':
      await storage.set({ [data.key]: data.value })
      updatePage(data.key, data.value)
      callback?.(data)
      break
    case 'fetch':
      fetchData(sender.url).then(callback)
      break
    case 'readFile':
      readFile(data?.url, sender.url).then(callback)
      break
    case 'readImage':
      readImage(data?.url, sender.url).then(callback)
      break
    case 'syncScripts':
      syncScripts().then(() => callback?.(true))
      break
  }
}

async function fetchData(url?: string) {
  if (!url) {
    const error = new Error('Fetch error: URL is undefined.')
    console.error(error)
    return error.message
  }

  return fetch(url)
    .then(res => res.text())
    .catch(err => {
      console.error(err)
      return err.message
    })
}

/**
 * Read another Markdown file for a page that is already being shown:
 * the linked-file preview and the folder search. A local page may read local
 * Markdown files; a web page may read Markdown files on its own site.
 */
async function readFile(
  url?: string,
  from?: string,
): Promise<{ ok: boolean; text?: string }> {
  try {
    const target = new URL(url)
    const origin = new URL(from)
    if (!sameSite(target, origin) || !isMarkdownName(target.pathname))
      return { ok: false }
    const res = await fetch(target.href.split('#')[0])
    if (!res.ok && res.status !== 0) return { ok: false }
    return { ok: true, text: await res.text() }
  } catch {
    return { ok: false }
  }
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|avif|ico)$/i
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

/** Read a picture used by the page being exported, as a data: URL. */
async function readImage(
  url?: string,
  from?: string,
): Promise<{ dataUrl?: string }> {
  try {
    const target = new URL(url)
    const origin = new URL(from)
    if (!sameSite(target, origin) || !IMAGE_EXT.test(target.pathname)) return {}
    const res = await fetch(target.href.split('#')[0])
    if (!res.ok && res.status !== 0) return {}
    const blob = await res.blob()
    if (blob.size > MAX_IMAGE_BYTES) return {}
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
    return { dataUrl }
  } catch {
    return {}
  }
}

// Chrome extension shortcuts
chrome.commands.onCommand.addListener(action => {
  commands[action]?.(messageHandler)
})

const actionMap = {
  enable: 'reload',
  refresh: 'toggleRefresh',
  centered: 'toggleCentered',
  mdPlugins: 'updateMdPlugins',
  pageTheme: 'updatePageTheme',
  hiddenSide: 'toggleSide',
}

function updatePage(key: keyof typeof actionMap, value?: any) {
  const action = actionMap[key]
  action &&
    chrome.tabs.query({ currentWindow: true, active: true }, tabs => {
      // The active tab is often not a markdown page (extensions page, a normal
      // website...), so nothing listens there. Settings are already saved;
      // read lastError so Chrome doesn't report "Receiving end does not exist".
      tabs.length &&
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action, data: { key, value } },
          () => void chrome.runtime.lastError,
        )
    })
}

// first install: open the welcome page (file access setup + quick start)
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html#welcome') })
  }
})

/* Content scripts that depend on what the user chose:
   - code file types from the options page (local files, plus allowed sites)
   - Markdown files on web sites the user allowed
   Markdown files on file:// are static manifest content scripts. */
const CODE_SCRIPT_ID = 'md-reader-code-files'
const WEB_SCRIPT_ID = 'anyread-web-markdown'

async function grantedWebBases(): Promise<string[]> {
  const all = await new Promise<chrome.permissions.Permissions>(resolve =>
    chrome.permissions.getAll(resolve),
  )
  return webBases(all.origins)
}

async function replaceScript(id: string, matches: string[]) {
  const existing = await chrome.scripting.getRegisteredContentScripts({
    ids: [id],
  })
  if (existing.length) {
    await chrome.scripting.unregisterContentScripts({ ids: [id] })
  }
  if (matches.length) {
    await chrome.scripting.registerContentScripts([
      {
        id,
        js: ['js/content.js'],
        css: ['css/content.css'],
        matches,
        runAt: 'document_idle',
        persistAcrossSessions: true,
      },
    ])
  }
}

let scriptsQueue: Promise<void> = Promise.resolve()
function syncScripts(exts?: unknown) {
  // serialize: a quick second change must not race the first registration
  scriptsQueue = scriptsQueue.then(async () => {
    try {
      if (exts === undefined) exts = (await storage.get('codeExts')).codeExts
      const bases = await grantedWebBases()
      await replaceScript(WEB_SCRIPT_ID, patternsFor(MD_EXTS, bases))
      await replaceScript(
        CODE_SCRIPT_ID,
        matchPatterns(sanitizeExts(exts), bases),
      )
    } catch (err) {
      console.error('AnyRead MD: could not register content scripts', err)
    }
  })
  return scriptsQueue
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.codeExts) {
    syncScripts(changes.codeExts.newValue ?? [])
  }
})
chrome.runtime.onInstalled.addListener(() => syncScripts())
chrome.runtime.onStartup.addListener(() => syncScripts())
// the user allowed or removed a web site (options page, popup, or Chrome's own UI)
chrome.permissions.onAdded.addListener(() => syncScripts())
chrome.permissions.onRemoved.addListener(() => syncScripts())
