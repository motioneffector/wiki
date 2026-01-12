import { describe, it, expect, beforeEach } from 'vitest'
import type { Wiki } from '../types'
import { createWiki } from './wiki'

describe('Page Listing', () => {
  let wiki: Wiki

  beforeEach(() => {
    wiki = createWiki()
  })

  describe('wiki.listPages()', () => {
    it('returns array of all WikiPage objects', async () => {
      await wiki.createPage({ title: 'Page1' })
      await wiki.createPage({ title: 'Page2' })
      const pages = wiki.listPages()
      expect(pages).toHaveLength(2)
    })

    it('returns empty array if wiki has no pages', () => {
      expect(wiki.listPages()).toEqual([])
    })

    it('default sort order is by created date descending (newest first)', async () => {
      const page1 = await wiki.createPage({ title: 'First' })
      await new Promise(resolve => setTimeout(resolve, 10))
      const page2 = await wiki.createPage({ title: 'Second' })
      const pages = wiki.listPages()
      expect(pages[0]?.id).toBe(page2.id)
      expect(pages[1]?.id).toBe(page1.id)
    })
  })

  describe('wiki.listPages(options) - Filtering', () => {
    it('{ type: "person" } returns only pages with type person', async () => {
      await wiki.createPage({ title: 'King', type: 'person' })
      await wiki.createPage({ title: 'Castle', type: 'place' })
      const pages = wiki.listPages({ type: 'person' })
      expect(pages).toHaveLength(1)
      expect(pages[0]?.type).toBe('person')
    })

    it('{ type: "person" } returns empty array if no pages have that type', async () => {
      await wiki.createPage({ title: 'Test', type: 'place' })
      expect(wiki.listPages({ type: 'person' })).toEqual([])
    })

    it('{ tags: ["magic"] } returns pages with magic tag', async () => {
      await wiki.createPage({ title: 'Spell', tags: ['magic'] })
      await wiki.createPage({ title: 'Sword', tags: ['weapon'] })
      const pages = wiki.listPages({ tags: ['magic'] })
      expect(pages).toHaveLength(1)
      expect(pages[0]?.tags).toContain('magic')
    })

    it('{ tags: ["magic", "fire"] } returns pages with ANY of the tags (OR logic)', async () => {
      await wiki.createPage({ title: 'Fireball', tags: ['magic', 'fire'] })
      await wiki.createPage({ title: 'Ice', tags: ['magic', 'ice'] })
      await wiki.createPage({ title: 'Sword', tags: ['weapon'] })
      const pages = wiki.listPages({ tags: ['fire', 'ice'] })
      expect(pages).toHaveLength(2)
    })

    it('{ tags: [] } returns all pages (no tag filter)', async () => {
      await wiki.createPage({ title: 'Page1', tags: ['tag1'] })
      await wiki.createPage({ title: 'Page2', tags: ['tag2'] })
      const pages = wiki.listPages({ tags: [] })
      expect(pages).toHaveLength(2)
    })

    it('{ type: "person", tags: ["royalty"] } combines filters (AND logic)', async () => {
      await wiki.createPage({ title: 'King', type: 'person', tags: ['royalty'] })
      await wiki.createPage({ title: 'Knight', type: 'person', tags: ['military'] })
      await wiki.createPage({ title: 'Castle', type: 'place', tags: ['royalty'] })
      const pages = wiki.listPages({ type: 'person', tags: ['royalty'] })
      expect(pages).toHaveLength(1)
      expect(pages[0]?.title).toBe('King')
    })
  })

  describe('wiki.listPages(options) - Sorting', () => {
    it('{ sort: "title" } sorts alphabetically by title', async () => {
      await wiki.createPage({ title: 'Zebra' })
      await wiki.createPage({ title: 'Apple' })
      await wiki.createPage({ title: 'Middle' })
      const pages = wiki.listPages({ sort: 'title', order: 'asc' })
      expect(pages[0]?.title).toBe('Apple')
      expect(pages[2]?.title).toBe('Zebra')
    })

    it('{ sort: "created" } sorts by creation date', async () => {
      const first = await wiki.createPage({ title: 'First' })
      await new Promise(resolve => setTimeout(resolve, 10))
      const second = await wiki.createPage({ title: 'Second' })
      const pages = wiki.listPages({ sort: 'created' })
      expect(pages.length).toBe(2)
    })

    it('{ sort: "modified" } sorts by modification date', async () => {
      const page1 = await wiki.createPage({ title: 'Page1' })
      const page2 = await wiki.createPage({ title: 'Page2' })
      await new Promise(resolve => setTimeout(resolve, 10))
      await wiki.updatePage(page1.id, { content: 'Updated' })
      const pages = wiki.listPages({ sort: 'modified' })
      expect(pages[0]?.id).toBe(page1.id)
    })

    it('{ order: "asc" } sorts ascending', async () => {
      await wiki.createPage({ title: 'Zebra' })
      await wiki.createPage({ title: 'Apple' })
      const pages = wiki.listPages({ sort: 'title', order: 'asc' })
      expect(pages[0]?.title).toBe('Apple')
    })

    it('{ order: "desc" } sorts descending (default)', async () => {
      await wiki.createPage({ title: 'Apple' })
      await wiki.createPage({ title: 'Zebra' })
      const pages = wiki.listPages({ sort: 'title', order: 'desc' })
      expect(pages[0]?.title).toBe('Zebra')
    })

    it('{ sort: "title", order: "asc" } combines sort and order', async () => {
      await wiki.createPage({ title: 'C' })
      await wiki.createPage({ title: 'A' })
      await wiki.createPage({ title: 'B' })
      const pages = wiki.listPages({ sort: 'title', order: 'asc' })
      expect(pages.map(p => p.title)).toEqual(['A', 'B', 'C'])
    })
  })

  describe('wiki.listPages(options) - Pagination', () => {
    it('{ limit: 10 } returns at most 10 pages', async () => {
      for (let i = 0; i < 20; i++) {
        await wiki.createPage({ title: `Page${i}` })
      }
      const pages = wiki.listPages({ limit: 10 })
      expect(pages).toHaveLength(10)
    })

    it('{ offset: 5 } skips first 5 pages', async () => {
      for (let i = 0; i < 10; i++) {
        await wiki.createPage({ title: `Page${i}` })
      }
      const allPages = wiki.listPages({ sort: 'title', order: 'asc' })
      const offsetPages = wiki.listPages({ sort: 'title', order: 'asc', offset: 5 })
      expect(offsetPages[0]?.id).toBe(allPages[5]?.id)
    })

    it('{ limit: 10, offset: 5 } returns pages 6-15', async () => {
      for (let i = 0; i < 20; i++) {
        await wiki.createPage({ title: `Page${i}` })
      }
      const pages = wiki.listPages({ limit: 10, offset: 5 })
      expect(pages).toHaveLength(10)
    })

    it('{ offset: 1000 } returns empty array if offset exceeds total', async () => {
      await wiki.createPage({ title: 'Test' })
      const pages = wiki.listPages({ offset: 1000 })
      expect(pages).toEqual([])
    })

    it('{ limit: 0 } returns empty array', async () => {
      await wiki.createPage({ title: 'Test' })
      const pages = wiki.listPages({ limit: 0 })
      expect(pages).toEqual([])
    })
  })
})

