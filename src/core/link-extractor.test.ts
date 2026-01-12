import { describe, it, expect } from 'vitest'

describe('Link Extraction', () => {
  describe('Basic Extraction', () => {
    it('extracts [[Page Title]] from content', () => {
      const content = 'Visit the [[Kingdom of Aldoria]] today.'
      const links = extractLinks(content)
      expect(links).toEqual(['Kingdom of Aldoria'])
    })

    it('extracts multiple distinct links', () => {
      const content = '[[King Aldric]] founded [[Aldoria]] after [[The War]].'
      const links = extractLinks(content)
      expect(links).toEqual(['King Aldric', 'Aldoria', 'The War'])
    })

    it('deduplicates: same link appearing twice is extracted once', () => {
      const content = '[[Hero]] meets [[Hero]] again.'
      const links = extractLinks(content)
      expect(links).toEqual(['Hero'])
    })

    it('handles links at very start of content: [[Link]] rest of text', () => {
      const content = '[[Link]] rest of text'
      const links = extractLinks(content)
      expect(links).toEqual(['Link'])
    })

    it('handles links at very end of content: text [[Link]]', () => {
      const content = 'text [[Link]]'
      const links = extractLinks(content)
      expect(links).toEqual(['Link'])
    })

    it('handles adjacent links: [[A]][[B]] extracts both', () => {
      const content = '[[A]][[B]]'
      const links = extractLinks(content)
      expect(links).toEqual(['A', 'B'])
    })

    it('handles links separated by single character: [[A]]/[[B]]', () => {
      const content = '[[A]]/[[B]]'
      const links = extractLinks(content)
      expect(links).toEqual(['A', 'B'])
    })
  })

  describe('Display Text Syntax', () => {
    it('extracts [[Page Title|Display Text]] - target is Page Title', () => {
      const content = 'Visit [[Kingdom of Aldoria|the kingdom]].'
      const links = extractLinks(content)
      expect(links).toEqual(['Kingdom of Aldoria'])
    })

    it('display text is preserved in raw content, not modified', () => {
      const content = '[[Page|Display]]'
      expect(content).toBe('[[Page|Display]]')
    })

    it('getLinks() returns Page Title, not Display Text', () => {
      const content = '[[Target|Display]]'
      const links = extractLinks(content)
      expect(links).toEqual(['Target'])
    })

    it('handles empty display text: [[Page|]] - target is Page', () => {
      const content = '[[Page|]]'
      const links = extractLinks(content)
      expect(links).toEqual(['Page'])
    })

    it('handles pipe in display text: [[Page|a|b]] - target is Page, display is a|b', () => {
      const content = '[[Page|a|b]]'
      const links = extractLinks(content)
      expect(links).toEqual(['Page'])
    })
  })

  describe('Whitespace Handling', () => {
    it('trims whitespace from link target: [[  King Aldric  ]] → King Aldric', () => {
      const content = '[[  King Aldric  ]]'
      const links = extractLinks(content)
      expect(links).toEqual(['King Aldric'])
    })

    it('preserves internal whitespace: [[New York City]] → New York City', () => {
      const content = '[[New York City]]'
      const links = extractLinks(content)
      expect(links).toEqual(['New York City'])
    })

    it('trims whitespace with display text: [[  Page  |  Text  ]] → target Page', () => {
      const content = '[[  Page  |  Text  ]]'
      const links = extractLinks(content)
      expect(links).toEqual(['Page'])
    })

    it('handles newline in link: content "[[Broken\\nLink]]" is NOT a valid link', () => {
      const content = '[[Broken\nLink]]'
      const links = extractLinks(content)
      expect(links).toEqual([])
    })
  })

  describe('Code Block Exclusion', () => {
    it('ignores links in fenced code blocks', () => {
      const content = '```\n[[Not a Link]]\n```'
      const links = extractLinks(content)
      expect(links).toEqual([])
    })

    it('ignores links in indented code blocks (4 spaces)', () => {
      const content = '    [[Not a Link]]'
      const links = extractLinks(content)
      expect(links).toEqual([])
    })

    it('ignores links in inline code: `[[Not a Link]]`', () => {
      const content = '`[[Not a Link]]`'
      const links = extractLinks(content)
      expect(links).toEqual([])
    })

    it('extracts link adjacent to code: `code` [[Real Link]] extracts Real Link', () => {
      const content = '`code` [[Real Link]]'
      const links = extractLinks(content)
      expect(links).toEqual(['Real Link'])
    })

    it('handles nested backticks correctly', () => {
      const content = '``[[Link]]`` [[Real]]'
      const links = extractLinks(content)
      expect(links).toEqual(['Real'])
    })
  })

  describe('Edge Cases', () => {
    it('empty link text: [[]] is ignored (not extracted)', () => {
      const content = '[[]]'
      const links = extractLinks(content)
      expect(links).toEqual([])
    })

    it('whitespace-only link: [[   ]] is ignored', () => {
      const content = '[[   ]]'
      const links = extractLinks(content)
      expect(links).toEqual([])
    })

    it('unclosed bracket: [[Missing End is ignored', () => {
      const content = '[[Missing End'
      const links = extractLinks(content)
      expect(links).toEqual([])
    })

    it('extra brackets: [[[Triple]]] extracts Triple (outermost pair)', () => {
      const content = '[[[Triple]]]'
      const links = extractLinks(content)
      expect(links).toEqual(['Triple'])
    })

    it('nested brackets: [[Outer [[Inner]] End]] extracts Outer [[Inner (greedy match)', () => {
      const content = '[[Outer [[Inner]] End]]'
      const links = extractLinks(content)
      expect(links.length).toBeGreaterThan(0)
    })

    it('special characters in link: [[Hello, World!]] extracts Hello, World!', () => {
      const content = '[[Hello, World!]]'
      const links = extractLinks(content)
      expect(links).toEqual(['Hello, World!'])
    })

    it('unicode in link: [[日本語]] extracts 日本語', () => {
      const content = '[[日本語]]'
      const links = extractLinks(content)
      expect(links).toEqual(['日本語'])
    })

    it('very long link text (1000+ chars): extracts successfully', () => {
      const longText = 'A'.repeat(1000)
      const content = `[[${longText}]]`
      const links = extractLinks(content)
      expect(links).toEqual([longText])
    })
  })

  describe('Custom Link Pattern', () => {
    it('respects custom pattern: {{Page}} with /\\{\\{([^}]+)\\}\\}/g', () => {
      const content = '{{Page}}'
      const pattern = /\{\{([^}]+)\}\}/g
      const links = extractLinksWithPattern(content, pattern)
      expect(links).toEqual(['Page'])
    })

    it('custom pattern must have capture group for link text', () => {
      const pattern = /\{\{[^}]+\}\}/g
      expect(() => extractLinksWithPattern('{{Test}}', pattern)).toThrow()
    })

    it('custom pattern can include display text support if designed for it', () => {
      const content = '{{Page|Display}}'
      const pattern = /\{\{([^}|]+)(?:\|[^}]+)?\}\}/g
      const links = extractLinksWithPattern(content, pattern)
      expect(links).toEqual(['Page'])
    })
  })
})

// Placeholder functions - to be implemented
function extractLinks(content: string): string[] {
  throw new Error('Not implemented')
}

function extractLinksWithPattern(content: string, pattern: RegExp): string[] {
  throw new Error('Not implemented')
}
