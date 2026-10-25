import type { UtilObject } from 'unocss'
import { Buffer } from 'node:buffer'
import { transform } from 'lightningcss'

const rgbCache = new Map<string, string>()
const oklchPattern = /oklch\(([\d.]+%?\s+[\d.]+\s+[\d.-]+)(?:\s*\/\s*(var\(--[\w-]+\)|[\d.]+%?))?\)/g
const themeMixPattern = /^color-mix\(in oklab, var\((--[\w-]+)\) ([\d.]+)%, transparent\)$/

// Convert only the fallback; capable browsers retain the original wide-gamut palette.
export function toRgbChannels(color: string): string {
  const cached = rgbCache.get(color)
  if (cached)
    return cached
  const { code } = transform({
    filename: 'uno-color.css',
    code: Buffer.from(`a{color:${color}}`),
    targets: { chrome: 109 << 16 },
    minify: true,
  })
  const hex = code.toString().match(/color:#([\da-f]{3}|[\da-f]{6})[;}]/i)?.[1]
  if (!hex)
    throw new Error(`Cannot generate Chrome 109 color fallback: ${color}`)
  const fullHex = hex.length === 3 ? [...hex].map(char => char + char).join('') : hex
  const channels = [0, 2, 4].map(index => Number.parseInt(fullHex.slice(index, index + 2), 16)).join(' ')
  rgbCache.set(color, channels)
  return channels
}

export function browserCompat(utility: UtilObject): UtilObject[] | undefined {
  const conditions = new Set<string>()
  const entries = utility.entries.map(([property, value]) => {
    if (typeof value !== 'string')
      return [property, value] as typeof utility.entries[number]
    let fallback = value.replace(oklchPattern, (_, channels: string, alpha: string | undefined) => {
      conditions.add('(color: oklch(0% 0 0))')
      return `rgb(${toRgbChannels(`oklch(${channels.trim()})`)}${alpha ? ` / ${alpha}` : ''})`
    })
    const mix = fallback.match(themeMixPattern)
    if (mix) {
      conditions.add('(color: color-mix(in oklab, black, transparent))')
      fallback = `rgb(var(${mix[1]}-rgb) / ${mix[2]}%)`
    }
    if (property === '--un-gradient-shape' && fallback === 'to right in oklab') {
      conditions.add('(background-image: linear-gradient(to right in oklab, black, white))')
      fallback = 'to right'
    }
    return [property, fallback] as typeof utility.entries[number]
  })
  if (!conditions.size)
    return
  const condition = conditions.size === 1 ? [...conditions][0] : `(${[...conditions].join(' and ')})`
  const parent = (supports: string) => [utility.parent, supports].filter(Boolean).join(' $$ ')
  return [
    { ...utility, parent: parent(`@supports ${condition}`) },
    { ...utility, entries, parent: parent(`@supports not ${condition}`) },
  ]
}
