# Custom Storage Adapters

Build a storage adapter to persist your wiki to any backend - files, databases, cloud services, or browser storage. This guide shows how to implement the WikiStorage interface.

## Prerequisites

Before starting, you should:

- [Understand storage concepts](Concept-Storage)
- Be comfortable with async/await

## Overview

We'll build a storage adapter by:

1. Implementing the four required methods
2. Handling Date serialization
3. Connecting it to a wiki instance

## Step 1: Understand the Interface

The WikiStorage interface has four async methods:

```typescript
interface WikiStorage {
  save(page: WikiPage): Promise<void>
  load(id: string): Promise<WikiPage | null>
  delete(id: string): Promise<void>
  list(): Promise<WikiPage[]>
}
```

- `save` - Store or update a page
- `load` - Retrieve a page by ID, or null if not found
- `delete` - Remove a page
- `list` - Return all stored pages

## Step 2: Implement the Adapter

Here's a simple localStorage adapter for browsers:

```typescript
import { type WikiStorage, type WikiPage } from '@motioneffector/wiki'

function localStorageAdapter(prefix = 'wiki'): WikiStorage {
  const key = (id: string) => `${prefix}:${id}`
  const indexKey = `${prefix}:__index__`

  function getIndex(): string[] {
    const data = localStorage.getItem(indexKey)
    return data ? JSON.parse(data) : []
  }

  function setIndex(ids: string[]) {
    localStorage.setItem(indexKey, JSON.stringify(ids))
  }

  return {
    async save(page: WikiPage) {
      // Serialize with dates as ISO strings
      localStorage.setItem(key(page.id), JSON.stringify(page))

      // Update index
      const index = getIndex()
      if (!index.includes(page.id)) {
        index.push(page.id)
        setIndex(index)
      }
    },

    async load(id: string) {
      const data = localStorage.getItem(key(id))
      if (!data) return null

      const page = JSON.parse(data)
      // Restore Date objects
      page.created = new Date(page.created)
      page.modified = new Date(page.modified)
      return page
    },

    async delete(id: string) {
      localStorage.removeItem(key(id))

      // Update index
      const index = getIndex().filter(i => i !== id)
      setIndex(index)
    },

    async list() {
      const index = getIndex()
      const pages: WikiPage[] = []

      for (const id of index) {
        const page = await this.load(id)
        if (page) pages.push(page)
      }

      return pages
    }
  }
}
```

## Step 3: Connect to Wiki

Pass your adapter to `createWiki`:

```typescript
import { createWiki } from '@motioneffector/wiki'

const storage = localStorageAdapter('my-wiki')
const wiki = createWiki({ storage })

// Pages are now persisted to localStorage
await wiki.createPage({
  title: 'Home',
  content: 'Welcome!'
})

// Reload the page - data persists
const home = wiki.getPageByTitle('Home')
console.log(home?.content) // 'Welcome!'
```

## Complete Example

Here's a file-based adapter for Node.js:

```typescript
import { createWiki, type WikiStorage, type WikiPage } from '@motioneffector/wiki'
import { readFile, writeFile, unlink, readdir, mkdir } from 'fs/promises'
import { join } from 'path'

function fileStorage(directory: string): WikiStorage {
  // Ensure directory exists
  const ensureDir = async () => {
    try {
      await mkdir(directory, { recursive: true })
    } catch {
      // Directory already exists
    }
  }

  const filePath = (id: string) => join(directory, `${id}.json`)

  return {
    async save(page: WikiPage) {
      await ensureDir()
      const data = JSON.stringify(page, null, 2)
      await writeFile(filePath(page.id), data, 'utf-8')
    },

    async load(id: string) {
      try {
        const data = await readFile(filePath(id), 'utf-8')
        const page = JSON.parse(data)
        page.created = new Date(page.created)
        page.modified = new Date(page.modified)
        return page
      } catch {
        return null
      }
    },

    async delete(id: string) {
      try {
        await unlink(filePath(id))
      } catch {
        // File doesn't exist, that's fine
      }
    },

    async list() {
      await ensureDir()
      const files = await readdir(directory)
      const pages: WikiPage[] = []

      for (const file of files) {
        if (file.endsWith('.json')) {
          const id = file.slice(0, -5) // Remove .json
          const page = await this.load(id)
          if (page) pages.push(page)
        }
      }

      return pages
    }
  }
}

// Usage
async function main() {
  const storage = fileStorage('./wiki-data')
  const wiki = createWiki({ storage })

  // Load existing pages on startup
  const existing = await storage.list()
  if (existing.length > 0) {
    await wiki.import(existing, { mode: 'replace' })
    console.log(`Loaded ${existing.length} pages from disk`)
  }

  // Create a new page - automatically persisted
  await wiki.createPage({
    title: 'Hello World',
    content: 'This will be saved to ./wiki-data/hello-world.json'
  })
}

main()
```

