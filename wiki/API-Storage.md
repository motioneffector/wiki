# Storage API

Storage adapter interface and built-in implementations.

---

## `memoryStorage()`

Creates an in-memory storage adapter (no persistence).

**Signature:**

```typescript
function memoryStorage(): WikiStorage
```

**Returns:** `WikiStorage` — An adapter that stores pages in memory

**Example:**

```typescript
import { createWiki, memoryStorage } from '@motioneffector/wiki'

// Explicit usage
const storage = memoryStorage()
const wiki = createWiki({ storage })

// This is the default, so equivalent to:
const wiki = createWiki()
```

Data stored in memory is lost when the process ends or the storage instance is garbage collected.

---

## `WikiStorage` Interface

Interface that custom storage adapters must implement.

```typescript
interface WikiStorage {
  save(page: WikiPage): Promise<void>
  load(id: string): Promise<WikiPage | null>
  delete(id: string): Promise<void>
  list(): Promise<WikiPage[]>
}
```

### `save()`

Stores or updates a page.

**Signature:**

```typescript
save(page: WikiPage): Promise<void>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `page` | `WikiPage` | The page to store |

Called by `createPage()`, `updatePage()`, `renamePage()`, and `import()`.

### `load()`

Retrieves a page by ID.

**Signature:**

```typescript
load(id: string): Promise<WikiPage | null>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `id` | `string` | The page ID to load |

**Returns:** The page if found, `null` otherwise.

### `delete()`

Removes a page.

**Signature:**

```typescript
delete(id: string): Promise<void>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `id` | `string` | The page ID to delete |

Should not throw if the page doesn't exist.

### `list()`

Returns all stored pages.

**Signature:**

```typescript
list(): Promise<WikiPage[]>
```

**Returns:** Array of all pages in storage.

Used by the wiki on startup (via `import()`) to rebuild link indexes.

---

## Implementing Custom Storage

### Basic Structure

```typescript
import { type WikiStorage, type WikiPage } from '@motioneffector/wiki'

function myStorage(): WikiStorage {
  return {
    async save(page: WikiPage) {
      // Store the page
    },

    async load(id: string) {
      // Return page or null
      return null
    },

    async delete(id: string) {
      // Remove page (no-op if missing)
    },

    async list() {
      // Return all pages
      return []
    }
  }
}
```

### Handling Dates

When serializing to JSON (files, databases, APIs), Date objects become strings. Convert them back when loading:

```typescript
async load(id: string) {
  const data = await fetchFromStorage(id)
  if (!data) return null

  return {
    ...data,
    created: new Date(data.created),
    modified: new Date(data.modified)
  }
}

async list() {
  const allData = await fetchAllFromStorage()

  return allData.map(data => ({
    ...data,
    created: new Date(data.created),
    modified: new Date(data.modified)
  }))
}
```

### Loading on Startup

The wiki doesn't automatically load from storage on creation. Load existing pages manually:

```typescript
async function initWiki(storage: WikiStorage) {
  const wiki = createWiki({ storage })

  // Load existing pages to rebuild link indexes
  const existing = await storage.list()
  if (existing.length > 0) {
    await wiki.import(existing, { mode: 'replace' })
  }

  return wiki
}
```

---

## Example Implementations

### localStorage (Browser)

```typescript
function localStorageAdapter(prefix = 'wiki'): WikiStorage {
  const key = (id: string) => `${prefix}:page:${id}`
  const indexKey = `${prefix}:index`

  return {
    async save(page) {
      localStorage.setItem(key(page.id), JSON.stringify(page))

      const index = JSON.parse(localStorage.getItem(indexKey) || '[]')
      if (!index.includes(page.id)) {
        index.push(page.id)
        localStorage.setItem(indexKey, JSON.stringify(index))
      }
    },

    async load(id) {
      const data = localStorage.getItem(key(id))
      if (!data) return null

      const page = JSON.parse(data)
      page.created = new Date(page.created)
      page.modified = new Date(page.modified)
      return page
    },

    async delete(id) {
      localStorage.removeItem(key(id))

      const index = JSON.parse(localStorage.getItem(indexKey) || '[]')
      const updated = index.filter((i: string) => i !== id)
      localStorage.setItem(indexKey, JSON.stringify(updated))
    },

    async list() {
      const index = JSON.parse(localStorage.getItem(indexKey) || '[]')
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

### File System (Node.js)

See [Custom Storage Adapters](Guide-Custom-Storage-Adapters) for a complete file-based implementation.
