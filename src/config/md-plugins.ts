export default [
  'Emoji',
  'Sup',
  'Sub',
  'TOC',
  'Ins',
  'Mark',
  'Katex',
  'Mermaid',
  'Abbr',
  'Deflist',
  'Footnote',
  'TaskLists',
  'Alert',
  'MultimdTable',
  'Frontmatter',
] as string[]

/** Plugins added by this build: switched on for users with older saved settings */
export const NEW_PLUGINS = ['MultimdTable', 'Frontmatter']

/** Plugins / core features that accept an options object in the settings page */
export const CONFIGURABLE = [
  'Linkify',
  'Emoji',
  'TOC',
  'Katex',
  'Mermaid',
  'TaskLists',
  'MultimdTable',
  'Frontmatter',
]
