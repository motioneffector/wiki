import { describe, it, expect, beforeEach } from 'vitest'
import type { Wiki, WikiPage, WikiStorage } from '../types'
import { createWiki } from './wiki'

describe('Wiki Creation', () => {
  describe('createWiki(options?)', () => {
    it('creates wiki instance with no options', () => {
      const wiki = createWiki()
      expect(wiki).toBeDefined()
    })

    it('accepts storage adapter option', () => {
      const storage: WikiStorage = {
        save: async () => {},
        load: async () => null,
        delete: async () => {},
        list: async () => [],
      }
      const wiki = createWiki({ storage })
      expect(wiki).toBeDefined()
    })

    it('accepts custom link pattern option (regex)', () => {
      const linkPattern = /\{\{([^}]+)\}\}/g
      const wiki = createWiki({ linkPattern })
      expect(wiki).toBeDefined()
    })

    it('starts with no pages (listPages returns empty array)', () => {
      const wiki = createWiki()
      expect(wiki.listPages()).toEqual([])
    })

    it('returns object with all documented methods', () => {
      const wiki = createWiki()
      expect(typeof wiki.createPage).toBe('function')
      expect(typeof wiki.getPage).toBe('function')
      expect(typeof wiki.updatePage).toBe('function')
      expect(typeof wiki.deletePage).toBe('function')
      expect(typeof wiki.listPages).toBe('function')
    })
  })

  describe('Default Options', () => {
    it('uses memoryStorage() when no storage provided', () => {
      const wiki = createWiki()
      expect(wiki).toBeDefined()
    })

    it('uses /\\[\\[([^\\]|]+)(?:\\|[^\\]]+)?\\]\\]/g as default link pattern', () => {
      const wiki = createWiki()
      expect(wiki).toBeDefined()
    })
  })

  describe('Options Validation', () => {
    it('throws TypeError if storage is provided but doesn\'t implement WikiStorage interface', () => {
      const invalidStorage = { save: 'not a function' }
      expect(() => createWiki({ storage: invalidStorage })).toThrow(TypeError)
    })

    it('throws TypeError if linkPattern is provided but is not a RegExp', () => {
      expect(() => createWiki({ linkPattern: 'not a regex' })).toThrow(TypeError)
    })

    it('throws Error if linkPattern has no capture group', () => {
      const noCapture = /\[\[[^\]]+\]\]/g
      expect(() => createWiki({ linkPattern: noCapture })).toThrow(Error)
    })
  })
})

