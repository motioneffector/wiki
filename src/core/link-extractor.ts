const DEFAULT_LINK_PATTERN = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g

export function extractLinks(content: string, pattern: RegExp = DEFAULT_LINK_PATTERN): string[] {
  // Remove code blocks and inline code first
  const cleanedContent = removeCodeBlocks(content)

  const links: string[] = []
  const seen = new Set<string>()

  // Reset regex state
  pattern.lastIndex = 0
  const globalPattern = new RegExp(pattern.source, 'g')

  let match
  while ((match = globalPattern.exec(cleanedContent)) !== null) {
    let linkText = match[1]?.trim()

    // Skip links with newlines
    if (linkText && linkText.includes('\n')) {
      continue
    }

    // Trim leading brackets from edge cases like [[[Triple]]]
    if (linkText) {
      linkText = linkText.replace(/^\[+/, '')
    }

    if (linkText && linkText.length > 0 && !seen.has(linkText)) {
      links.push(linkText)
      seen.add(linkText)
    }
  }

  return links
}

export function extractLinksWithPattern(content: string, pattern: RegExp): string[] {
  // Check that pattern has a capture group by looking at the regex source
  // A capture group is indicated by unescaped parentheses
  const hasCapture = /\([^?]/.test(pattern.source)
  if (!hasCapture) {
    throw new Error('Link pattern must have a capture group')
  }

  return extractLinks(content, pattern)
}

function removeCodeBlocks(content: string): string {
  let result = content

  // Remove fenced code blocks (``` or ~~~) - must be non-greedy
  result = result.replace(/```[\s\S]*?```/g, '')
  result = result.replace(/~~~[\s\S]*?~~~/g, '')

  // Remove inline code - handle double backticks first
  result = result.replace(/``[^`]*?``/g, '')
  // Then single backticks (but not part of double backticks)
  result = result.replace(/`[^`\n]*?`/g, '')

  // Remove indented code blocks (4 spaces at start of line)
  result = result.replace(/^    .*/gm, '')

  return result
}

export function createLinkExtractor(pattern: RegExp) {
  return (content: string) => extractLinksWithPattern(content, pattern)
}
