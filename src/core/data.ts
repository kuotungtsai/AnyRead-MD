import MD_PLUGINS, { NEW_PLUGINS } from '@/config/md-plugins'
import PAGE_THEMES from '@/config/page-themes'
import i18n from '@/config/i18n'

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
  /** first-run tutorial has been shown */
  tourDone?: boolean
  /** set once saved plugin lists include NEW_PLUGINS decisions */
  pluginsMigrated?: boolean
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
    ...mergeData,
    ...(mdPlugins && { mdPlugins }),
    mdConfig: getDefaultMdConfig(mergeData.mdConfig),
  }
}
