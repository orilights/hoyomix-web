import { t } from '@/i18n'

export interface SpectrumSettings {
  colorMode: 'custom' | 'cover'
  color: string
  count: number
  opacity: number
  gap: number
  height: number
}

export const spectrumControls = [
  { key: 'count', get label() {
    return t('spectrum.bar_count')
  }, min: 16, max: 128, step: 1, get unit() {
    return t('spectrum.bars')
  } },
  { key: 'opacity', get label() {
    return t('spectrum.opacity')
  }, min: 0, max: 100, step: 1, unit: '%' },
  { key: 'gap', get label() {
    return t('spectrum.bar_spacing')
  }, min: 0, max: 12, step: 0.5, unit: 'px' },
  { key: 'height', get label() {
    return t('spectrum.spectrum_height')
  }, min: 24, max: 200, step: 4, unit: 'px' },
] as const

export function createSpectrumSettings(): SpectrumSettings {
  return { colorMode: 'custom', color: '#ffffff', count: 64, opacity: 20, gap: 2, height: 64 }
}

export function normalizeSpectrumSettings(value: Partial<SpectrumSettings>): SpectrumSettings {
  const settings = createSpectrumSettings()
  if (value.colorMode === 'cover')
    settings.colorMode = 'cover'
  if (typeof value.color === 'string' && /^#[\da-f]{6}$/i.test(value.color))
    settings.color = value.color
  for (const control of spectrumControls) {
    const number = value[control.key]
    if (typeof number === 'number' && Number.isFinite(number))
      settings[control.key] = Math.min(control.max, Math.max(control.min, Math.round(number / control.step) * control.step))
  }
  return settings
}

export function getSpectrumLayout(width: number, settings: SpectrumSettings) {
  const gap = Math.min(settings.gap, width / settings.count * 0.8)
  const barWidth = (width - gap * (settings.count - 1)) / settings.count
  return { gap, barWidth }
}
