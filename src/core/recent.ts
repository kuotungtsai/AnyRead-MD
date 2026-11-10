/**
 * Recently opened files, shown in the popup. The list lives in
 * chrome.storage.local on this device and is never sent anywhere. It can be
 * cleared from the popup and turned off in the options page.
 */
import { fileName } from './file-types'

export interface RecentFile {
  url: string
  /** first heading of the document, or the file name */
  title: string
  /** readable location, shown as a tooltip */
  path: string
  time: number
}

export const MAX_RECENT = 12

const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

/** only trust well-formed entries, whatever is in storage */
export function getRecent(data: any): RecentFile[] {
  const list = Array.isArray(data?.recentFiles) ? data.recentFiles : []
  return list.filter(
    (r: any) =>
      r &&
      typeof r.url === 'string' &&
      /^(file|https?):\/\//.test(r.url) &&
      typeof r.title === 'string',
  )
}

/** put the page at the top of the list (newest first, no duplicates) */
export function addRecent(
  list: RecentFile[],
  url: string,
  title: string,
): RecentFile[] {
  const clean = url.split('#')[0]
  const entry: RecentFile = {
    url: clean,
    title: (title || '').trim().slice(0, 120) || fileName(clean),
    path: decode(clean.replace(/^file:\/\/\//, '')),
    time: Date.now(),
  }
  return [entry, ...list.filter(r => r.url !== clean)].slice(0, MAX_RECENT)
}

export async function rememberPage(url: string, title: string) {
  const data = await chrome.storage.local.get(['recentFiles', 'recentOn'])
  if (data.recentOn === false) return
  await chrome.storage.local.set({
    recentFiles: addRecent(getRecent(data), url, title),
  })
}

export const clearRecent = () => chrome.storage.local.set({ recentFiles: [] })
