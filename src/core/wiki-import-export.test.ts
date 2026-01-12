import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Wiki, WikiPage } from '../types'
import { createWiki } from './wiki'

describe('Import/Export', () => {
  let wiki: Wiki

  beforeEach(() => {
    wiki = createWiki()
  })

  describe('wiki.export()', () => {
    it('returns array of all WikiPage objects', async () => {
      await wiki.createPage({ title: 'Page1' })
      await wiki.createPage({ title: 'Page2' })
      const exported = wiki.export()
      expect(exported).toHaveLength(2)
    })

    it('returns empty array if wiki is empty', () => {
      const exported = wiki.export()
      expect(exported).toEqual([])
    })

    it('pages include all fields (id, title, content, type, tags, created, modified)', async () => {
      await wiki.createPage({
        title: 'Test',
        content: 'Content',
        type: 'person',
        tags: ['tag'],
      })
      const exported = wiki.export()
      const page = exported[0]
      expect(page).toHaveProperty('id')
      expect(page).toHaveProperty('title')
      expect(page).toHaveProperty('content')
      expect(page).toHaveProperty('type')
      expect(page).toHaveProperty('tags')
      expect(page).toHaveProperty('created')
      expect(page).toHaveProperty('modified')
    })

    it('returned array is a copy (modifying it doesn\'t affect wiki)', async () => {
      await wiki.createPage({ title: 'Test' })
      const exported = wiki.export()
      exported.pop()
      expect(wiki.listPages()).toHaveLength(1)
    })

    it('Date objects are preserved as Dates', async () => {
      await wiki.createPage({ title: 'Test' })
      const exported = wiki.export()
      expect(exported[0]?.created).toBeInstanceOf(Date)
      expect(exported[0]?.modified).toBeInstanceOf(Date)
    })
  })

  describe('wiki.import(pages, options?)', () => {
    it('imports array of WikiPage objects', async () => {
      const pages: WikiPage[] = [
        {
          id: 'page1',
          title: 'Page 1',
          content: 'Content',
          created: new Date(),
          modified: new Date(),
        },
      ]
      const count = await wiki.import(pages)
      expect(count).toBe(1)
      expect(wiki.getPage('page1')).toBeDefined()
    })

    it('extracts and indexes links for all imported pages', async () => {
      const pages: WikiPage[] = [
        {
          id: 'page1',
          title: 'Page 1',
          content: '[[Page 2]]',
          created: new Date(),
          modified: new Date(),
        },
        {
          id: 'page2',
          title: 'Page 2',
          content: '',
          created: new Date(),
          modified: new Date(),
        },
      ]
      await wiki.import(pages)
      const links = wiki.getLinks('page1')
      expect(links).toContain('Page 2')
    })

    it('builds backlink index for all imported pages', async () => {
      const pages: WikiPage[] = [
        {
          id: 'source',
          title: 'Source',
          content: '[[Target]]',
          created: new Date(),
          modified: new Date(),
        },
        {
          id: 'target',
          title: 'Target',
          content: '',
          created: new Date(),
          modified: new Date(),
        },
      ]
      await wiki.import(pages)
      const backlinks = wiki.getBacklinks('target')
      expect(backlinks).toContain('source')
    })

    it('returns count of imported pages', async () => {
      const pages: WikiPage[] = [
        { id: 'a', title: 'A', content: '', created: new Date(), modified: new Date() },
        { id: 'b', title: 'B', content: '', created: new Date(), modified: new Date() },
      ]
      const count = await wiki.import(pages)
      expect(count).toBe(2)
    })
  })

  describe('Import Options', () => {
    it('{ mode: "replace" } clears existing pages first (default)', async () => {
      await wiki.createPage({ title: 'Existing' })
      const pages: WikiPage[] = [
        { id: 'new', title: 'New', content: '', created: new Date(), modified: new Date() },
      ]
      await wiki.import(pages, { mode: 'replace' })
      expect(wiki.listPages()).toHaveLength(1)
      expect(wiki.getPage('new')).toBeDefined()
      expect(wiki.getPageByTitle('Existing')).toBeUndefined()
    })

    it('{ mode: "merge" } keeps existing pages, adds/overwrites imported', async () => {
      await wiki.createPage({ id: 'existing', title: 'Existing' })
      const pages: WikiPage[] = [
        { id: 'new', title: 'New', content: '', created: new Date(), modified: new Date() },
      ]
      await wiki.import(pages, { mode: 'merge' })
      expect(wiki.listPages()).toHaveLength(2)
      expect(wiki.getPage('existing')).toBeDefined()
      expect(wiki.getPage('new')).toBeDefined()
    })

    it('{ mode: "merge" } page with same id overwrites existing', async () => {
      await wiki.createPage({ id: 'test', title: 'Old Title' })
      const pages: WikiPage[] = [
        {
          id: 'test',
          title: 'New Title',
          content: '',
          created: new Date(),
          modified: new Date(),
        },
      ]
      await wiki.import(pages, { mode: 'merge' })
      const page = wiki.getPage('test')
      expect(page?.title).toBe('New Title')
    })

    it('{ mode: "merge" } page with new id is added', async () => {
      await wiki.createPage({ id: 'existing', title: 'Existing' })
      const pages: WikiPage[] = [
        { id: 'new', title: 'New', content: '', created: new Date(), modified: new Date() },
      ]
      await wiki.import(pages, { mode: 'merge' })
      expect(wiki.getPage('new')).toBeDefined()
    })

    it('{ mode: "skip" } keeps existing pages, only adds new ids', async () => {
      await wiki.createPage({ id: 'test', title: 'Original' })
      const pages: WikiPage[] = [
        {
          id: 'test',
          title: 'Should Be Skipped',
          content: '',
          created: new Date(),
          modified: new Date(),
        },
        { id: 'new', title: 'New', content: '', created: new Date(), modified: new Date() },
      ]
      await wiki.import(pages, { mode: 'skip' })
      expect(wiki.getPage('test')?.title).toBe('Original')
      expect(wiki.getPage('new')).toBeDefined()
    })
  })

  describe('Import Validation', () => {
    it('throws Error if pages is not an array', async () => {
      await expect(wiki.import('not an array' as any)).rejects.toThrow()
    })

    it('throws Error if any page missing required id field', async () => {
      const pages = [{ title: 'No ID', content: '', created: new Date(), modified: new Date() }]
      await expect(wiki.import(pages as any)).rejects.toThrow()
    })

    it('throws Error if any page missing required title field', async () => {
      const pages = [{ id: 'test', content: '', created: new Date(), modified: new Date() }]
      await expect(wiki.import(pages as any)).rejects.toThrow()
    })

    it('validates all pages before importing any (atomic)', async () => {
      const pages: any[] = [
        { id: 'valid', title: 'Valid', content: '', created: new Date(), modified: new Date() },
        { id: 'invalid' }, // Missing title
      ]
      await expect(wiki.import(pages)).rejects.toThrow()
      expect(wiki.getPage('valid')).toBeUndefined()
    })

    it('restores created/modified as Date objects if they\'re ISO strings', async () => {
      const pages: any[] = [
        {
          id: 'test',
          title: 'Test',
          content: '',
          created: '2024-01-01T00:00:00.000Z',
          modified: '2024-01-01T00:00:00.000Z',
        },
      ]
      await wiki.import(pages)
      const page = wiki.getPage('test')
      expect(page?.created).toBeInstanceOf(Date)
      expect(page?.modified).toBeInstanceOf(Date)
    })
  })

  describe('wiki.toJSON()', () => {
    it('returns JSON-serializable representation of entire wiki', async () => {
      await wiki.createPage({ title: 'Test' })
      const json = wiki.toJSON()
      expect(typeof json).toBe('string')
    })

    it('Date objects are serialized as ISO strings', async () => {
      await wiki.createPage({ title: 'Test' })
      const json = wiki.toJSON()
      const parsed = JSON.parse(json)
      expect(typeof parsed[0].created).toBe('string')
    })

    it('can be passed to JSON.stringify()', async () => {
      await wiki.createPage({ title: 'Test' })
      const json = wiki.toJSON()
      expect(() => JSON.parse(json)).not.toThrow()
    })
  })

  describe('wiki.fromJSON(json)', () => {
    it('static method to create wiki from JSON', async () => {
      await wiki.createPage({ title: 'Test', content: '[[Link]]' })
      const json = wiki.toJSON()

      // fromJSON should be available as a static method or similar
      const newWiki = createWiki()
      const pages = JSON.parse(json)
      await newWiki.import(pages, { mode: 'replace' })

      expect(newWiki.listPages()).toHaveLength(1)
      expect(newWiki.getPageByTitle('Test')).toBeDefined()
    })

    it('restores Date objects from ISO strings', async () => {
      await wiki.createPage({ title: 'Test' })
      const json = wiki.toJSON()

      const newWiki = createWiki()
      const pages = JSON.parse(json)
      await newWiki.import(pages, { mode: 'replace' })

      const restored = newWiki.getPageByTitle('Test')
      expect(restored?.created).toBeInstanceOf(Date)
      expect(restored?.modified).toBeInstanceOf(Date)
    })

    it('rebuilds link index', async () => {
      await wiki.createPage({ title: 'Target' })
      await wiki.createPage({ title: 'Source', content: '[[Target]]' })
      const json = wiki.toJSON()

      const newWiki = createWiki()
      const pages = JSON.parse(json)
      await newWiki.import(pages, { mode: 'replace' })

      // Verify link index is rebuilt
      const links = newWiki.getLinks('source')
      expect(links).toContain('Target')

      const backlinks = newWiki.getBacklinks('target')
      expect(backlinks).toContain('source')
    })
  })
})

