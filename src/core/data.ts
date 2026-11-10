import MD_PLUGINS, { NEW_PLUGINS } from '@/config/md-plugins'
import PAGE_THEMES from '@/config/page-themes'
import i18n from '@/config/i18n'
import { getReading, type Reading } from './reading-config'

export { getReading, READING_LIMITS, type Reading } from './reading-config'

/** markdown-it core options the user may override */
export interface MdCoreConfig {
  html: boolean
  breaks: boolean
  linkify: boolean
  typographer: boolean
}

/** Advanced markdown config: core options + per-plugin option objects */
export interface MdConfig {
  core: MdCoreConfig
  plugins: { [plugin: string]: Record<string, any> }
}

export type SideTab = 'toc' | 'files'

export interface Data {
  enable?: boolean
  refresh?: boolean
  language?: string
  centered?: boolean
  mdPlugins?: typeof MD_PLUGINS
  pageTheme?: (typeof PAGE_THEMES)[0]
  hiddenSide?: boolean
  mdConfig?: MdConfig
  sideTab?: SideTab
  /** replace Chrome's plain file:// folder listing with md-reader's view */
  dirView?: boolean
  /** extra file extensions opened as a highlighted code view, e.g. ['c', 'h'] */
  codeExts?: string[]
  /** folder view: "show all files" checkbox, remembered across reloads */
  dirShowAll?: boolean
  /** first-run tutorial has been shown */
  tourDone?: boolean
  /** set once saved plugin lists include NEW_PLUGINS decisions */
  pluginsMigrated?: boolean
  /** reading layout; 0 keeps the theme's own value */
  reading?: Reading
  /** the user's own CSS, added after the theme */
  customCss?: string
  /** open links to other Markdown files in a preview pane on the right */
  linkPreview?: boolean
  /** keep the list of recently opened files for the popup */
  recentOn?: boolean
  recentFiles?: Array<{
    url: string
    title: string
    path: string
    time: number
  }>
}

export function getDefaultMdConfig(merge: Partial<MdConfig> = {}): MdConfig {
  return {
    core: {
      html: true,
      breaks: false,
      linkify: true,
      typographer: true,
      ...(merge.core || {}),
    },
    plugins: { ...(merge.plugins || {}) },
  }
}

export function getDefaultData(mergeData: Data = {}): Data {
  const saved = mergeData.mdPlugins
  const mdPlugins =
    saved && !mergeData.pluginsMigrated
      ? [...saved, ...NEW_PLUGINS.filter(p => !saved.includes(p))]
      : saved
  return {
    enable: true,
    refresh: false,
    centered: true,
    hiddenSide: false,
    language: i18n().locale,
    mdPlugins: [...MD_PLUGINS],
    pageTheme: PAGE_THEMES[0],
    sideTab: 'toc',
    dirView: true,
    codeExts: [],
    tourDone: false,
    customCss: '',
    linkPreview: true,
    recentOn: true,
    ...mergeData,
    reading: getReading(mergeData.reading),
    ...(mdPlugins && { mdPlugins }),
    mdConfig: getDefaultMdConfig(mergeData.mdConfig),
  }
}
