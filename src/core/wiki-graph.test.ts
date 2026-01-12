import { describe, it, expect, beforeEach } from 'vitest'
import type { Wiki } from '../types'
import { createWiki } from './wiki'

describe('Dead Links & Orphans', () => {
  let wiki: Wiki

  beforeEach(() => {
    wiki = createWiki()
  })

  describe('wiki.getDeadLinks()', () => {
    it('returns array of { source: string, target: string } objects', async () => {
      await wiki.createPage({ title: 'Source', content: '[[Dead]]' })
      const deadLinks = wiki.getDeadLinks()
      expect(deadLinks[0]).toHaveProperty('source')
      expect(deadLinks[0]).toHaveProperty('target')
    })

    it('source is the page ID containing the dead link', async () => {
      await wiki.createPage({ title: 'Source', content: '[[Dead]]' })
      const deadLinks = wiki.getDeadLinks()
      expect(deadLinks[0]?.source).toBe('source')
    })

    it('target is the link text (not normalized)', async () => {
      await wiki.createPage({ title: 'Source', content: '[[Dead Link]]' })
      const deadLinks = wiki.getDeadLinks()
      expect(deadLinks[0]?.target).toBe('Dead Link')
    })

    it('returns empty array if no dead links exist', async () => {
      await wiki.createPage({ title: 'Target' })
      await wiki.createPage({ title: 'Source', content: '[[Target]]' })
      expect(wiki.getDeadLinks()).toEqual([])
    })

    it('same dead link from multiple pages appears multiple times (once per source)', async () => {
      await wiki.createPage({ title: 'Source1', content: '[[Dead]]' })
      await wiki.createPage({ title: 'Source2', content: '[[Dead]]' })
      const deadLinks = wiki.getDeadLinks()
      expect(deadLinks.filter(dl => dl.target === 'Dead')).toHaveLength(2)
    })
  })

  describe('wiki.getDeadLinksForPage(id)', () => {
    it('returns array of target strings (dead link texts) for specific page', async () => {
      const page = await wiki.createPage({ title: 'Test', content: '[[Dead1]] [[Dead2]]' })
      const deadLinks = wiki.getDeadLinksForPage(page.id)
      expect(deadLinks).toContain('Dead1')
      expect(deadLinks).toContain('Dead2')
    })

    it('returns empty array if page has no dead links', async () => {
      await wiki.createPage({ title: 'Target' })
      const page = await wiki.createPage({ title: 'Source', content: '[[Target]]' })
      expect(wiki.getDeadLinksForPage(page.id)).toEqual([])
    })

    it('returns empty array if page doesn\'t exist', () => {
      expect(wiki.getDeadLinksForPage('nonexistent')).toEqual([])
    })
  })

  describe('wiki.getOrphans()', () => {
    it('returns array of WikiPage objects with no incoming links', async () => {
      const orphan = await wiki.createPage({ title: 'Orphan' })
      await wiki.createPage({ title: 'Connected', content: '' })
      await wiki.createPage({ title: 'Source', content: '[[Connected]]' })
      const orphans = wiki.getOrphans()
      expect(orphans.some(p => p.id === orphan.id)).toBe(true)
      expect(orphans.some(p => p.id === 'connected')).toBe(false)
    })

    it('a page with only dead links TO it is still an orphan (dead links don\'t count)', async () => {
      const target = await wiki.createPage({ title: 'Target' })
      await wiki.createPage({ title: 'Source', content: '[[Target]]' })
      await wiki.deletePage('target')
      await wiki.createPage({ title: 'Target' })
      const orphans = wiki.getOrphans()
      expect(orphans.some(p => p.id === 'target')).toBe(true)
    })

    it('a page that links to others but has no incoming links is an orphan', async () => {
      await wiki.createPage({ title: 'Target' })
      const orphan = await wiki.createPage({ title: 'Orphan', content: '[[Target]]' })
      const orphans = wiki.getOrphans()
      expect(orphans.some(p => p.id === orphan.id)).toBe(true)
    })

    it('returns empty array if all pages have at least one backlink', async () => {
      await wiki.createPage({ title: 'Page1', content: '[[Page2]]' })
      await wiki.createPage({ title: 'Page2', content: '[[Page1]]' })
      expect(wiki.getOrphans()).toEqual([])
    })

    it('newly created page with no backlinks is an orphan', async () => {
      const page = await wiki.createPage({ title: 'New' })
      expect(wiki.getOrphans().some(p => p.id === page.id)).toBe(true)
    })
  })

  describe('Orphan Edge Cases', () => {
    it('page linking to itself is NOT an orphan (self-link counts)', async () => {
      const page = await wiki.createPage({ title: 'Self', content: '[[Self]]' })
      expect(wiki.getOrphans().some(p => p.id === page.id)).toBe(false)
    })

    it('single page wiki: that page is an orphan', async () => {
      const page = await wiki.createPage({ title: 'Only' })
      expect(wiki.getOrphans()).toHaveLength(1)
      expect(wiki.getOrphans()[0]?.id).toBe(page.id)
    })

    it('two pages linking to each other: neither is an orphan', async () => {
      await wiki.createPage({ title: 'Page1', content: '[[Page2]]' })
      await wiki.createPage({ title: 'Page2', content: '[[Page1]]' })
      expect(wiki.getOrphans()).toEqual([])
    })
  })
})

