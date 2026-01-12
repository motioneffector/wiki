import type { WikiStorage, WikiPage } from '../types'

export function memoryStorage(): WikiStorage {
  const pages = new Map<string, WikiPage>()

  return {
    async save(page: WikiPage): Promise<void> {
      pages.set(page.id, { ...page })
    },

    async load(id: string): Promise<WikiPage | null> {
      const page = pages.get(id)
      return page ? { ...page } : null
    },

    async delete(id: string): Promise<void> {
      pages.delete(id)
    },

    async list(): Promise<WikiPage[]> {
      return Array.from(pages.values()).map(page => ({ ...page }))
    },
  }
}
