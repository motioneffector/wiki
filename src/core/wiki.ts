import type {
  Wiki,
  WikiOptions,
  WikiPage,
  CreatePageData,
  UpdatePageData,
  RenamePageOptions,
  DeletePageOptions,
  GetPageByTitleOptions,
  ListPagesOptions,
  SearchOptions,
  ImportOptions,
  DeadLink,
  Graph,
  WikiEvent,
  WikiEventCallback,
  UnsubscribeFunction,
} from '../types'
import { ValidationError } from '../errors'
import { extractLinks } from './link-extractor'
import { memoryStorage } from '../storage/memory'

const DEFAULT_LINK_PATTERN = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g

export function createWiki(options?: WikiOptions): Wiki {
  // Validate options
  if (options?.storage) {
    const storage = options.storage
    if (
      typeof storage.save !== 'function' ||
      typeof storage.load !== 'function' ||
      typeof storage.delete !== 'function' ||
      typeof storage.list !== 'function'
    ) {
      throw new TypeError('Storage must implement WikiStorage interface')
    }
  }

  if (options?.linkPattern) {
    if (!(options.linkPattern instanceof RegExp)) {
      throw new TypeError('linkPattern must be a RegExp')
    }
    // Check for capture group by looking at the regex source
    const hasCapture = /\([^?]/.test(options.linkPattern.source)
    if (!hasCapture) {
      throw new Error('linkPattern must have at least one capture group')
    }
  }

  const storage = options?.storage ?? memoryStorage()
  const linkPattern = options?.linkPattern ?? DEFAULT_LINK_PATTERN

  // Internal state
  const pages = new Map<string, WikiPage>()
  const linkIndex = new Map<string, Set<string>>() // pageId -> set of link texts
  const backlinkIndex = new Map<string, Set<string>>() // targetId -> set of source pageIds
  const listeners = new Set<WikiEventCallback>()
  let nextFallbackId = 1

  // Helper: Slugify title to ID
  function slugify(title: string): string {
    const normalized = title
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^\p{L}\p{N}\s-]/gu, '') // Remove special chars but keep letters, numbers, spaces, hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Collapse multiple hyphens
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens

    return normalized || `page-${nextFallbackId++}`
  }

  // Helper: Generate unique ID
  function generateUniqueId(baseId: string): string {
    if (!pages.has(baseId)) {
      return baseId
    }

    let counter = 2
    while (pages.has(`${baseId}-${counter}`)) {
      counter++
    }
    return `${baseId}-${counter}`
  }

  // Helper: Validate page data
  function validatePageData(data: CreatePageData | UpdatePageData, isUpdate = false): void {
    if ('title' in data && data.title !== undefined) {
      if (data.title === null) {
        throw new Error('Title is required')
      }
      if (typeof data.title !== 'string') {
        throw new Error('Title is required')
      }
      if (data.title.trim() === '') {
        throw new Error('Title cannot be empty')
      }
    } else if (!isUpdate) {
      throw new Error('Title is required')
    }

    if ('tags' in data && data.tags !== undefined) {
      if (!Array.isArray(data.tags)) {
        throw new TypeError('Tags must be an array')
      }
      for (const tag of data.tags) {
        if (typeof tag !== 'string' || tag.trim() === '') {
          throw new TypeError('Each tag must be a non-empty string')
        }
      }
    }

    if ('type' in data && data.type !== undefined && data.type !== null) {
      if (typeof data.type !== 'string') {
        throw new TypeError('Type must be a string')
      }
    }
  }

  // Helper: Extract and index links
  function indexPageLinks(pageId: string, content: string): void {
    const links = extractLinks(content, linkPattern)
    const linkSet = new Set(links)
    linkIndex.set(pageId, linkSet)

    // Update backlink index
    for (const linkText of links) {
      const targetId = slugify(linkText)
      if (!backlinkIndex.has(targetId)) {
        backlinkIndex.set(targetId, new Set())
      }
      backlinkIndex.get(targetId)!.add(pageId)
    }
  }

  // Helper: Remove page from indexes
  function removePageFromIndexes(pageId: string): void {
    // Remove from backlink index
    const links = linkIndex.get(pageId) ?? new Set()
    for (const linkText of links) {
      const targetId = slugify(linkText)
      backlinkIndex.get(targetId)?.delete(pageId)
      if (backlinkIndex.get(targetId)?.size === 0) {
        backlinkIndex.delete(targetId)
      }
    }

    // Remove from link index
    linkIndex.delete(pageId)

    // Remove this page from backlinkIndex as a target
    backlinkIndex.delete(pageId)
  }

  // Helper: Emit event
  function emitEvent(event: WikiEvent): void {
    for (const listener of listeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('Subscriber error:', error)
      }
    }
  }

  // API Implementation
  const wiki: Wiki = {
    async createPage(data: CreatePageData): Promise<WikiPage> {
      validatePageData(data)

      const title = data.title
      const content = data.content ?? ''
      let id: string

      if (data.id) {
        if (pages.has(data.id)) {
          throw new Error(`Page with id '${data.id}' already exists`)
        }
        id = data.id
      } else {
        const baseId = slugify(title)
        id = generateUniqueId(baseId)
      }

      const now = new Date()
      const page: WikiPage = {
        id,
        title,
        content,
        type: data.type,
        tags: data.tags,
        created: now,
        modified: now,
      }

      pages.set(id, page)
      indexPageLinks(id, content)
      await storage.save(page)

      emitEvent({ type: 'create', page })

      return { ...page }
    },

    getPage(id: string): WikiPage | undefined {
      if (!id || typeof id !== 'string') {
        return undefined
      }
      const page = pages.get(id)
      return page ? { ...page } : undefined
    },

    getPageByTitle(title: string, options?: GetPageByTitleOptions): WikiPage | undefined {
      if (!title || typeof title !== 'string') {
        return undefined
      }

      if (options?.ignoreCase) {
        const lowerTitle = title.toLowerCase()
        for (const page of pages.values()) {
          if (page.title.toLowerCase() === lowerTitle) {
            return { ...page }
          }
        }
        return undefined
      }

      for (const page of pages.values()) {
        if (page.title === title) {
          return { ...page }
        }
      }
      return undefined
    },

    async updatePage(id: string, data: UpdatePageData): Promise<WikiPage> {
      const page = pages.get(id)
      if (!page) {
        throw new Error(`Page '${id}' not found`)
      }

      validatePageData(data, true)

      const previous = { ...page }
      const contentChanged = data.content !== undefined && data.content !== page.content

      // Update fields
      if (data.title !== undefined) page.title = data.title
      if (data.content !== undefined) page.content = data.content
      if ('type' in data) page.type = data.type
      if ('tags' in data) page.tags = data.tags
      page.modified = new Date()

      // Re-index links if content changed
      if (contentChanged) {
        removePageFromIndexes(id)
        indexPageLinks(id, page.content)
      }

      pages.set(id, page)
      await storage.save(page)

      emitEvent({ type: 'update', page: { ...page }, previous })

      return { ...page }
    },

    async deletePage(id: string, options?: DeletePageOptions): Promise<void> {
      const page = pages.get(id)
      if (!page) {
        throw new Error(`Page '${id}' not found`)
      }

      const deletedPage = { ...page }

      pages.delete(id)
      if (options?.updateLinks !== false) {
        removePageFromIndexes(id)
      }
      await storage.delete(id)

      emitEvent({ type: 'delete', page: deletedPage })
    },

    async renamePage(id: string, newTitle: string, options?: RenamePageOptions): Promise<WikiPage> {
      if (!newTitle || newTitle.trim() === '') {
        throw new Error('Title cannot be empty')
      }

      const page = pages.get(id)
      if (!page) {
        throw new Error(`Page '${id}' not found`)
      }

      const previousTitle = page.title
      page.title = newTitle
      page.modified = new Date()

      if (options?.updateId) {
        const newId = slugify(newTitle)
        if (newId !== id) {
          if (pages.has(newId)) {
            throw new Error(`Page with id '${newId}' already exists`)
          }

          // Update all pages that link to this page
          for (const [pageId, links] of linkIndex.entries()) {
            const sourcePage = pages.get(pageId)
            if (sourcePage && links.has(previousTitle)) {
              sourcePage.content = sourcePage.content.replace(
                new RegExp(`\\[\\[${escapeRegex(previousTitle)}(\\|[^\\]]+)?\\]\\]`, 'g'),
                `[[${newTitle}$1]]`
              )
              await storage.save(sourcePage)
            }
          }

          // Move page to new ID
          pages.delete(id)
          page.id = newId
          pages.set(newId, page)

          // Update indexes
          const oldLinks = linkIndex.get(id)
          if (oldLinks) {
            linkIndex.delete(id)
            linkIndex.set(newId, oldLinks)
          }

          const oldBacklinks = backlinkIndex.get(id)
          if (oldBacklinks) {
            backlinkIndex.delete(id)
            backlinkIndex.set(newId, oldBacklinks)
          }

          // Update backlink index references
          for (const links of linkIndex.values()) {
            const linkArray = Array.from(links)
            for (const linkText of linkArray) {
              if (slugify(linkText) === id) {
                links.delete(linkText)
                links.add(newTitle)
              }
            }
          }

          for (const backlinks of backlinkIndex.values()) {
            if (backlinks.has(id)) {
              backlinks.delete(id)
              backlinks.add(newId)
            }
          }
        }
      }

      await storage.save(page)
      emitEvent({ type: 'rename', page: { ...page }, previousTitle })

      return { ...page }
    },

    getLinks(id: string): string[] {
      const links = linkIndex.get(id)
      return links ? Array.from(links) : []
    },

    getBacklinks(id: string): string[] {
      const backlinks = backlinkIndex.get(id)
      return backlinks ? Array.from(backlinks) : []
    },

    getLinkedPages(id: string): WikiPage[] {
      const links = wiki.getLinks(id)
      const linkedPages: WikiPage[] = []

      for (const linkText of links) {
        const targetId = slugify(linkText)
        const page = pages.get(targetId)
        if (page) {
          linkedPages.push({ ...page })
        }
      }

      return linkedPages
    },

    getBacklinkPages(id: string): WikiPage[] {
      const backlinks = wiki.getBacklinks(id)
      return backlinks.map(bid => pages.get(bid)).filter((p): p is WikiPage => !!p).map(p => ({ ...p }))
    },

    resolveLink(linkText: string): string {
      return slugify(linkText)
    },

    resolveLinkToPage(linkText: string): WikiPage | undefined {
      const id = wiki.resolveLink(linkText)
      return wiki.getPage(id)
    },

    getDeadLinks(): DeadLink[] {
      const deadLinks: DeadLink[] = []

      for (const [sourceId, links] of linkIndex.entries()) {
        for (const linkText of links) {
          const targetId = slugify(linkText)
          if (!pages.has(targetId)) {
            deadLinks.push({ source: sourceId, target: linkText })
          }
        }
      }

      return deadLinks
    },

    getDeadLinksForPage(id: string): string[] {
      const links = linkIndex.get(id)
      if (!links) return []

      const deadLinks: string[] = []
      for (const linkText of links) {
        const targetId = slugify(linkText)
        if (!pages.has(targetId)) {
          deadLinks.push(linkText)
        }
      }

      return deadLinks
    },

    getOrphans(): WikiPage[] {
      const orphans: WikiPage[] = []

      for (const page of pages.values()) {
        const backlinks = backlinkIndex.get(page.id)
        if (!backlinks || backlinks.size === 0) {
          orphans.push({ ...page })
        }
      }

      return orphans
    },

    getGraph(): Graph {
      const graph: Graph = {}

      for (const page of pages.values()) {
        const links = linkIndex.get(page.id) ?? new Set()
        graph[page.id] = Array.from(links).map(linkText => slugify(linkText))
      }

      return graph
    },

    getConnectedPages(id: string, depth = 1): WikiPage[] {
      const page = pages.get(id)
      if (!page) return []

      const visited = new Set<string>()
      const queue: Array<{ id: string; currentDepth: number }> = [{ id, currentDepth: 0 }]
      const connectedIds = new Set<string>()

      while (queue.length > 0) {
        const current = queue.shift()!
        if (visited.has(current.id)) continue
        visited.add(current.id)
        connectedIds.add(current.id)

        if (current.currentDepth < depth) {
          // Add outgoing links
          const links = wiki.getLinks(current.id)
          for (const linkText of links) {
            const targetId = slugify(linkText)
            if (!visited.has(targetId) && pages.has(targetId)) {
              queue.push({ id: targetId, currentDepth: current.currentDepth + 1 })
            }
          }

          // Add incoming links
          const backlinks = wiki.getBacklinks(current.id)
          for (const backlinkId of backlinks) {
            if (!visited.has(backlinkId)) {
              queue.push({ id: backlinkId, currentDepth: current.currentDepth + 1 })
            }
          }
        }
      }

      return Array.from(connectedIds)
        .map(pid => pages.get(pid))
        .filter((p): p is WikiPage => !!p)
        .map(p => ({ ...p }))
    },

    listPages(options?: ListPagesOptions): WikiPage[] {
      let result = Array.from(pages.values())

      // Filter by type
      if (options?.type) {
        result = result.filter(p => p.type === options.type)
      }

      // Filter by tags
      if (options?.tags && options.tags.length > 0) {
        result = result.filter(p => {
          if (!p.tags) return false
          return options.tags!.some(tag => p.tags!.includes(tag))
        })
      }

      // Sort
      const sortField = options?.sort ?? 'created'
      const order = options?.order ?? 'desc'

      result.sort((a, b) => {
        let compareResult = 0

        if (sortField === 'title') {
          compareResult = a.title.localeCompare(b.title)
        } else if (sortField === 'created') {
          compareResult = a.created.getTime() - b.created.getTime()
        } else if (sortField === 'modified') {
          compareResult = a.modified.getTime() - b.modified.getTime()
        }

        return order === 'asc' ? compareResult : -compareResult
      })

      // Pagination
      const offset = options?.offset ?? 0
      const limit = options?.limit

      if (limit !== undefined && limit === 0) {
        return []
      }

      if (offset > 0 || limit !== undefined) {
        const start = offset
        const end = limit !== undefined ? start + limit : undefined
        result = result.slice(start, end)
      }

      return result.map(p => ({ ...p }))
    },

    search(query: string, options?: SearchOptions): WikiPage[] {
      if (!query || query.trim() === '') {
        return []
      }

      const normalizedQuery = query.trim().toLowerCase()
      const fields = options?.fields ?? ['title', 'content']
      const results: Array<{ page: WikiPage; score: number }> = []

      for (const page of pages.values()) {
        if (options?.type && page.type !== options.type) {
          continue
        }

        let score = 0

        // Search title
        if (fields.includes('title')) {
          const titleLower = page.title.toLowerCase()
          if (titleLower === normalizedQuery) {
            score += 100
          } else if (titleLower.includes(normalizedQuery)) {
            score += 50
          }
        }

        // Search content
        if (fields.includes('content')) {
          const contentLower = page.content.toLowerCase()
          if (contentLower.includes(normalizedQuery)) {
            score += 10
          }
        }

        // Search tags
        if (fields.includes('tags') && page.tags) {
          for (const tag of page.tags) {
            if (tag.toLowerCase().includes(normalizedQuery)) {
              score += 20
            }
          }
        }

        if (score > 0) {
          results.push({ page: { ...page }, score })
        }
      }

      // Sort by score descending
      results.sort((a, b) => b.score - a.score)

      // Apply limit
      const limited = options?.limit ? results.slice(0, options.limit) : results

      return limited.map(r => r.page)
    },

    getTags(): string[] {
      const tags = new Set<string>()

      for (const page of pages.values()) {
        if (page.tags) {
          for (const tag of page.tags) {
            tags.add(tag)
          }
        }
      }

      return Array.from(tags).sort()
    },

    getPagesByTag(tag: string): WikiPage[] {
      const result: WikiPage[] = []

      for (const page of pages.values()) {
        if (page.tags?.includes(tag)) {
          result.push({ ...page })
        }
      }

      return result
    },

    getTypes(): string[] {
      const types = new Set<string>()

      for (const page of pages.values()) {
        if (page.type) {
          types.add(page.type)
        }
      }

      return Array.from(types).sort()
    },

    getPagesByType(type: string): WikiPage[] {
      const result: WikiPage[] = []

      for (const page of pages.values()) {
        if (page.type === type) {
          result.push({ ...page })
        }
      }

      return result
    },

    export(): WikiPage[] {
      return Array.from(pages.values()).map(p => ({ ...p }))
    },

    async import(pagesData: WikiPage[], options?: ImportOptions): Promise<number> {
      if (!Array.isArray(pagesData)) {
        throw new Error('Pages must be an array')
      }

      // Validate all pages first
      for (const pageData of pagesData) {
        if (!pageData.id) {
          throw new Error('Each page must have an id field')
        }
        if (!pageData.title) {
          throw new Error('Each page must have a title field')
        }
      }

      const mode = options?.mode ?? 'replace'
      const emitEvents = options?.emitEvents ?? false

      // Clear existing pages if replace mode
      if (mode === 'replace') {
        pages.clear()
        linkIndex.clear()
        backlinkIndex.clear()
      }

      let importCount = 0

      for (const pageData of pagesData) {
        // Skip if mode is 'skip' and page exists
        if (mode === 'skip' && pages.has(pageData.id)) {
          continue
        }

        // Normalize dates
        const page: WikiPage = {
          ...pageData,
          created: pageData.created instanceof Date ? pageData.created : new Date(pageData.created),
          modified:
            pageData.modified instanceof Date ? pageData.modified : new Date(pageData.modified),
        }

        pages.set(page.id, page)
        indexPageLinks(page.id, page.content)
        await storage.save(page)
        importCount++

        if (emitEvents) {
          emitEvent({ type: 'create', page: { ...page } })
        }
      }

      return importCount
    },

    toJSON(): string {
      const data = wiki.export()
      return JSON.stringify(data)
    },

    on(_event: string, callback: WikiEventCallback): UnsubscribeFunction {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    },

    onChange(callback: WikiEventCallback): UnsubscribeFunction {
      return wiki.on('change', callback)
    },
  }

  return wiki
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
