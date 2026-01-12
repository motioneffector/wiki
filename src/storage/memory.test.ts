import { describe, it, expect } from 'vitest'
import type { WikiStorage, WikiPage } from '../types'

function memoryStorage(): WikiStorage {
  throw new Error('Not implemented')
}

describe('Memory Storage', () => {
  describe('memoryStorage()', () => {
    it('implements WikiStorage interface', () => {
      const storage = memoryStorage()
      expect(typeof storage.save).toBe('function')
      expect(typeof storage.load).toBe('function')
      expect(typeof storage.delete).toBe('function')
      expect(typeof storage.list).toBe('function')
    })

    it('save() stores page in memory', async () => {
      const storage = memoryStorage()
      const page: WikiPage = {
        id: 'test',
        title: 'Test',
        content: 'Content',
        created: new Date(),
        modified: new Date(),
      }
      await storage.save(page)
      const loaded = await storage.load('test')
      expect(loaded).toEqual(page)
    })

    it('load() retrieves page by id', async () => {
      const storage = memoryStorage()
      const page: WikiPage = {
        id: 'test',
        title: 'Test',
        content: '',
        created: new Date(),
        modified: new Date(),
      }
      await storage.save(page)
      const loaded = await storage.load('test')
      expect(loaded?.id).toBe('test')
    })

    it('load() returns null for non-existent id', async () => {
      const storage = memoryStorage()
      const result = await storage.load('nonexistent')
      expect(result).toBeNull()
    })

    it('delete() removes page', async () => {
      const storage = memoryStorage()
      const page: WikiPage = {
        id: 'test',
        title: 'Test',
        content: '',
        created: new Date(),
        modified: new Date(),
      }
      await storage.save(page)
      await storage.delete('test')
      const loaded = await storage.load('test')
      expect(loaded).toBeNull()
    })

    it('list() returns all stored pages', async () => {
      const storage = memoryStorage()
      const page1: WikiPage = {
        id: 'a',
        title: 'A',
        content: '',
        created: new Date(),
        modified: new Date(),
      }
      const page2: WikiPage = {
        id: 'b',
        title: 'B',
        content: '',
        created: new Date(),
        modified: new Date(),
      }
      await storage.save(page1)
      await storage.save(page2)
      const pages = await storage.list()
      expect(pages).toHaveLength(2)
    })

    it('data is lost when instance is garbage collected', () => {
      const storage1 = memoryStorage()
      const storage2 = memoryStorage()
      expect(storage1).not.toBe(storage2)
    })
  })
})
