/** Reading layout settings (pure, no browser APIs). */

export interface Reading {
  /** px */
  fontSize: number
  /** px, width of the centered text column */
  width: number
  /** unitless, e.g. 1.7 */
  lineHeight: number
}

export const READING_LIMITS = {
  fontSize: [12, 28],
  width: [480, 2400],
  lineHeight: [1.2, 2.4],
} as const

/** clamp saved values; anything invalid becomes 0 (= theme default) */
export function getReading(saved: Partial<Reading> = {}): Reading {
  const pick = (key: keyof Reading) => {
    const n = Number(saved?.[key])
    const [min, max] = READING_LIMITS[key]
    return Number.isFinite(n) && n > 0 ? Math.min(max, Math.max(min, n)) : 0
  }
  return {
    fontSize: pick('fontSize'),
    width: pick('width'),
    lineHeight: pick('lineHeight'),
  }
}
