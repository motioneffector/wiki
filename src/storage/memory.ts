import type { WikiStorage, WikiPage } from '../types'

/**
 * Creates an in-memory storage adapter for wiki pages.
 *
 * Data is stored in memory and will be lost when the process ends or the instance is garbage collected.
 * Useful for testing, prototyping, or temporary wikis that don't need persistence.
 *
 * @returns A WikiStorage implementation that stores pages in memory
 *
 * @example
 * ```typescript
 * import { createWiki, memoryStorage } from '@motioneffector/wiki'
 *
 * const storage = memoryStorage()
 * const wiki = createWiki({ storage })
 * ```
 */
export function memoryStorage(): WikiStorage {
  const pages = new Map<string, WikiPage>()

  return {
    save(page: WikiPage): Promise<void> {
      pages.set(page.id, { ...page })
      return Promise.resolve()
    },

    load(id: string): Promise<WikiPage | null> {
      const page = pages.get(id)
      return Promise.resolve(page ? { ...page } : null)
    },

    delete(id: string): Promise<void> {
      pages.delete(id)
      return Promise.resolve()
    },

    list(): Promise<WikiPage[]> {
      const result = Array.from(pages.values()).map(page => ({ ...page }))
      return Promise.resolve(result)
    },
  }
}
