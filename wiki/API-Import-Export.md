# Import/Export API

Functions for exporting and importing wiki data.

---

## `wiki.export()`

Exports all pages as an array.

**Signature:**

```typescript
export(): WikiPage[]
```

**Returns:** `WikiPage[]` — Copy of all pages with Date objects preserved

**Example:**

```typescript
await wiki.createPage({ title: 'Home', content: 'Welcome' })
await wiki.createPage({ title: 'About', content: 'Info' })

const pages = wiki.export()
console.log(pages.length) // 2

// Dates are Date objects
console.log(pages[0].created instanceof Date) // true

// Returned array is a copy - modifying it doesn't affect wiki
pages.pop()
console.log(wiki.listPages().length) // Still 2
```

---

## `wiki.import()`

Imports pages into the wiki.

**Signature:**

```typescript
import(pages: WikiPage[], options?: ImportOptions): Promise<number>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `pages` | `WikiPage[]` | Yes | Array of pages to import |
| `options` | `ImportOptions` | No | Import options |

**ImportOptions:**

| Property | Type | Description |
|----------|------|-------------|
| `mode` | `'replace' \| 'merge' \| 'skip'` | Import strategy. Default: `'replace'` |
| `emitEvents` | `boolean` | Fire events for each import. Default: `false` |

**Import Modes:**

| Mode | Behavior |
|------|----------|
| `replace` | Clear wiki first, then import all pages |
| `merge` | Keep existing pages, add new ones, overwrite same IDs |
| `skip` | Keep existing pages, only add pages with new IDs |

**Returns:** `Promise<number>` — Count of pages imported

**Example:**

```typescript
import { createWiki, type WikiPage } from '@motioneffector/wiki'

const pages: WikiPage[] = [
  {
    id: 'home',
    title: 'Home',
    content: 'Welcome',
    created: new Date(),
    modified: new Date()
  }
]

// Replace mode (default): clears existing pages
const wiki = createWiki()
await wiki.import(pages, { mode: 'replace' })

// Merge mode: keeps existing, overwrites conflicts
await wiki.import(pages, { mode: 'merge' })

// Skip mode: keeps existing, only adds new IDs
await wiki.import(pages, { mode: 'skip' })

// With events (for reactive updates)
wiki.onChange(e => console.log('Imported:', e.page.title))
await wiki.import(pages, { emitEvents: true })
```

**Throws:**

- `Error` — If pages is not an array
- `Error` — If any page is missing `id` field
- `Error` — If any page is missing `title` field

**Notes:**

- Validates all pages before importing any (atomic)
- Automatically converts ISO date strings to Date objects
- Rebuilds link indexes for all imported pages

---

## `wiki.toJSON()`

Exports the wiki as a JSON string.

**Signature:**

```typescript
toJSON(): string
```

**Returns:** `string` — JSON representation of all pages

**Example:**

```typescript
await wiki.createPage({ title: 'Home', content: 'Welcome' })

const json = wiki.toJSON()
console.log(json)
// [{"id":"home","title":"Home","content":"Welcome","created":"2024-01-01T00:00:00.000Z","modified":"2024-01-01T00:00:00.000Z"}]

// Save to file
await fs.writeFile('backup.json', json)

// Restore from file
const data = await fs.readFile('backup.json', 'utf-8')
const pages = JSON.parse(data)
await newWiki.import(pages, { mode: 'replace' })
```

Date objects are serialized as ISO strings. The `import()` method automatically converts them back to Date objects.
