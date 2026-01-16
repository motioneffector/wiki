# Storage

The wiki keeps pages in memory for fast access but delegates persistence to a storage adapter. The default `memoryStorage()` stores everything in RAM (no persistence). You can plug in any backend by implementing the `WikiStorage` interface.

## How It Works

```
Your App → Wiki Instance → Memory (fast lookups, link indexes)
                 ↓
           Storage Adapter → Your Backend (persistence)
```

The wiki maintains in-memory data structures for:
- All pages (for instant lookups)
- Link index (for fast `getLinks()`)
- Backlink index (for fast `getBacklinks()`)

The storage adapter handles persistence. Every `createPage`, `updatePage`, and `deletePage` call writes through to storage.

## Basic Usage

```typescript
import { createWiki, memoryStorage } from '@motioneffector/wiki'

// Default: in-memory storage (data lost on process end)
const wiki = createWiki()

// Explicit: same as default
const wiki = createWiki({ storage: memoryStorage() })
```

All wiki methods that modify data are async because storage operations might be async (database writes, file I/O, network calls).

## Key Points

- **Default storage is `memoryStorage()`** - Great for testing and prototyping, but data disappears when the process ends.

- **Storage is async** - All write operations (`createPage`, `updatePage`, `deletePage`, `import`) return Promises.

- **Link indexes are always in-memory** - Even with persistent storage, links and backlinks are indexed in RAM for speed. On startup, you'd typically load all pages via `import()` to rebuild indexes.

- **Storage doesn't need to understand links** - It just stores and retrieves page objects. Link extraction and indexing happens in the wiki layer.

## Examples

### Custom Storage Adapter

The `WikiStorage` interface has four methods:

```typescript
interface WikiStorage {
  save(page: WikiPage): Promise<void>
  load(id: string): Promise<WikiPage | null>
  delete(id: string): Promise<void>
  list(): Promise<WikiPage[]>
}
```

Here's a simple file-based implementation:

```typescript
import { createWiki, type WikiStorage, type WikiPage } from '@motioneffector/wiki'
import { readFile, writeFile, unlink, readdir } from 'fs/promises'
import { join } from 'path'

function fileStorage(directory: string): WikiStorage {
  return {
    async save(page: WikiPage) {
      const path = join(directory, `${page.id}.json`)
      await writeFile(path, JSON.stringify(page))
    },

    async load(id: string) {
      try {
        const path = join(directory, `${id}.json`)
        const data = await readFile(path, 'utf-8')
        const page = JSON.parse(data)
        // Restore Date objects
        page.created = new Date(page.created)
        page.modified = new Date(page.modified)
        return page
      } catch {
        return null
      }
    },

    async delete(id: string) {
      const path = join(directory, `${id}.json`)
      await unlink(path).catch(() => {})
    },

    async list() {
      const files = await readdir(directory)
      const pages: WikiPage[] = []
      for (const file of files) {
        if (file.endsWith('.json')) {
          const id = file.slice(0, -5)
          const page = await this.load(id)
          if (page) pages.push(page)
        }
      }
      return pages
    }
  }
}

// Usage
const wiki = createWiki({ storage: fileStorage('./wiki-data') })
```

### Loading Existing Data

When using persistent storage, load all pages at startup to rebuild the in-memory indexes:

```typescript
async function initWiki(storage: WikiStorage) {
  const wiki = createWiki({ storage })

  // Load all existing pages to rebuild link indexes
  const existingPages = await storage.list()
  if (existingPages.length > 0) {
    await wiki.import(existingPages, { mode: 'replace' })
  }

  return wiki
}
```

## Related

- **[Custom Storage Adapters](Guide-Custom-Storage-Adapters)** - Step-by-step guide to building adapters
- **[Storage API](API-Storage)** - Full interface reference
- **[Import & Export](Guide-Import-And-Export)** - Moving data between storage backends