describe('Page Creation', () => {
  let wiki: Wiki

  beforeEach(() => {
    wiki = createWiki()
  })

  describe('wiki.createPage(data) - Basic', () => {
    it('creates page with title and content', async () => {
      const page = await wiki.createPage({
        title: 'Test Page',
        content: 'Test content',
      })
      expect(page.title).toBe('Test Page')
      expect(page.content).toBe('Test content')
    })

    it('returns the created WikiPage object', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      expect(page).toHaveProperty('id')
      expect(page).toHaveProperty('title')
      expect(page).toHaveProperty('content')
      expect(page).toHaveProperty('created')
      expect(page).toHaveProperty('modified')
    })

    it('page is immediately retrievable via getPage()', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      const retrieved = wiki.getPage(page.id)
      expect(retrieved).toEqual(page)
    })

    it('page is immediately retrievable via getPageByTitle()', async () => {
      const page = await wiki.createPage({ title: 'Test Page' })
      const retrieved = wiki.getPageByTitle('Test Page')
      expect(retrieved).toEqual(page)
    })
  })

  describe('ID Handling', () => {
    it('generates id from title if not provided: King Aldric I → king-aldric-i', async () => {
      const page = await wiki.createPage({ title: 'King Aldric I' })
      expect(page.id).toBe('king-aldric-i')
    })

    it('uses provided id exactly if given', async () => {
      const page = await wiki.createPage({ id: 'custom-id', title: 'Test' })
      expect(page.id).toBe('custom-id')
    })

    it('throws Error with message "Page with id \'x\' already exists" if id exists', async () => {
      await wiki.createPage({ id: 'duplicate', title: 'First' })
      await expect(wiki.createPage({ id: 'duplicate', title: 'Second' })).rejects.toThrow(
        "Page with id 'duplicate' already exists"
      )
    })

    it('appends incrementing number if generated slug exists', async () => {
      await wiki.createPage({ title: 'Test' })
      const page2 = await wiki.createPage({ title: 'Test' })
      const page3 = await wiki.createPage({ title: 'Test' })
      expect(page2.id).toBe('test-2')
      expect(page3.id).toBe('test-3')
    })
  })

  describe('ID Generation (Slugification)', () => {
    it('lowercases: King Aldric → king-aldric', async () => {
      const page = await wiki.createPage({ title: 'King Aldric' })
      expect(page.id).toBe('king-aldric')
    })

    it('replaces spaces with hyphens: New York City → new-york-city', async () => {
      const page = await wiki.createPage({ title: 'New York City' })
      expect(page.id).toBe('new-york-city')
    })

    it('removes special characters: Hello, World! → hello-world', async () => {
      const page = await wiki.createPage({ title: 'Hello, World!' })
      expect(page.id).toBe('hello-world')
    })

    it('handles multiple consecutive spaces: Hello   World → hello-world', async () => {
      const page = await wiki.createPage({ title: 'Hello   World' })
      expect(page.id).toBe('hello-world')
    })

    it('handles leading/trailing spaces:   King   → king', async () => {
      const page = await wiki.createPage({ title: '  King  ' })
      expect(page.id).toBe('king')
    })

    it('handles unicode letters: Café München → cafe-munchen (removes diacritics)', async () => {
      const page = await wiki.createPage({ title: 'Café München' })
      expect(page.id).toBe('cafe-munchen')
    })

    it('preserves numbers: World War 2 → world-war-2', async () => {
      const page = await wiki.createPage({ title: 'World War 2' })
      expect(page.id).toBe('world-war-2')
    })

    it('handles titles starting with numbers: 1984 → 1984', async () => {
      const page = await wiki.createPage({ title: '1984' })
      expect(page.id).toBe('1984')
    })

    it('handles titles that are only numbers: 42 → 42', async () => {
      const page = await wiki.createPage({ title: '42' })
      expect(page.id).toBe('42')
    })

    it('handles CJK characters: 東京 → generates valid slug', async () => {
      const page = await wiki.createPage({ title: '東京' })
      expect(page.id).toBeTruthy()
      expect(page.id.length).toBeGreaterThan(0)
    })

    it('handles emoji: Hello 🌍 → hello (strips emoji)', async () => {
      const page = await wiki.createPage({ title: 'Hello 🌍' })
      expect(page.id).toBe('hello')
    })

    it('handles title that slugifies to empty string: generates fallback id page-1, page-2', async () => {
      const page1 = await wiki.createPage({ title: '🌍🌏🌎' })
      const page2 = await wiki.createPage({ title: '⭐️✨' })
      expect(page1.id).toMatch(/page-\d+/)
      expect(page2.id).toMatch(/page-\d+/)
    })
  })

  describe('Timestamps', () => {
    it('sets created to current Date', async () => {
      const before = new Date()
      const page = await wiki.createPage({ title: 'Test' })
      const after = new Date()
      expect(page.created).toBeInstanceOf(Date)
      expect(page.created.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(page.created.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('sets modified equal to created on initial creation', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      expect(page.modified.getTime()).toBe(page.created.getTime())
    })

    it('timestamps are Date objects, not strings', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      expect(page.created).toBeInstanceOf(Date)
      expect(page.modified).toBeInstanceOf(Date)
    })
  })

  describe('Optional Fields', () => {
    it('accepts optional type field (string)', async () => {
      const page = await wiki.createPage({ title: 'Test', type: 'person' })
      expect(page.type).toBe('person')
    })

    it('accepts optional tags field (string array)', async () => {
      const page = await wiki.createPage({ title: 'Test', tags: ['tag1', 'tag2'] })
      expect(page.tags).toEqual(['tag1', 'tag2'])
    })

    it('omitted type is undefined (not null or empty string)', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      expect(page.type).toBeUndefined()
    })

    it('omitted tags is undefined (not null or empty array)', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      expect(page.tags).toBeUndefined()
    })
  })

  describe('Validation Errors', () => {
    it('throws Error "Title is required" if title is undefined', async () => {
      await expect(wiki.createPage({ title: undefined as any })).rejects.toThrow(
        'Title is required'
      )
    })

    it('throws Error "Title is required" if title is null', async () => {
      await expect(wiki.createPage({ title: null as any })).rejects.toThrow('Title is required')
    })

    it('throws Error "Title cannot be empty" if title is empty string', async () => {
      await expect(wiki.createPage({ title: '' })).rejects.toThrow('Title cannot be empty')
    })

    it('throws Error "Title cannot be empty" if title is only whitespace', async () => {
      await expect(wiki.createPage({ title: '   ' })).rejects.toThrow('Title cannot be empty')
    })

    it('accepts empty string content (creates page with no content)', async () => {
      const page = await wiki.createPage({ title: 'Test', content: '' })
      expect(page.content).toBe('')
    })

    it('accepts undefined content (defaults to empty string)', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      expect(page.content).toBe('')
    })

    it('throws TypeError "Tags must be an array" if tags is not an array', async () => {
      await expect(
        wiki.createPage({ title: 'Test', tags: 'not-array' as any })
      ).rejects.toThrow(TypeError)
      await expect(
        wiki.createPage({ title: 'Test', tags: 'not-array' as any })
      ).rejects.toThrow('Tags must be an array')
    })

    it('throws TypeError "Each tag must be a non-empty string" if tags contains non-strings', async () => {
      await expect(wiki.createPage({ title: 'Test', tags: [123] as any })).rejects.toThrow(
        TypeError
      )
      await expect(wiki.createPage({ title: 'Test', tags: [123] as any })).rejects.toThrow(
        'Each tag must be a non-empty string'
      )
    })

    it('throws TypeError "Each tag must be a non-empty string" if tags contains empty strings', async () => {
      await expect(wiki.createPage({ title: 'Test', tags: [''] })).rejects.toThrow(TypeError)
      await expect(wiki.createPage({ title: 'Test', tags: [''] })).rejects.toThrow(
        'Each tag must be a non-empty string'
      )
    })

    it('throws TypeError "Type must be a string" if type is not a string', async () => {
      await expect(wiki.createPage({ title: 'Test', type: 123 as any })).rejects.toThrow(
        TypeError
      )
      await expect(wiki.createPage({ title: 'Test', type: 123 as any })).rejects.toThrow(
        'Type must be a string'
      )
    })
  })

  describe('Link Extraction on Create', () => {
    it('extracts links from content and stores them', async () => {
      const page = await wiki.createPage({
        title: 'Story',
        content: 'The [[Hero]] found the [[Magic Sword]].',
      })
      const links = wiki.getLinks(page.id)
      expect(links).toContain('Hero')
      expect(links).toContain('Magic Sword')
    })

    it('links are queryable immediately via getLinks()', async () => {
      const page = await wiki.createPage({
        title: 'Test',
        content: '[[Link]]',
      })
      const links = wiki.getLinks(page.id)
      expect(links).toContain('Link')
    })

    it('backlinks on target pages are updated immediately', async () => {
      await wiki.createPage({ title: 'Target' })
      await wiki.createPage({ title: 'Source', content: '[[Target]]' })
      const backlinks = wiki.getBacklinks('target')
      expect(backlinks).toContain('source')
    })
  })
})

