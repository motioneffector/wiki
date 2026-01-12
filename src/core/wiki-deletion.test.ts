import { describe, it, expect, beforeEach } from 'vitest'
import type { Wiki } from '../types'

function createWiki(): Wiki {
  throw new Error('Not implemented')
}

describe('Page Deletion', () => {
  let wiki: Wiki

  beforeEach(() => {
    wiki = createWiki()
  })

  describe('wiki.deletePage(id)', () => {
    it('removes page from wiki', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      await wiki.deletePage(page.id)
      expect(wiki.getPage(page.id)).toBeUndefined()
    })

    it('subsequent getPage(id) returns undefined', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      await wiki.deletePage(page.id)
      expect(wiki.getPage(page.id)).toBeUndefined()
    })

    it('subsequent getPageByTitle() returns undefined', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      await wiki.deletePage(page.id)
      expect(wiki.getPageByTitle('Test')).toBeUndefined()
    })

    it('removes page from listPages() results', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      expect(wiki.listPages()).toHaveLength(1)
      await wiki.deletePage(page.id)
      expect(wiki.listPages()).toHaveLength(0)
    })

    it('cleans up: page no longer appears in getOrphans()', async () => {
      const page = await wiki.createPage({ title: 'Orphan' })
      expect(wiki.getOrphans().some(p => p.id === page.id)).toBe(true)
      await wiki.deletePage(page.id)
      expect(wiki.getOrphans().some(p => p.id === page.id)).toBe(false)
    })
  })

  describe('Backlink Updates on Delete', () => {
    it('pages that linked to deleted page now have dead links', async () => {
      await wiki.createPage({ title: 'Target' })
      await wiki.createPage({ title: 'Source', content: '[[Target]]' })
      await wiki.deletePage('target')
      const deadLinks = wiki.getDeadLinks()
      expect(deadLinks.some(dl => dl.target === 'Target')).toBe(true)
    })

    it('getDeadLinks() includes the now-dead links', async () => {
      await wiki.createPage({ title: 'Target' })
      await wiki.createPage({ title: 'Source', content: '[[Target]]' })
      expect(wiki.getDeadLinks()).toHaveLength(0)
      await wiki.deletePage('target')
      expect(wiki.getDeadLinks().length).toBeGreaterThan(0)
    })

    it('backlinks pointing TO deleted page are not automatically removed from source content', async () => {
      await wiki.createPage({ title: 'Target' })
      const source = await wiki.createPage({ title: 'Source', content: '[[Target]]' })
      await wiki.deletePage('target')
      const updatedSource = wiki.getPage(source.id)
      expect(updatedSource?.content).toContain('[[Target]]')
    })
  })

  describe('Options', () => {
    it('{ updateLinks: false } skips backlink processing (faster for bulk delete)', async () => {
      await wiki.createPage({ title: 'Target' })
      await wiki.createPage({ title: 'Source', content: '[[Target]]' })
      await wiki.deletePage('target', { updateLinks: false })
      expect(wiki.getPage('target')).toBeUndefined()
    })

    it('{ updateLinks: true } is the default', async () => {
      await wiki.createPage({ title: 'Target' })
      await wiki.createPage({ title: 'Source', content: '[[Target]]' })
      await wiki.deletePage('target')
      expect(wiki.getDeadLinks().length).toBeGreaterThan(0)
    })
  })

  describe('Errors', () => {
    it('throws Error "Page \'x\' not found" if page doesn\'t exist', async () => {
      await expect(wiki.deletePage('nonexistent')).rejects.toThrow("Page 'nonexistent' not found")
    })
  })
})

