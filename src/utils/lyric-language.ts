import type { MessageKey } from '@/i18n'
import { t } from '@/i18n'

const scriptHints: Record<string, MessageKey> = {
  Latin: 'lyric_language.contains_latin_letters',
  Cyrillic: 'lyric_language.contains_cyrillic_letters',
  Arabic: 'lyric_language.contains_arabic_letters',
  Devanagari: 'lyric_language.contains_devanagari_script',
  Thai: 'lyric_language.contains_thai_letters',
  Greek: 'lyric_language.contains_greek_letters',
  其他文字或拟声词: 'lyric_language.contains_other_scripts_or_vocal_sounds',
}

export function formatLyricLanguage(language: string): string {
  const script = language.match(/^未确定（(.+)）$/)?.[1]
  return script ? (scriptHints[script] ? t(scriptHints[script]) : t('lyric_language.contains_script', { p0: script })) : language
}