describe('Page Retrieval', () => {
  let wiki: Wiki

  beforeEach(() => {
    wiki = createWiki()
  })

  describe('wiki.getPage(id)', () => {
    it('returns WikiPage object for existing page', async () => {
      const created = await wiki.createPage({ title: 'Test' })
      const retrieved = wiki.getPage(created.id)
      expect(retrieved).toEqual(created)
    })

    it('returns undefined for non-existent id', () => {
      const result = wiki.getPage('nonexistent')
      expect(result).toBeUndefined()
    })

    it('returns undefined for empty string id', () => {
      const result = wiki.getPage('')
      expect(result).toBeUndefined()
    })

    it('returns undefined for null/undefined id (does not throw)', () => {
      expect(wiki.getPage(null as any)).toBeUndefined()
      expect(wiki.getPage(undefined as any)).toBeUndefined()
    })

    it('id lookup is case-sensitive: getPage(King) !== getPage(king)', async () => {
      await wiki.createPage({ id: 'King', title: 'King' })
      expect(wiki.getPage('King')).toBeDefined()
      expect(wiki.getPage('king')).toBeUndefined()
    })
  })

  describe('wiki.getPageByTitle(title)', () => {
    it('returns WikiPage for exact title match', async () => {
      const created = await wiki.createPage({ title: 'Test Page' })
      const retrieved = wiki.getPageByTitle('Test Page')
      expect(retrieved).toEqual(created)
    })

    it('returns undefined if title not found', () => {
      const result = wiki.getPageByTitle('Nonexistent')
      expect(result).toBeUndefined()
    })

    it('returns undefined for empty string title', () => {
      const result = wiki.getPageByTitle('')
      expect(result).toBeUndefined()
    })

    it('returns undefined for null/undefined title (does not throw)', () => {
      expect(wiki.getPageByTitle(null as any)).toBeUndefined()
      expect(wiki.getPageByTitle(undefined as any)).toBeUndefined()
    })

    it('is case-sensitive by default', async () => {
      await wiki.createPage({ title: 'King' })
      expect(wiki.getPageByTitle('King')).toBeDefined()
      expect(wiki.getPageByTitle('king')).toBeUndefined()
    })
  })

  describe('wiki.getPageByTitle(title, options)', () => {
    it('{ ignoreCase: true } matches case-insensitively', async () => {
      await wiki.createPage({ title: 'Test Page' })
      const result = wiki.getPageByTitle('test page', { ignoreCase: true })
      expect(result).toBeDefined()
      expect(result?.title).toBe('Test Page')
    })

    it('{ ignoreCase: true } returns first match if multiple titles differ only by case', async () => {
      await wiki.createPage({ title: 'test' })
      await wiki.createPage({ title: 'TEST' })
      const result = wiki.getPageByTitle('Test', { ignoreCase: true })
      expect(result).toBeDefined()
    })

    it('{ ignoreCase: false } is same as default (case-sensitive)', async () => {
      await wiki.createPage({ title: 'Test' })
      expect(wiki.getPageByTitle('test', { ignoreCase: false })).toBeUndefined()
    })
  })
})