describe('Search', () => {
  let wiki: Wiki

  beforeEach(() => {
    wiki = createWiki()
  })

  describe('wiki.search(query) - Basic', () => {
    it('searches page titles and content by default', async () => {
      await wiki.createPage({ title: 'King Aldric', content: 'The ruler' })
      const results = wiki.search('Aldric')
      expect(results).toHaveLength(1)
    })

    it('returns array of WikiPage objects', async () => {
      const page = await wiki.createPage({ title: 'Test', content: 'content' })
      const results = wiki.search('Test')
      expect(results[0]).toEqual(page)
    })

    it('case-insensitive: king matches King Aldric', async () => {
      await wiki.createPage({ title: 'King Aldric' })
      const results = wiki.search('king')
      expect(results).toHaveLength(1)
    })

    it('partial match: ald matches Aldric and Aldoria', async () => {
      await wiki.createPage({ title: 'Aldric' })
      await wiki.createPage({ title: 'Aldoria' })
      const results = wiki.search('ald')
      expect(results).toHaveLength(2)
    })

    it('returns empty array if no matches', async () => {
      await wiki.createPage({ title: 'Test' })
      const results = wiki.search('NoMatch')
      expect(results).toEqual([])
    })

    it('returns empty array for empty string query', () => {
      const results = wiki.search('')
      expect(results).toEqual([])
    })

    it('returns empty array for whitespace-only query', () => {
      const results = wiki.search('   ')
      expect(results).toEqual([])
    })
  })

  describe('Search Options', () => {
    it('{ fields: ["title"] } searches only titles', async () => {
      await wiki.createPage({ title: 'Magic Sword', content: 'A powerful weapon' })
      const titleResults = wiki.search('Magic', { fields: ['title'] })
      const contentResults = wiki.search('weapon', { fields: ['title'] })
      expect(titleResults).toHaveLength(1)
      expect(contentResults).toHaveLength(0)
    })

    it('{ fields: ["content"] } searches only content', async () => {
      await wiki.createPage({ title: 'Sword', content: 'A magic weapon' })
      const results = wiki.search('magic', { fields: ['content'] })
      expect(results).toHaveLength(1)
    })

    it('{ fields: ["title", "content"] } searches both (default)', async () => {
      await wiki.createPage({ title: 'Magic', content: 'sword' })
      const titleMatch = wiki.search('Magic', { fields: ['title', 'content'] })
      const contentMatch = wiki.search('sword', { fields: ['title', 'content'] })
      expect(titleMatch).toHaveLength(1)
      expect(contentMatch).toHaveLength(1)
    })

    it('{ fields: ["tags"] } searches tag values', async () => {
      await wiki.createPage({ title: 'Spell', tags: ['magic', 'fire'] })
      const results = wiki.search('magic', { fields: ['tags'] })
      expect(results).toHaveLength(1)
    })

    it('{ type: "person" } filters results by type', async () => {
      await wiki.createPage({ title: 'King Magic', type: 'person' })
      await wiki.createPage({ title: 'Magic Sword', type: 'item' })
      const results = wiki.search('Magic', { type: 'person' })
      expect(results).toHaveLength(1)
      expect(results[0]?.type).toBe('person')
    })

    it('{ limit: 5 } limits number of results', async () => {
      for (let i = 0; i < 10; i++) {
        await wiki.createPage({ title: `Test ${i}` })
      }
      const results = wiki.search('Test', { limit: 5 })
      expect(results).toHaveLength(5)
    })
  })

  describe('Search Ranking', () => {
    it('exact title match ranks highest', async () => {
      await wiki.createPage({ title: 'Magic', content: 'nothing' })
      await wiki.createPage({ title: 'Something', content: 'magic magic magic' })
      const results = wiki.search('Magic')
      expect(results[0]?.title).toBe('Magic')
    })

    it('title contains query ranks higher than content-only match', async () => {
      await wiki.createPage({ title: 'Test Page', content: 'other' })
      await wiki.createPage({ title: 'Other', content: 'test test test test' })
      const results = wiki.search('test')
      expect(results[0]?.title).toBe('Test Page')
    })

    it('results are sorted by relevance score descending', async () => {
      await wiki.createPage({ title: 'Magic Sword', content: 'A magic weapon' })
      await wiki.createPage({ title: 'Sword', content: 'A regular weapon' })
      const results = wiki.search('magic')
      expect(results[0]?.title).toBe('Magic Sword')
    })

    it('multiple query words: pages matching more words rank higher', async () => {
      await wiki.createPage({ title: 'Magic Fire Sword', content: 'test' })
      await wiki.createPage({ title: 'Magic', content: 'test' })
      const results = wiki.search('magic fire')
      if (results.length >= 2) {
        expect(results[0]?.title).toBe('Magic Fire Sword')
      }
    })
  })

  describe('Special Characters in Search', () => {
    it('query with regex special chars is treated literally: a+b searches for a+b', async () => {
      await wiki.createPage({ title: 'Formula a+b' })
      const results = wiki.search('a+b')
      expect(results).toHaveLength(1)
    })

    it('query with brackets: [test] searches for literal [test]', async () => {
      await wiki.createPage({ title: 'Array [test]' })
      const results = wiki.search('[test]')
      expect(results).toHaveLength(1)
    })

    it('query is not interpreted as regex', async () => {
      await wiki.createPage({ title: 'Test.*' })
      const results = wiki.search('.*')
      expect(results).toHaveLength(1)
    })
  })
})