## Variations

### IndexedDB Adapter (Browser)

```typescript
function indexedDBStorage(dbName = 'wiki'): WikiStorage {
  let db: IDBDatabase | null = null

  const getDB = async (): Promise<IDBDatabase> => {
    if (db) return db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        db = request.result
        resolve(db)
      }

      request.onupgradeneeded = () => {
        const database = request.result
        database.createObjectStore('pages', { keyPath: 'id' })
      }
    })
  }

  return {
    async save(page: WikiPage) {
      const database = await getDB()
      return new Promise((resolve, reject) => {
        const tx = database.transaction('pages', 'readwrite')
        const store = tx.objectStore('pages')
        const request = store.put({ ...page })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    },

    async load(id: string) {
      const database = await getDB()
      return new Promise((resolve, reject) => {
        const tx = database.transaction('pages', 'readonly')
        const store = tx.objectStore('pages')
        const request = store.get(id)
        request.onsuccess = () => {
          const page = request.result
          if (page) {
            page.created = new Date(page.created)
            page.modified = new Date(page.modified)
          }
          resolve(page ?? null)
        }
        request.onerror = () => reject(request.error)
      })
    },

    async delete(id: string) {
      const database = await getDB()
      return new Promise((resolve, reject) => {
        const tx = database.transaction('pages', 'readwrite')
        const store = tx.objectStore('pages')
        const request = store.delete(id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    },

    async list() {
      const database = await getDB()
      return new Promise((resolve, reject) => {
        const tx = database.transaction('pages', 'readonly')
        const store = tx.objectStore('pages')
        const request = store.getAll()
        request.onsuccess = () => {
          const pages = request.result.map((page: WikiPage) => ({
            ...page,
            created: new Date(page.created),
            modified: new Date(page.modified)
          }))
          resolve(pages)
        }
        request.onerror = () => reject(request.error)
      })
    }
  }
}
```

### REST API Adapter

```typescript
function restAPIStorage(baseUrl: string): WikiStorage {
  return {
    async save(page: WikiPage) {
      await fetch(`${baseUrl}/pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(page)
      })
    },

    async load(id: string) {
      const response = await fetch(`${baseUrl}/pages/${id}`)
      if (!response.ok) return null

      const page = await response.json()
      page.created = new Date(page.created)
      page.modified = new Date(page.modified)
      return page
    },

    async delete(id: string) {
      await fetch(`${baseUrl}/pages/${id}`, { method: 'DELETE' })
    },

    async list() {
      const response = await fetch(`${baseUrl}/pages`)
      const pages = await response.json()

      return pages.map((page: WikiPage) => ({
        ...page,
        created: new Date(page.created),
        modified: new Date(page.modified)
      }))
    }
  }
}
```

## Troubleshooting

### Dates Become Strings

**Symptom:** After loading from storage, `page.created` is a string.

**Cause:** JSON serialization converts Dates to strings.

**Solution:** Always convert dates back in `load()` and `list()`:
```typescript
page.created = new Date(page.created)
page.modified = new Date(page.modified)
```

### Storage Adapter Errors Silent

**Symptom:** Storage operations fail silently.

**Cause:** Wiki operations catch storage errors.

**Solution:** Add logging to your adapter:
```typescript
async save(page: WikiPage) {
  try {
    // ... save logic
  } catch (error) {
    console.error('Storage save failed:', error)
    throw error
  }
}
```

## See Also

- **[Storage](Concept-Storage)** - Storage concepts
- **[Import & Export](Guide-Import-And-Export)** - Loading data on startup
- **[Storage API](API-Storage)** - Interface reference
