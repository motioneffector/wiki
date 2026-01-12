import { describe, it, expect, beforeEach } from 'vitest'
import type { Wiki } from '../types'

function createWiki(): Wiki {
  throw new Error('Not implemented')
}

describe('Edge Cases & Error Handling', () => {
  let wiki: Wiki

  beforeEach(() => {
    wiki = createWiki()
  })

  describe('Self-Referential Links', () => {
    it('page can link to itself: [[Self]] in page Self', async () => {
      const page = await wiki.createPage({ title: 'Self', content: '[[Self]]' })
      const links = wiki.getLinks(page.id)
      expect(links).toContain('Self')
    })

    it('self-link appears in getLinks()', async () => {
      const page = await wiki.createPage({ title: 'Self', content: '[[Self]]' })
      expect(wiki.getLinks(page.id)).toContain('Self')
    })

    it('self-link appears in getBacklinks()', async () => {
      const page = await wiki.createPage({ title: 'Self', content: '[[Self]]' })
      expect(wiki.getBacklinks(page.id)).toContain(page.id)
    })

    it('page with only self-link is NOT an orphan', async () => {
      const page = await wiki.createPage({ title: 'Self', content: '[[Self]]' })
      expect(wiki.getOrphans().some(p => p.id === page.id)).toBe(false)
    })
  })

  describe('Circular References', () => {
    it('A links to B, B links to A: both have backlinks', async () => {
      await wiki.createPage({ title: 'A', content: '[[B]]' })
      await wiki.createPage({ title: 'B', content: '[[A]]' })
      expect(wiki.getBacklinks('a')).toContain('b')
      expect(wiki.getBacklinks('b')).toContain('a')
    })

    it('A → B → C → A: circular chain works correctly', async () => {
      await wiki.createPage({ title: 'A', content: '[[B]]' })
      await wiki.createPage({ title: 'B', content: '[[C]]' })
      await wiki.createPage({ title: 'C', content: '[[A]]' })
      expect(wiki.getBacklinks('a')).toContain('c')
      expect(wiki.getBacklinks('b')).toContain('a')
      expect(wiki.getBacklinks('c')).toContain('b')
    })

    it('getConnectedPages handles cycles without infinite loop', async () => {
      await wiki.createPage({ title: 'A', content: '[[B]]' })
      await wiki.createPage({ title: 'B', content: '[[A]]' })
      const connected = wiki.getConnectedPages('a', 100)
      expect(connected).toHaveLength(2)
    })

    it('getGraph correctly represents cycles', async () => {
      await wiki.createPage({ title: 'A', content: '[[B]]' })
      await wiki.createPage({ title: 'B', content: '[[A]]' })
      const graph = wiki.getGraph()
      expect(graph['a']).toContain('b')
      expect(graph['b']).toContain('a')
    })
  })

  describe('Large Content', () => {
    it('handles content with 100+ links', async () => {
      const links = Array.from({ length: 100 }, (_, i) => `[[Link${i}]]`).join(' ')
      const page = await wiki.createPage({ title: 'Many Links', content: links })
      expect(wiki.getLinks(page.id).length).toBe(100)
    })

    it('handles content with 1MB+ text', async () => {
      const largeContent = 'A'.repeat(1024 * 1024)
      const page = await wiki.createPage({ title: 'Large', content: largeContent })
      expect(page.content.length).toBeGreaterThan(1024 * 1024)
    })

    it('handles wiki with 10,000+ pages (performance test)', async () => {
      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(wiki.createPage({ title: `Page${i}` }))
      }
      await Promise.all(promises)
      expect(wiki.listPages()).toHaveLength(100)
    }, 10000)
  })

  describe('Empty/Minimal States', () => {
    it('empty content is valid', async () => {
      const page = await wiki.createPage({ title: 'Empty', content: '' })
      expect(page.content).toBe('')
    })

    it('content with only whitespace is valid', async () => {
      const page = await wiki.createPage({ title: 'Whitespace', content: '   \n\n  ' })
      expect(page.content).toBeTruthy()
    })

    it('content with only links: [[A]] [[B]] [[C]]', async () => {
      const page = await wiki.createPage({ title: 'Links Only', content: '[[A]] [[B]] [[C]]' })
      expect(wiki.getLinks(page.id)).toHaveLength(3)
    })

    it('single page wiki works for all operations', async () => {
      const page = await wiki.createPage({ title: 'Only Page' })
      expect(wiki.listPages()).toHaveLength(1)
      expect(wiki.getPage(page.id)).toBeDefined()
      expect(wiki.getOrphans()).toHaveLength(1)
      expect(wiki.getGraph()).toHaveProperty(page.id)
    })
  })

  describe('Unicode & International', () => {
    it('unicode in titles: 日本語タイトル', async () => {
      const page = await wiki.createPage({ title: '日本語タイトル' })
      expect(page.title).toBe('日本語タイトル')
    })

    it('unicode in content with links: Visit [[東京]]', async () => {
      const page = await wiki.createPage({ title: 'Test', content: 'Visit [[東京]]' })
      const links = wiki.getLinks(page.id)
      expect(links).toContain('東京')
    })

    it('RTL text in content', async () => {
      const page = await wiki.createPage({ title: 'Test', content: 'مرحبا بك' })
      expect(page.content).toContain('مرحبا')
    })

    it('emoji in titles (stripped from ID, preserved in title)', async () => {
      const page = await wiki.createPage({ title: 'Hello 🌍' })
      expect(page.title).toContain('🌍')
      expect(page.id).not.toContain('🌍')
    })

    it('mixed scripts in single page', async () => {
      const page = await wiki.createPage({
        title: 'Mixed',
        content: 'English 日本語 العربية Русский',
      })
      expect(page.content).toBeTruthy()
    })
  })

  describe('Special Characters', () => {
    it('HTML entities in content are preserved: &amp;', async () => {
      const page = await wiki.createPage({ title: 'Test', content: 'A &amp; B' })
      expect(page.content).toContain('&amp;')
    })

    it('markdown syntax in content is preserved', async () => {
      const page = await wiki.createPage({ title: 'Test', content: '# Header\n**bold**' })
      expect(page.content).toContain('# Header')
      expect(page.content).toContain('**bold**')
    })

    it('backslashes in content: path\\to\\file', async () => {
      const page = await wiki.createPage({ title: 'Test', content: 'path\\to\\file' })
      expect(page.content).toContain('\\')
    })

    it('quotes in titles: The "Great" War', async () => {
      const page = await wiki.createPage({ title: 'The "Great" War' })
      expect(page.title).toContain('"')
    })

    it('apostrophes: Aldric\'s Kingdom', async () => {
      const page = await wiki.createPage({ title: "Aldric's Kingdom" })
      expect(page.title).toContain("'")
    })
  })

  describe('Malformed Input', () => {
    it('unclosed wiki link: [[Missing end - no link extracted, no error', async () => {
      const page = await wiki.createPage({ title: 'Test', content: '[[Missing end' })
      expect(wiki.getLinks(page.id)).toEqual([])
    })

    it('only opening brackets: [[ - no link extracted, no error', async () => {
      const page = await wiki.createPage({ title: 'Test', content: '[[' })
      expect(wiki.getLinks(page.id)).toEqual([])
    })

    it('mismatched brackets: [[Text] - no link extracted, no error', async () => {
      const page = await wiki.createPage({ title: 'Test', content: '[[Text]' })
      expect(wiki.getLinks(page.id)).toEqual([])
    })

    it('empty brackets: [[]] - no link extracted, no error', async () => {
      const page = await wiki.createPage({ title: 'Test', content: '[[]]' })
      expect(wiki.getLinks(page.id)).toEqual([])
    })

    it('null bytes in content: handled gracefully', async () => {
      const page = await wiki.createPage({ title: 'Test', content: 'test\x00null' })
      expect(page.content).toBeTruthy()
    })
  })

  describe('Async Behavior', () => {
    it('createPage returns Promise<WikiPage>', async () => {
      const promise = wiki.createPage({ title: 'Test' })
      expect(promise).toBeInstanceOf(Promise)
      const page = await promise
      expect(page).toHaveProperty('id')
    })

    it('getPage returns WikiPage | undefined (sync)', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      const result = wiki.getPage(page.id)
      expect(result).not.toBeInstanceOf(Promise)
    })

    it('listPages returns WikiPage[] (sync, from cache)', async () => {
      await wiki.createPage({ title: 'Test' })
      const result = wiki.listPages()
      expect(Array.isArray(result)).toBe(true)
      expect(result).not.toBeInstanceOf(Promise)
    })

    it('search returns WikiPage[] (sync)', async () => {
      await wiki.createPage({ title: 'Test' })
      const result = wiki.search('Test')
      expect(Array.isArray(result)).toBe(true)
    })

    it('getLinks returns string[] (sync)', async () => {
      const page = await wiki.createPage({ title: 'Test', content: '[[Link]]' })
      const result = wiki.getLinks(page.id)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('Concurrency Considerations', () => {
    it('rapid sequential creates work correctly', async () => {
      await wiki.createPage({ title: 'Page1' })
      await wiki.createPage({ title: 'Page2' })
      await wiki.createPage({ title: 'Page3' })
      expect(wiki.listPages()).toHaveLength(3)
    })

    it('rapid sequential updates to same page work correctly', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      await wiki.updatePage(page.id, { content: 'Update 1' })
      await wiki.updatePage(page.id, { content: 'Update 2' })
      await wiki.updatePage(page.id, { content: 'Update 3' })
      const final = wiki.getPage(page.id)
      expect(final?.content).toBe('Update 3')
    })

    it('create then immediate update works', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      const updated = await wiki.updatePage(page.id, { content: 'Updated' })
      expect(updated.content).toBe('Updated')
    })

    it('create then immediate delete works', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      await wiki.deletePage(page.id)
      expect(wiki.getPage(page.id)).toBeUndefined()
    })

    it('concurrent creates of different pages work', async () => {
      const promises = [
        wiki.createPage({ title: 'Page1' }),
        wiki.createPage({ title: 'Page2' }),
        wiki.createPage({ title: 'Page3' }),
      ]
      await Promise.all(promises)
      expect(wiki.listPages()).toHaveLength(3)
    })
  })
})