describe('Link Queries', () => {
  let wiki: Wiki

  beforeEach(() => {
    wiki = createWiki()
  })

  describe('wiki.getLinks(id) - Outgoing Links', () => {
    it('returns array of link targets (strings) this page links to', async () => {
      const page = await wiki.createPage({
        title: 'Test',
        content: '[[Link1]] and [[Link2]]',
      })
      const links = wiki.getLinks(page.id)
      expect(links).toContain('Link1')
      expect(links).toContain('Link2')
    })

    it('returns the link text as written, not the resolved page title', async () => {
      const page = await wiki.createPage({ title: 'Test', content: '[[Kingdom of Aldoria]]' })
      const links = wiki.getLinks(page.id)
      expect(links).toContain('Kingdom of Aldoria')
    })

    it('returns empty array if page has no links', async () => {
      const page = await wiki.createPage({ title: 'Test', content: 'No links' })
      expect(wiki.getLinks(page.id)).toEqual([])
    })

    it('returns empty array if page doesn\'t exist (not undefined)', () => {
      expect(wiki.getLinks('nonexistent')).toEqual([])
    })

    it('does not include dead links differently - all extracted links returned', async () => {
      const page = await wiki.createPage({
        title: 'Test',
        content: '[[Existing]] and [[NonExistent]]',
      })
      await wiki.createPage({ title: 'Existing' })
      const links = wiki.getLinks(page.id)
      expect(links).toHaveLength(2)
    })

    it('deduplicates: each target appears once even if linked multiple times', async () => {
      const page = await wiki.createPage({
        title: 'Test',
        content: '[[Hero]] meets [[Hero]] again',
      })
      const links = wiki.getLinks(page.id)
      expect(links.filter(l => l === 'Hero')).toHaveLength(1)
    })
  })

  describe('wiki.getBacklinks(id) - Incoming Links', () => {
    it('returns array of page IDs that link to this page', async () => {
      const target = await wiki.createPage({ title: 'Target' })
      await wiki.createPage({ title: 'Source1', content: '[[Target]]' })
      await wiki.createPage({ title: 'Source2', content: '[[Target]]' })
      const backlinks = wiki.getBacklinks(target.id)
      expect(backlinks).toContain('source1')
      expect(backlinks).toContain('source2')
    })

    it('returns empty array if no pages link to this page', async () => {
      const page = await wiki.createPage({ title: 'Orphan' })
      expect(wiki.getBacklinks(page.id)).toEqual([])
    })

    it('returns empty array if page doesn\'t exist (not undefined)', () => {
      expect(wiki.getBacklinks('nonexistent')).toEqual([])
    })

    it('uses ID normalization: getBacklinks(kingdom-of-aldoria) finds [[Kingdom of Aldoria]]', async () => {
      await wiki.createPage({ title: 'Kingdom of Aldoria' })
      await wiki.createPage({ title: 'Source', content: '[[Kingdom of Aldoria]]' })
      const backlinks = wiki.getBacklinks('kingdom-of-aldoria')
      expect(backlinks).toContain('source')
    })
  })

  describe('wiki.getLinkedPages(id) - Resolved Outgoing', () => {
    it('returns array of WikiPage objects for outgoing links', async () => {
      const target1 = await wiki.createPage({ title: 'Target1' })
      const target2 = await wiki.createPage({ title: 'Target2' })
      const source = await wiki.createPage({
        title: 'Source',
        content: '[[Target1]] [[Target2]]',
      })
      const linked = wiki.getLinkedPages(source.id)
      expect(linked).toHaveLength(2)
      expect(linked.some(p => p.id === target1.id)).toBe(true)
      expect(linked.some(p => p.id === target2.id)).toBe(true)
    })

    it('only includes pages that exist (filters out dead links)', async () => {
      await wiki.createPage({ title: 'Existing' })
      const page = await wiki.createPage({
        title: 'Source',
        content: '[[Existing]] [[NonExistent]]',
      })
      const linked = wiki.getLinkedPages(page.id)
      expect(linked).toHaveLength(1)
      expect(linked[0]?.title).toBe('Existing')
    })

    it('returns empty array if all links are dead', async () => {
      const page = await wiki.createPage({ title: 'Test', content: '[[Dead]]' })
      expect(wiki.getLinkedPages(page.id)).toEqual([])
    })

    it('returns empty array if page has no links', async () => {
      const page = await wiki.createPage({ title: 'Test', content: 'No links' })
      expect(wiki.getLinkedPages(page.id)).toEqual([])
    })

    it('returns empty array if page doesn\'t exist', () => {
      expect(wiki.getLinkedPages('nonexistent')).toEqual([])
    })
  })

  describe('wiki.getBacklinkPages(id) - Resolved Incoming', () => {
    it('returns array of WikiPage objects that link to this page', async () => {
      const target = await wiki.createPage({ title: 'Target' })
      const source1 = await wiki.createPage({ title: 'Source1', content: '[[Target]]' })
      const source2 = await wiki.createPage({ title: 'Source2', content: '[[Target]]' })
      const backlinks = wiki.getBacklinkPages(target.id)
      expect(backlinks).toHaveLength(2)
      expect(backlinks.some(p => p.id === source1.id)).toBe(true)
      expect(backlinks.some(p => p.id === source2.id)).toBe(true)
    })

    it('returns empty array if no pages link to this page', async () => {
      const page = await wiki.createPage({ title: 'Orphan' })
      expect(wiki.getBacklinkPages(page.id)).toEqual([])
    })

    it('returns empty array if page doesn\'t exist', () => {
      expect(wiki.getBacklinkPages('nonexistent')).toEqual([])
    })
  })
})

