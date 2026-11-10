/**
 * Web site access is optional: after install the extension only works on
 * local files. The user turns on web pages from the options page (all sites)
 * or from the popup (the site of the current tab). The background worker
 * registers the content scripts when the granted list changes.
 */
import { webBases } from './file-types'

export const ALL_SITES = '*://*/*'

const contains = (origins: string[]) =>
  new Promise<boolean>(resolve =>
    chrome.permissions.contains({ origins }, ok => resolve(!!ok)),
  )

export const hasAllSites = () => contains([ALL_SITES])
export const hasSite = (pattern: string) => contains([pattern])

/** must be called from a click handler (Chrome shows its own prompt) */
export const requestSites = (origins: string[]) =>
  new Promise<boolean>(resolve =>
    chrome.permissions.request({ origins }, ok => {
      void chrome.runtime.lastError
      resolve(!!ok)
    }),
  )

export const removeSites = (origins: string[]) =>
  new Promise<boolean>(resolve =>
    chrome.permissions.remove({ origins }, ok => {
      void chrome.runtime.lastError
      resolve(!!ok)
    }),
  )

/** sites the user allowed one by one, e.g. ['https://example.com/*'] */
export const listSites = () =>
  new Promise<string[]>(resolve =>
    chrome.permissions.getAll(all =>
      resolve(
        webBases(all.origins)
          .map(base => base + '*')
          .filter(o => o !== ALL_SITES),
      ),
    ),
  )