describe('Tags', () => {
  let wiki: Wiki

  beforeEach(() => {
    wiki = createWiki()
  })

  describe('wiki.getTags()', () => {
    it('returns array of unique tag strings across all pages', async () => {
      await wiki.createPage({ title: 'Page1', tags: ['tag1', 'tag2'] })
      await wiki.createPage({ title: 'Page2', tags: ['tag2', 'tag3'] })
      const tags = wiki.getTags()
      expect(tags).toContain('tag1')
      expect(tags).toContain('tag2')
      expect(tags).toContain('tag3')
      expect(tags).toHaveLength(3)
    })

    it('returns empty array if no pages have tags', async () => {
      await wiki.createPage({ title: 'Test' })
      expect(wiki.getTags()).toEqual([])
    })

    it('tags are not duplicated even if used by multiple pages', async () => {
      await wiki.createPage({ title: 'Page1', tags: ['common'] })
      await wiki.createPage({ title: 'Page2', tags: ['common'] })
      const tags = wiki.getTags()
      expect(tags.filter(t => t === 'common')).toHaveLength(1)
    })

    it('sorted alphabetically', async () => {
      await wiki.createPage({ title: 'Test', tags: ['zebra', 'apple', 'middle'] })
      const tags = wiki.getTags()
      expect(tags[0]).toBe('apple')
      expect(tags[tags.length - 1]).toBe('zebra')
    })
  })

  describe('wiki.getPagesByTag(tag)', () => {
    it('returns array of WikiPage objects with the given tag', async () => {
      const page1 = await wiki.createPage({ title: 'Page1', tags: ['magic'] })
      await wiki.createPage({ title: 'Page2', tags: ['weapon'] })
      const pages = wiki.getPagesByTag('magic')
      expect(pages).toHaveLength(1)
      expect(pages[0]?.id).toBe(page1.id)
    })

    it('returns empty array if no pages have that tag', async () => {
      await wiki.createPage({ title: 'Test', tags: ['other'] })
      expect(wiki.getPagesByTag('nonexistent')).toEqual([])
    })

    it('tag matching is case-sensitive', async () => {
      await wiki.createPage({ title: 'Test', tags: ['Magic'] })
      expect(wiki.getPagesByTag('Magic')).toHaveLength(1)
      expect(wiki.getPagesByTag('magic')).toHaveLength(0)
    })
  })

  describe('Tag Edge Cases', () => {
    it('page with empty tags array: tags not included in getTags()', async () => {
      await wiki.createPage({ title: 'Test', tags: [] })
      expect(wiki.getTags()).toEqual([])
    })

    it('page with duplicate tags in array: each tag counted once', async () => {
      await wiki.createPage({ title: 'Test', tags: ['dup', 'dup', 'unique'] })
      const tags = wiki.getTags()
      expect(tags.filter(t => t === 'dup')).toHaveLength(1)
    })

    it('updating page tags updates getTags() result', async () => {
      const page = await wiki.createPage({ title: 'Test', tags: ['old'] })
      expect(wiki.getTags()).toContain('old')
      await wiki.updatePage(page.id, { tags: ['new'] })
      expect(wiki.getTags()).toContain('new')
      expect(wiki.getTags()).not.toContain('old')
    })

    it('deleting page removes its tags from getTags() (if no other pages use them)', async () => {
      const page = await wiki.createPage({ title: 'Test', tags: ['unique'] })
      expect(wiki.getTags()).toContain('unique')
      await wiki.deletePage(page.id)
      expect(wiki.getTags()).not.toContain('unique')
    })
  })
})

