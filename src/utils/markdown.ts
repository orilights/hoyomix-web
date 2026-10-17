import MarkdownIt from 'markdown-it'

// 禁止源 HTML，保留解析器默认的危险链接协议检查。
const markdown = new MarkdownIt({ html: false, linkify: true })
const defaultLinkOpen = markdown.renderer.rules.link_open
markdown.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
  const token = tokens[index]
  if (/^https?:\/\//i.test(String(token.attrGet('href') ?? ''))) {
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
  }
  return defaultLinkOpen?.(tokens, index, options, env, renderer) ?? renderer.renderToken(tokens, index, options)
}

export function renderMarkdown(source: string) {
  return markdown.render(source)
}