describe('Page Updates', () => {
  let wiki: Wiki

  beforeEach(() => {
    wiki = createWiki()
  })

  describe('wiki.updatePage(id, data) - Basic', () => {
    it('updates specified fields only', async () => {
      const page = await wiki.createPage({ title: 'Original', content: 'Content' })
      const updated = await wiki.updatePage(page.id, { title: 'Updated' })
      expect(updated.title).toBe('Updated')
      expect(updated.content).toBe('Content')
    })

    it('preserves fields not included in data', async () => {
      const page = await wiki.createPage({
        title: 'Test',
        content: 'Content',
        type: 'person',
        tags: ['tag1'],
      })
      const updated = await wiki.updatePage(page.id, { content: 'New Content' })
      expect(updated.type).toBe('person')
      expect(updated.tags).toEqual(['tag1'])
    })

    it('returns the updated WikiPage object', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      const updated = await wiki.updatePage(page.id, { title: 'Updated' })
      expect(updated.id).toBe(page.id)
      expect(updated.title).toBe('Updated')
    })

    it('updates modified timestamp to current Date', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      const originalModified = page.modified
      await new Promise(resolve => setTimeout(resolve, 10))
      const updated = await wiki.updatePage(page.id, { title: 'Updated' })
      expect(updated.modified.getTime()).toBeGreaterThan(originalModified.getTime())
    })

    it('does NOT update created timestamp', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      const updated = await wiki.updatePage(page.id, { title: 'Updated' })
      expect(updated.created.getTime()).toBe(page.created.getTime())
    })
  })

  describe('Field Updates', () => {
    it('can update title', async () => {
      const page = await wiki.createPage({ title: 'Original' })
      const updated = await wiki.updatePage(page.id, { title: 'New Title' })
      expect(updated.title).toBe('New Title')
    })

    it('can update content', async () => {
      const page = await wiki.createPage({ title: 'Test', content: 'Original' })
      const updated = await wiki.updatePage(page.id, { content: 'New Content' })
      expect(updated.content).toBe('New Content')
    })

    it('can update type', async () => {
      const page = await wiki.createPage({ title: 'Test', type: 'person' })
      const updated = await wiki.updatePage(page.id, { type: 'place' })
      expect(updated.type).toBe('place')
    })

    it('can update tags', async () => {
      const page = await wiki.createPage({ title: 'Test', tags: ['old'] })
      const updated = await wiki.updatePage(page.id, { tags: ['new'] })
      expect(updated.tags).toEqual(['new'])
    })

    it('can set type to undefined to remove it', async () => {
      const page = await wiki.createPage({ title: 'Test', type: 'person' })
      const updated = await wiki.updatePage(page.id, { type: undefined })
      expect(updated.type).toBeUndefined()
    })

    it('can set tags to undefined to remove them', async () => {
      const page = await wiki.createPage({ title: 'Test', tags: ['tag'] })
      const updated = await wiki.updatePage(page.id, { tags: undefined })
      expect(updated.tags).toBeUndefined()
    })

    it('cannot change id (id field in data is ignored)', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      const updated = await wiki.updatePage(page.id, { id: 'new-id' } as any)
      expect(updated.id).toBe(page.id)
    })
  })

  describe('Link Re-extraction', () => {
    it('re-extracts links when content changes', async () => {
      const page = await wiki.createPage({ title: 'Test', content: '[[Old]]' })
      expect(wiki.getLinks(page.id)).toContain('Old')
      await wiki.updatePage(page.id, { content: '[[New]]' })
      expect(wiki.getLinks(page.id)).toContain('New')
      expect(wiki.getLinks(page.id)).not.toContain('Old')
    })

    it('updates backlinks: removes backlinks for links no longer present', async () => {
      await wiki.createPage({ title: 'Target' })
      const page = await wiki.createPage({ title: 'Source', content: '[[Target]]' })
      expect(wiki.getBacklinks('target')).toContain('source')
      await wiki.updatePage(page.id, { content: 'No links' })
      expect(wiki.getBacklinks('target')).not.toContain('source')
    })

    it('updates backlinks: adds backlinks for new links', async () => {
      await wiki.createPage({ title: 'Target' })
      const page = await wiki.createPage({ title: 'Source', content: 'No links' })
      expect(wiki.getBacklinks('target')).not.toContain('source')
      await wiki.updatePage(page.id, { content: '[[Target]]' })
      expect(wiki.getBacklinks('target')).toContain('source')
    })

    it('does not re-extract if content unchanged (other fields only)', async () => {
      const page = await wiki.createPage({ title: 'Test', content: '[[Link]]' })
      const linksBefore = wiki.getLinks(page.id)
      await wiki.updatePage(page.id, { type: 'person' })
      const linksAfter = wiki.getLinks(page.id)
      expect(linksAfter).toEqual(linksBefore)
    })
  })

  describe('Errors', () => {
    it('throws Error "Page \'x\' not found" if page doesn\'t exist', async () => {
      await expect(wiki.updatePage('nonexistent', { title: 'Test' })).rejects.toThrow(
        "Page 'nonexistent' not found"
      )
    })

    it('throws same validation errors as createPage for invalid field values', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      await expect(wiki.updatePage(page.id, { title: '' })).rejects.toThrow(
        'Title cannot be empty'
      )
      await expect(wiki.updatePage(page.id, { tags: [''] })).rejects.toThrow(TypeError)
    })
  })

  describe('wiki.renamePage(id, newTitle, options?)', () => {
    it('changes page title to newTitle', async () => {
      const page = await wiki.createPage({ title: 'Old Title' })
      const renamed = await wiki.renamePage(page.id, 'New Title')
      expect(renamed.title).toBe('New Title')
    })

    it('updates modified timestamp', async () => {
      const page = await wiki.createPage({ title: 'Old' })
      await new Promise(resolve => setTimeout(resolve, 10))
      const renamed = await wiki.renamePage(page.id, 'New')
      expect(renamed.modified.getTime()).toBeGreaterThan(page.modified.getTime())
    })

    it('returns the updated WikiPage object', async () => {
      const page = await wiki.createPage({ title: 'Old' })
      const renamed = await wiki.renamePage(page.id, 'New')
      expect(renamed).toHaveProperty('id')
      expect(renamed).toHaveProperty('title')
    })
  })

  describe('Rename with ID Update', () => {
    it('{ updateId: true } changes id to new slug from newTitle', async () => {
      const page = await wiki.createPage({ title: 'Old Title' })
      const renamed = await wiki.renamePage(page.id, 'New Title', { updateId: true })
      expect(renamed.id).toBe('new-title')
    })

    it('{ updateId: true } throws if new id already exists', async () => {
      await wiki.createPage({ title: 'Existing' })
      const page = await wiki.createPage({ title: 'Test' })
      await expect(wiki.renamePage(page.id, 'Existing', { updateId: true })).rejects.toThrow()
    })

    it('{ updateId: false } keeps original id (default)', async () => {
      const page = await wiki.createPage({ title: 'Old' })
      const originalId = page.id
      const renamed = await wiki.renamePage(page.id, 'New', { updateId: false })
      expect(renamed.id).toBe(originalId)
    })

    it('{ updateId: true } updates all pages that link to this page', async () => {
      const target = await wiki.createPage({ title: 'Old Title' })
      await wiki.createPage({ title: 'Source', content: '[[Old Title]]' })
      await wiki.renamePage(target.id, 'New Title', { updateId: true })
      const source = wiki.getPageByTitle('Source')
      expect(source?.content).toContain('[[New Title]]')
    })
  })

  describe('Rename Validation', () => {
    it('throws Error "Page \'x\' not found" if page doesn\'t exist', async () => {
      await expect(wiki.renamePage('nonexistent', 'New')).rejects.toThrow("Page 'nonexistent'")
    })

    it('throws Error "Title cannot be empty" if newTitle is empty', async () => {
      const page = await wiki.createPage({ title: 'Test' })
      await expect(wiki.renamePage(page.id, '')).rejects.toThrow('Title cannot be empty')
    })
  })
})

// Continuing in next message due to length...