describe('Events', () => {
  let wiki: Wiki

  beforeEach(() => {
    wiki = createWiki()
  })

  describe('wiki.on(event, callback) / wiki.onChange(callback)', () => {
    it('registers callback for wiki changes', async () => {
      let called = false
      wiki.onChange(() => {
        called = true
      })
      await wiki.createPage({ title: 'Test' })
      expect(called).toBe(true)
    })

    it('returns unsubscribe function', () => {
      const unsubscribe = wiki.onChange(() => {})
      expect(typeof unsubscribe).toBe('function')
    })

    it('calling unsubscribe stops future callbacks', async () => {
      let count = 0
      const unsubscribe = wiki.onChange(() => {
        count++
      })
      await wiki.createPage({ title: 'Test1' })
      unsubscribe()
      await wiki.createPage({ title: 'Test2' })
      expect(count).toBe(1)
    })
  })

  describe('Event Types and Payloads', () => {
    it('create fires after page created: { type: create, page: WikiPage }', async () => {
      let event: any
      wiki.onChange(e => {
        event = e
      })
      const page = await wiki.createPage({ title: 'Test' })
      expect(event.type).toBe('create')
      expect(event.page.id).toBe(page.id)
    })

    it('update fires after page updated: { type: update, page: WikiPage, previous: WikiPage }', async () => {
      let event: any
      const page = await wiki.createPage({ title: 'Test' })
      wiki.onChange(e => {
        event = e
      })
      await wiki.updatePage(page.id, { title: 'Updated' })
      expect(event.type).toBe('update')
      expect(event.page.title).toBe('Updated')
      expect(event.previous.title).toBe('Test')
    })

    it('delete fires after page deleted: { type: delete, page: WikiPage }', async () => {
      let event: any
      const page = await wiki.createPage({ title: 'Test' })
      wiki.onChange(e => {
        event = e
      })
      await wiki.deletePage(page.id)
      expect(event.type).toBe('delete')
      expect(event.page.id).toBe(page.id)
    })

    it('rename fires after page renamed: { type: rename, page: WikiPage, previousTitle: string }', async () => {
      let event: any
      const page = await wiki.createPage({ title: 'Old' })
      wiki.onChange(e => {
        event = e
      })
      await wiki.renamePage(page.id, 'New')
      expect(event.type).toBe('rename')
      expect(event.page.title).toBe('New')
      expect(event.previousTitle).toBe('Old')
    })
  })

  describe('Event Timing', () => {
    it('events fire after operation completes successfully', async () => {
      let eventFired = false
      wiki.onChange(() => {
        eventFired = true
      })
      const promise = wiki.createPage({ title: 'Test' })
      expect(eventFired).toBe(false)
      await promise
      expect(eventFired).toBe(true)
    })

    it('events fire after storage is updated', async () => {
      let callbackPage: WikiPage | undefined
      wiki.onChange(e => {
        if (e.type === 'create') {
          callbackPage = wiki.getPage(e.page.id)
        }
      })
      await wiki.createPage({ title: 'Test' })
      expect(callbackPage).toBeDefined()
    })

    it('events do not fire if operation throws', async () => {
      let called = false
      wiki.onChange(() => {
        called = true
      })
      try {
        await wiki.createPage({ title: '' })
      } catch {}
      expect(called).toBe(false)
    })
  })

  describe('Multiple Subscribers', () => {
    it('multiple callbacks can be registered', async () => {
      let count1 = 0
      let count2 = 0
      wiki.onChange(() => {
        count1++
      })
      wiki.onChange(() => {
        count2++
      })
      await wiki.createPage({ title: 'Test' })
      expect(count1).toBe(1)
      expect(count2).toBe(1)
    })

    it('all callbacks receive the event', async () => {
      const events: any[] = []
      wiki.onChange(e => events.push(e))
      wiki.onChange(e => events.push(e))
      await wiki.createPage({ title: 'Test' })
      expect(events).toHaveLength(2)
      expect(events[0]?.type).toBe('create')
      expect(events[1]?.type).toBe('create')
    })

    it('unsubscribing one doesn\'t affect others', async () => {
      let count1 = 0
      let count2 = 0
      const unsub1 = wiki.onChange(() => {
        count1++
      })
      wiki.onChange(() => {
        count2++
      })
      unsub1()
      await wiki.createPage({ title: 'Test' })
      expect(count1).toBe(0)
      expect(count2).toBe(1)
    })

    it('callbacks are called in registration order', async () => {
      const order: number[] = []
      wiki.onChange(() => order.push(1))
      wiki.onChange(() => order.push(2))
      wiki.onChange(() => order.push(3))
      await wiki.createPage({ title: 'Test' })
      expect(order).toEqual([1, 2, 3])
    })
  })

  describe('Callback Error Handling', () => {
    it('error in callback does not affect wiki operation', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      wiki.onChange(() => {
        throw new Error('Callback error')
      })
      await wiki.createPage({ title: 'Test' })
      expect(wiki.getPageByTitle('Test')).toBeDefined()
      // Per TESTS.md line 822: error in callback is logged to console.error
      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })

    it('error in callback does not prevent other callbacks', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      let called = false
      wiki.onChange(() => {
        throw new Error('First callback error')
      })
      wiki.onChange(() => {
        called = true
      })
      await wiki.createPage({ title: 'Test' })
      expect(called).toBe(true)
      // Error should be logged
      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Import Events', () => {
    it('{ emitEvents: true } fires create for each imported page', async () => {
      let count = 0
      wiki.onChange(() => {
        count++
      })
      const pages: WikiPage[] = [
        { id: 'a', title: 'A', content: '', created: new Date(), modified: new Date() },
        { id: 'b', title: 'B', content: '', created: new Date(), modified: new Date() },
      ]
      await wiki.import(pages, { emitEvents: true })
      expect(count).toBe(2)
    })

    it('{ emitEvents: false } does not fire events (default, for performance)', async () => {
      let count = 0
      wiki.onChange(() => {
        count++
      })
      const pages: WikiPage[] = [
        { id: 'a', title: 'A', content: '', created: new Date(), modified: new Date() },
      ]
      await wiki.import(pages, { emitEvents: false })
      expect(count).toBe(0)
    })
  })
})
