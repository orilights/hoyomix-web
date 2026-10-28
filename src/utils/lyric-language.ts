const scriptHints: Record<string, string> = {
  Latin: '存在拉丁字母',
  Cyrillic: '存在西里尔字母',
  Arabic: '存在阿拉伯字母',
  Devanagari: '存在天城文',
  Thai: '存在泰文字母',
  Greek: '存在希腊字母',
  其他文字或拟声词: '存在其他文字或拟声词',
}

export function formatLyricLanguage(language: string): string {
  const script = language.match(/^未确定（(.+)）$/)?.[1]
  return script ? scriptHints[script] ?? `存在${script}文字` : language
}
