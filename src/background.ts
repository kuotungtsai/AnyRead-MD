import storage from '@/core/storage'
import commands from '@/core/commands'
import { matchPatterns, sanitizeExts } from '@/core/file-types'

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

/* user-chosen code file types (options page): the markdown types are static
   manifest content scripts; these are registered here so they can change
   without a manifest edit. */
const CODE_SCRIPT_ID = 'md-reader-code-files'

let codeScriptsQueue: Promise<void> = Promise.resolve()
function syncCodeScripts(exts?: unknown) {
  // serialize: a quick second change must not race the first registration
  codeScriptsQueue = codeScriptsQueue.then(async () => {
    if (exts === undefined) exts = (await storage.get('codeExts')).codeExts
    const matches = matchPatterns(sanitizeExts(exts))
    try {
      const existing = await chrome.scripting.getRegisteredContentScripts({
        ids: [CODE_SCRIPT_ID],
      })
      if (existing.length) {
        await chrome.scripting.unregisterContentScripts({
          ids: [CODE_SCRIPT_ID],
        })
      }
      if (matches.length) {
        await chrome.scripting.registerContentScripts([
          {
            id: CODE_SCRIPT_ID,
            js: ['js/content.js'],
            css: ['css/content.css'],
            matches,
            runAt: 'document_idle',
            persistAcrossSessions: true,
          },
        ])
      }
    } catch (err) {
      console.error('md-reader: could not register code file types', err)
    }
  })
  return codeScriptsQueue
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.codeExts) {
    syncCodeScripts(changes.codeExts.newValue ?? [])
  }
})
chrome.runtime.onInstalled.addListener(() => syncCodeScripts())
chrome.runtime.onStartup.addListener(() => syncCodeScripts())