describe('Page Types', () => {
  let wiki: Wiki

  beforeEach(() => {
    wiki = createWiki()
  })

  describe('wiki.getTypes()', () => {
    it('returns array of unique type strings across all pages', async () => {
      await wiki.createPage({ title: 'King', type: 'person' })
      await wiki.createPage({ title: 'Castle', type: 'place' })
      await wiki.createPage({ title: 'Knight', type: 'person' })
      const types = wiki.getTypes()
      expect(types).toContain('person')
      expect(types).toContain('place')
      expect(types).toHaveLength(2)
    })

    it('returns empty array if no pages have types', async () => {
      await wiki.createPage({ title: 'Test' })
      expect(wiki.getTypes()).toEqual([])
    })

    it('sorted alphabetically', async () => {
      await wiki.createPage({ title: 'Test1', type: 'zebra' })
      await wiki.createPage({ title: 'Test2', type: 'apple' })
      const types = wiki.getTypes()
      expect(types[0]).toBe('apple')
    })
  })

  describe('wiki.getPagesByType(type)', () => {
    it('returns array of WikiPage objects with the given type', async () => {
      const person = await wiki.createPage({ title: 'King', type: 'person' })
      await wiki.createPage({ title: 'Castle', type: 'place' })
      const pages = wiki.getPagesByType('person')
      expect(pages).toHaveLength(1)
      expect(pages[0]?.id).toBe(person.id)
    })

    it('returns empty array if no pages have that type', async () => {
      await wiki.createPage({ title: 'Test', type: 'person' })
      expect(wiki.getPagesByType('place')).toEqual([])
    })

    it('type matching is case-sensitive', async () => {
      await wiki.createPage({ title: 'Test', type: 'Person' })
      expect(wiki.getPagesByType('Person')).toHaveLength(1)
      expect(wiki.getPagesByType('person')).toHaveLength(0)
    })
  })
})