describe('Link Resolution', () => {
  let wiki: Wiki

  beforeEach(() => {
    wiki = createWiki()
  })

  describe('How Links Map to Pages', () => {
    it('[[Kingdom of Aldoria]] matches page with id kingdom-of-aldoria', async () => {
      const page = await wiki.createPage({ title: 'Kingdom of Aldoria' })
      const source = await wiki.createPage({
        title: 'Source',
        content: '[[Kingdom of Aldoria]]',
      })
      const links = wiki.getLinkedPages(source.id)
      expect(links.some(p => p.id === page.id)).toBe(true)
    })

    it('[[kingdom of aldoria]] also matches page with id kingdom-of-aldoria', async () => {
      const page = await wiki.createPage({ title: 'Kingdom of Aldoria' })
      const source = await wiki.createPage({
        title: 'Source',
        content: '[[kingdom of aldoria]]',
      })
      const links = wiki.getLinkedPages(source.id)
      expect(links.some(p => p.id === page.id)).toBe(true)
    })

    it('[[KINGDOM OF ALDORIA]] also matches page with id kingdom-of-aldoria', async () => {
      const page = await wiki.createPage({ title: 'Kingdom of Aldoria' })
      const source = await wiki.createPage({
        title: 'Source',
        content: '[[KINGDOM OF ALDORIA]]',
      })
      const links = wiki.getLinkedPages(source.id)
      expect(links.some(p => p.id === page.id)).toBe(true)
    })

    it('resolution is by ID normalization, not title string matching', async () => {
      await wiki.createPage({ title: 'Kingdom of Aldoria' })
      const resolved = wiki.resolveLink('Kingdom of Aldoria')
      expect(resolved).toBe('kingdom-of-aldoria')
    })
  })

  describe('Dead Link Detection', () => {
    it('link to non-existent page id is a dead link', async () => {
      await wiki.createPage({ title: 'Source', content: '[[NonExistent]]' })
      const deadLinks = wiki.getDeadLinks()
      expect(deadLinks.some(dl => dl.target === 'NonExistent')).toBe(true)
    })

    it('[[Nonexistent Page]] is dead if no page has id nonexistent-page', async () => {
      await wiki.createPage({ title: 'Source', content: '[[Nonexistent Page]]' })
      const deadLinks = wiki.getDeadLinks()
      expect(deadLinks.length).toBeGreaterThan(0)
    })

    it('creating page resolves its dead links (no longer dead)', async () => {
      await wiki.createPage({ title: 'Source', content: '[[Future]]' })
      expect(wiki.getDeadLinks().length).toBeGreaterThan(0)
      await wiki.createPage({ title: 'Future' })
      expect(wiki.getDeadLinks()).toHaveLength(0)
    })

    it('deleting page creates new dead links', async () => {
      await wiki.createPage({ title: 'Target' })
      await wiki.createPage({ title: 'Source', content: '[[Target]]' })
      expect(wiki.getDeadLinks()).toHaveLength(0)
      await wiki.deletePage('target')
      expect(wiki.getDeadLinks().length).toBeGreaterThan(0)
    })
  })

  describe('wiki.resolveLink(linkText)', () => {
    it('returns normalized page ID for valid link text', () => {
      const id = wiki.resolveLink('Kingdom of Aldoria')
      expect(id).toBe('kingdom-of-aldoria')
    })

    it('Kingdom of Aldoria → kingdom-of-aldoria', () => {
      expect(wiki.resolveLink('Kingdom of Aldoria')).toBe('kingdom-of-aldoria')
    })

    it('kingdom of aldoria → kingdom-of-aldoria (case-insensitive)', () => {
      expect(wiki.resolveLink('kingdom of aldoria')).toBe('kingdom-of-aldoria')
    })

    it('  King Aldric   → king-aldric (trims whitespace)', () => {
      expect(wiki.resolveLink('  King Aldric  ')).toBe('king-aldric')
    })

    it('returns the ID regardless of whether page exists (pure normalization)', () => {
      const id = wiki.resolveLink('Nonexistent Page')
      expect(id).toBe('nonexistent-page')
    })

    it('does NOT check if page exists', () => {
      const id = wiki.resolveLink('Does Not Exist')
      expect(typeof id).toBe('string')
    })
  })

  describe('wiki.resolveLinkToPage(linkText)', () => {
    it('returns WikiPage if link resolves to existing page', async () => {
      const page = await wiki.createPage({ title: 'Test Page' })
      const resolved = wiki.resolveLinkToPage('Test Page')
      expect(resolved).toEqual(page)
    })

    it('returns undefined if link resolves to non-existent page', () => {
      const resolved = wiki.resolveLinkToPage('NonExistent')
      expect(resolved).toBeUndefined()
    })

    it('equivalent to wiki.getPage(wiki.resolveLink(linkText))', async () => {
      await wiki.createPage({ title: 'Test' })
      const method1 = wiki.resolveLinkToPage('Test')
      const method2 = wiki.getPage(wiki.resolveLink('Test'))
      expect(method1).toEqual(method2)
    })
  })
})