describe('Link Graph', () => {
  let wiki: Wiki

  beforeEach(() => {
    wiki = createWiki()
  })

  describe('wiki.getGraph()', () => {
    it('returns adjacency list as Record<string, string[]>', async () => {
      await wiki.createPage({ title: 'Test', content: '[[Link]]' })
      const graph = wiki.getGraph()
      expect(typeof graph).toBe('object')
      expect(Array.isArray(graph['test'])).toBe(true)
    })

    it('keys are page IDs', async () => {
      await wiki.createPage({ title: 'Page One' })
      const graph = wiki.getGraph()
      expect(graph).toHaveProperty('page-one')
    })

    it('values are arrays of linked page IDs (normalized from link text)', async () => {
      await wiki.createPage({ title: 'Target' })
      await wiki.createPage({ title: 'Source', content: '[[Target]]' })
      const graph = wiki.getGraph()
      expect(graph['source']).toContain('target')
    })

    it('includes pages with no outgoing links (empty array value)', async () => {
      await wiki.createPage({ title: 'Isolated' })
      const graph = wiki.getGraph()
      expect(graph['isolated']).toEqual([])
    })

    it('dead links are included (links to non-existent IDs)', async () => {
      await wiki.createPage({ title: 'Source', content: '[[Dead]]' })
      const graph = wiki.getGraph()
      expect(graph['source']).toContain('dead')
    })

    it('returns empty object if wiki has no pages', () => {
      const graph = wiki.getGraph()
      expect(graph).toEqual({})
    })
  })

  describe('wiki.getConnectedPages(id, depth?)', () => {
    it('returns array of WikiPage objects within N links of given page', async () => {
      const page1 = await wiki.createPage({ title: 'Page1', content: '[[Page2]]' })
      const page2 = await wiki.createPage({ title: 'Page2', content: '' })
      const connected = wiki.getConnectedPages(page1.id)
      expect(connected.some(p => p.id === page2.id)).toBe(true)
    })

    it('default depth is 1 (direct links and backlinks only)', async () => {
      await wiki.createPage({ title: 'Page1', content: '[[Page2]]' })
      await wiki.createPage({ title: 'Page2', content: '[[Page3]]' })
      await wiki.createPage({ title: 'Page3' })
      const connected = wiki.getConnectedPages('page1')
      expect(connected.some(p => p.id === 'page2')).toBe(true)
      expect(connected.some(p => p.id === 'page3')).toBe(false)
    })

    it('depth 0 returns only the page itself', async () => {
      const page = await wiki.createPage({ title: 'Test', content: '[[Other]]' })
      const connected = wiki.getConnectedPages(page.id, 0)
      expect(connected).toHaveLength(1)
      expect(connected[0]?.id).toBe(page.id)
    })

    it('depth 2 includes pages linked from directly linked pages', async () => {
      await wiki.createPage({ title: 'Page1', content: '[[Page2]]' })
      await wiki.createPage({ title: 'Page2', content: '[[Page3]]' })
      await wiki.createPage({ title: 'Page3' })
      const connected = wiki.getConnectedPages('page1', 2)
      expect(connected.some(p => p.id === 'page3')).toBe(true)
    })

    it('includes both outgoing and incoming connections', async () => {
      await wiki.createPage({ title: 'Center', content: '[[Out]]' })
      await wiki.createPage({ title: 'Out' })
      await wiki.createPage({ title: 'In', content: '[[Center]]' })
      const connected = wiki.getConnectedPages('center')
      expect(connected.some(p => p.id === 'out')).toBe(true)
      expect(connected.some(p => p.id === 'in')).toBe(true)
    })

    it('handles cycles without infinite loop', async () => {
      await wiki.createPage({ title: 'A', content: '[[B]]' })
      await wiki.createPage({ title: 'B', content: '[[A]]' })
      const connected = wiki.getConnectedPages('a', 10)
      expect(connected).toHaveLength(2)
    })

    it('does not include duplicates (page appears once even if reachable multiple ways)', async () => {
      await wiki.createPage({ title: 'A', content: '[[C]]' })
      await wiki.createPage({ title: 'B', content: '[[C]]' })
      await wiki.createPage({ title: 'C', content: '[[A]] [[B]]' })
      const connected = wiki.getConnectedPages('a', 2)
      const ids = connected.map(p => p.id)
      const uniqueIds = [...new Set(ids)]
      expect(ids.length).toBe(uniqueIds.length)
    })

    it('returns empty array if page doesn\'t exist', () => {
      expect(wiki.getConnectedPages('nonexistent')).toEqual([])
    })

    it('returns [self] if page exists but has no connections (depth >= 0)', async () => {
      const page = await wiki.createPage({ title: 'Isolated' })

      // Test depth 0
      const connected0 = wiki.getConnectedPages(page.id, 0)
      expect(connected0).toHaveLength(1)
      expect(connected0[0]?.id).toBe(page.id)

      // Test depth 1 - should still return only self for isolated page
      const connected1 = wiki.getConnectedPages(page.id, 1)
      expect(connected1).toHaveLength(1)
      expect(connected1[0]?.id).toBe(page.id)

      // Test depth 2 - should still return only self for isolated page
      const connected2 = wiki.getConnectedPages(page.id, 2)
      expect(connected2).toHaveLength(1)
      expect(connected2[0]?.id).toBe(page.id)
    })
  })

  describe('Cycle Handling', () => {
    it('A → B → A: getConnectedPages(a, 10) returns [A, B] (no infinite loop)', async () => {
      await wiki.createPage({ title: 'A', content: '[[B]]' })
      await wiki.createPage({ title: 'B', content: '[[A]]' })
      const connected = wiki.getConnectedPages('a', 10)
      expect(connected).toHaveLength(2)
    })

    it('A → B → C → A: properly traverses full cycle once', async () => {
      await wiki.createPage({ title: 'A', content: '[[B]]' })
      await wiki.createPage({ title: 'B', content: '[[C]]' })
      await wiki.createPage({ title: 'C', content: '[[A]]' })
      const connected = wiki.getConnectedPages('a', 10)
      expect(connected).toHaveLength(3)
    })

    it('complex graph with multiple cycles terminates correctly', async () => {
      await wiki.createPage({ title: 'A', content: '[[B]] [[C]]' })
      await wiki.createPage({ title: 'B', content: '[[C]] [[D]]' })
      await wiki.createPage({ title: 'C', content: '[[A]]' })
      await wiki.createPage({ title: 'D', content: '[[B]]' })
      const connected = wiki.getConnectedPages('a', 10)
      expect(connected.length).toBeGreaterThan(0)
      expect(connected.length).toBeLessThanOrEqual(4)
    })
  })
})
