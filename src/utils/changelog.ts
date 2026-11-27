import { parseMarkdown } from './markdown'

interface ChangelogGroup {
  title: string
  content: string
}

interface ChangelogBlock {
  intro: string
  groups: ChangelogGroup[]
}

interface ChangelogEntry extends ChangelogBlock {
  date: string
  version?: string
}

const releaseTitle = /^(?:(v\S+)[ \t]+·[ \t]+)?(\d{4}-\d{2}-\d{2})$/
const planTitle = '开发计划'

export function parseChangelog(input: string) {
  const source = input.replace(/\r\n?/g, '\n').trim()
  const lines = source.split('\n')
  const slice = (start: number, end: number) => lines.slice(start, end).join('\n').trim()
  const tokens = parseMarkdown(source)
  const headings = tokens.flatMap((token, index) => {
    if (token.type !== 'heading_open' || token.level !== 0 || !token.map || !['h2', 'h3'].includes(token.tag))
      return []
    return [{ tag: token.tag, title: tokens[index + 1].content, start: token.map[0], end: token.map[1] }]
  })
  const sections = headings.filter(heading => heading.tag === 'h2')
  const intro = [slice(0, sections[0]?.start ?? lines.length)]
  let plan: ChangelogBlock | undefined
  const entries: ChangelogEntry[] = []

  for (const [index, section] of sections.entries()) {
    const end = sections[index + 1]?.start ?? lines.length
    const release = section.title.match(releaseTitle)
    if (section.title !== planTitle && !release) {
      intro.push(slice(section.start, end))
      continue
    }

    const groups = headings.filter(heading => heading.tag === 'h3' && heading.start >= section.end && heading.start < end)
    const block = {
      intro: slice(section.end, groups[0]?.start ?? end),
      groups: groups.map((group, index) => ({ title: group.title, content: slice(group.end, groups[index + 1]?.start ?? end) })),
    }

    if (release)
      entries.push({ ...block, version: release[1], date: release[2] })
    else
      plan = block
  }

  entries.sort((a, b) => b.date.localeCompare(a.date))
  const versioned = entries.filter(entry => entry.version)
  const recent = (versioned.length ? versioned : entries).slice(0, 3)
  const history = entries.filter(entry => !recent.includes(entry))
  return { intro: plan || entries.length ? intro.filter(Boolean).join('\n\n') : '', plan, recent, history }
}
