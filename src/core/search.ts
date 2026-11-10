/** Plain text search used by the folder view ("search inside files"). */

export interface Match {
  /** 1-based line number */
  line: number
  /** the line, trimmed and shortened around the match */
  text: string
}

const CONTEXT = 60

/** case-insensitive matches of `query`, at most `limit` per text */
export function findMatches(text: string, query: string, limit = 5): Match[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const matches: Match[] = []
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length && matches.length < limit; i++) {
    const at = lines[i].toLowerCase().indexOf(q)
    if (at < 0) continue
    const start = Math.max(0, at - CONTEXT)
    const end = Math.min(lines[i].length, at + q.length + CONTEXT)
    matches.push({
      line: i + 1,
      text:
        (start > 0 ? '…' : '') +
        lines[i].slice(start, end).trim() +
        (end < lines[i].length ? '…' : ''),
    })
  }
  return matches
}
