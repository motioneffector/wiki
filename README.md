# @motioneffector/wiki

A TypeScript library for creating and managing interconnected knowledge bases with bidirectional linking. Perfect for building wikis, personal knowledge management systems, worldbuilding tools, and documentation platforms.

[![npm version](https://img.shields.io/npm/v/@motioneffector/wiki.svg)](https://www.npmjs.com/package/@motioneffector/wiki)
[![license](https://img.shields.io/npm/l/@motioneffector/wiki.svg)](https://github.com/motioneffector/wiki/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## Installation

```bash
npm install @motioneffector/wiki
```

## Quick Start

```typescript
import { createWiki } from '@motioneffector/wiki'

const wiki = createWiki()

// Create interconnected pages
await wiki.createPage({
  title: 'Kingdom of Aldoria',
  type: 'place',
  content: 'Founded by [[King Aldric I]] after the [[Battle of Five Rivers]].'
})

await wiki.createPage({
  title: 'King Aldric I',
  type: 'person',
  content: 'Founder of the [[Kingdom of Aldoria]].'
})

// Automatic bidirectional linking
const backlinks = wiki.getBacklinks('kingdom-of-aldoria')
// Returns: ['king-aldric-i']

// Find pages that need to be created
const deadLinks = wiki.getDeadLinks()
// Returns: [{ source: 'kingdom-of-aldoria', target: 'Battle of Five Rivers' }]
```

## Features

- **Bidirectional Linking** - Links are tracked in both directions automatically
- **Dead Link Detection** - Find broken links to non-existent pages
- **Orphan Detection** - Identify pages with no incoming links
- **Full-Text Search** - Search across titles, content, and tags with relevance ranking
- **Graph Traversal** - Navigate connections between pages
- **Page Types & Tags** - Organize pages with flexible metadata
- **Link Extraction** - Automatic parsing of `[[wiki links]]` from content
- **Storage Agnostic** - Bring your own persistence layer
- **Full TypeScript Support** - Complete type definitions included
- **Zero Dependencies** - Lightweight and focused
- **Tree-Shakeable** - ESM build for optimal bundle size

## Core Concepts

### Pages

Pages are the fundamental unit of a wiki:

```typescript
interface WikiPage {
  id: string              // Auto-generated slug from title
  title: string           // Display title
  content: string         // Markdown with [[wiki links]]
  type?: string           // Optional category: 'person', 'place', 'event', etc.
  tags?: string[]         // Optional tags for organization
  created: Date           // Creation timestamp
  modified: Date          // Last modification timestamp
}
```

### Wiki Links

Link pages together using double-bracket syntax:

```markdown
The [[Kingdom of Aldoria]] was founded by [[King Aldric I]]
after the [[Battle of Five Rivers]].

You can also use display text: [[Kingdom of Aldoria|the kingdom]].
```

Links inside code blocks (` ``` ` or `` ` ``) are ignored.

### Link Resolution

Links are resolved by normalizing the link text to an ID:
- `[[Kingdom of Aldoria]]` → `kingdom-of-aldoria`
- Case-insensitive: `[[KINGDOM]]` matches `[[kingdom]]`
- Whitespace is trimmed and collapsed

## API Reference

### `createWiki(options?)`

Creates a new wiki instance.

**Options:**
- `storage` - Storage adapter for persistence (default: in-memory)
- `linkPattern` - Custom regex for link syntax (default: `\[\[([^\]|]+)(?:\|[^\]]+)?\]\]`)

**Returns:** `Wiki`

### `wiki.createPage(data)`

Creates a new page.

```typescript
const page = await wiki.createPage({
  title: 'Page Title',
  content: 'Content with [[links]]',
  type: 'person',           // optional
  tags: ['important'],      // optional
  id: 'custom-id'          // optional, auto-generated if omitted
})
```

**Validation:**
- Title is required and cannot be empty
- Duplicate IDs throw an error
- Auto-generates unique IDs if slug conflicts exist

### `wiki.getPage(id)`

Retrieves a page by ID.

```typescript
const page = wiki.getPage('king-aldric-i')
```

**Returns:** `WikiPage | undefined`

### `wiki.getPageByTitle(title, options?)`

Retrieves a page by title.

```typescript
const page = wiki.getPageByTitle('King Aldric I')
const pageIgnoreCase = wiki.getPageByTitle('king aldric i', { ignoreCase: true })
```

**Options:**
- `ignoreCase` - Case-insensitive matching (default: `false`)

**Returns:** `WikiPage | undefined`

### `wiki.updatePage(id, data)`

Updates an existing page.

```typescript
await wiki.updatePage('page-id', {
  content: 'New content with [[new links]]',
  tags: ['updated']
})
```

Links are automatically re-extracted and backlinks updated.

**Returns:** `Promise<WikiPage>`

### `wiki.renamePage(id, newTitle, options?)`

Renames a page.

```typescript
await wiki.renamePage('old-id', 'New Title')

// Update ID and fix all incoming links
await wiki.renamePage('old-id', 'New Title', { updateId: true })
```

**Options:**
- `updateId` - Generate new ID from title and update all links (default: `false`)

**Returns:** `Promise<WikiPage>`

### `wiki.deletePage(id, options?)`

Deletes a page.

```typescript
await wiki.deletePage('page-id')
```

**Options:**
- `updateLinks` - Update backlink index (default: `true`)

**Returns:** `Promise<void>`

### `wiki.listPages(options?)`

Lists all pages with optional filtering, sorting, and pagination.

```typescript
const pages = wiki.listPages({
  type: 'person',
  tags: ['royalty'],
  sort: 'title',
  order: 'asc',
  limit: 10,
  offset: 0
})
```

**Options:**
- `type` - Filter by page type
- `tags` - Filter by tags (OR logic)
- `sort` - Sort field: `'title'`, `'created'`, `'modified'` (default: `'created'`)
- `order` - Sort order: `'asc'`, `'desc'` (default: `'desc'`)
- `limit` - Maximum results
- `offset` - Skip N results

**Returns:** `WikiPage[]`

### `wiki.search(query, options?)`

Full-text search with relevance ranking.

```typescript
const results = wiki.search('aldric', {
  fields: ['title', 'content'],
  type: 'person',
  limit: 10
})
```

**Options:**
- `fields` - Fields to search: `'title'`, `'content'`, `'tags'` (default: `['title', 'content']`)
- `type` - Filter by page type
- `limit` - Maximum results

**Ranking:**
- Exact title matches rank highest
- Title matches rank higher than content matches
- Multiple word matches rank higher

**Returns:** `WikiPage[]`

### `wiki.getLinks(id)`

Gets all outgoing links from a page.

```typescript
const links = wiki.getLinks('page-id')
// Returns: ['Target Page 1', 'Target Page 2']
```

**Returns:** `string[]` (link text as written, deduplicated)

### `wiki.getBacklinks(id)`

Gets all incoming links to a page.

```typescript
const backlinks = wiki.getBacklinks('page-id')
// Returns: ['source-id-1', 'source-id-2']
```

**Returns:** `string[]` (page IDs)

### `wiki.getLinkedPages(id)`

Gets resolved outgoing links (only existing pages).

```typescript
const pages = wiki.getLinkedPages('page-id')
```

**Returns:** `WikiPage[]`

### `wiki.getBacklinkPages(id)`

Gets resolved incoming links (only existing pages).

```typescript
const pages = wiki.getBacklinkPages('page-id')
```

**Returns:** `WikiPage[]`

### `wiki.resolveLink(linkText)`

Normalizes link text to a page ID without checking if the page exists.

```typescript
const id = wiki.resolveLink('Kingdom of Aldoria')
// Returns: 'kingdom-of-aldoria'
```

**Returns:** `string`

### `wiki.resolveLinkToPage(linkText)`

Resolves link text to a page (if it exists).

```typescript
const page = wiki.resolveLinkToPage('Kingdom of Aldoria')
// Returns: WikiPage | undefined
```

Equivalent to: `wiki.getPage(wiki.resolveLink(linkText))`

### `wiki.getOrphans()`

Gets pages with no incoming links.

```typescript
const orphans = wiki.getOrphans()
```

**Returns:** `WikiPage[]`

### `wiki.getDeadLinks()`

Gets all links pointing to non-existent pages.

```typescript
const deadLinks = wiki.getDeadLinks()
// Returns: [
//   { source: 'page-id', target: 'Missing Page' },
//   { source: 'page-id', target: 'Another Missing Page' }
// ]
```

**Returns:** `{ source: string, target: string }[]`

### `wiki.getDeadLinksForPage(id)`

Gets dead links from a specific page.

```typescript
const deadLinks = wiki.getDeadLinksForPage('page-id')
// Returns: ['Missing Page 1', 'Missing Page 2']
```

**Returns:** `string[]`

### `wiki.getGraph()`

Gets the complete link graph as an adjacency list.

```typescript
const graph = wiki.getGraph()
// Returns: {
//   'page-1': ['page-2', 'page-3'],
//   'page-2': ['page-1'],
//   'page-3': []
// }
```

**Returns:** `Record<string, string[]>`

### `wiki.getConnectedPages(id, depth?)`

Gets all pages connected within N links.

```typescript
const connected = wiki.getConnectedPages('page-id', 2)
```

**Parameters:**
- `depth` - Maximum link distance (default: `1`)

**Returns:** `WikiPage[]` (includes both outgoing and incoming connections)

### `wiki.getTags()`

Gets all unique tags across all pages.

```typescript
const tags = wiki.getTags()
// Returns: ['magic', 'royalty', 'warfare'] (sorted alphabetically)
```

**Returns:** `string[]`

### `wiki.getPagesByTag(tag)`

Gets all pages with a specific tag.

```typescript
const pages = wiki.getPagesByTag('royalty')
```

**Returns:** `WikiPage[]`

### `wiki.getTypes()`

Gets all unique page types.

```typescript
const types = wiki.getTypes()
// Returns: ['person', 'place', 'event'] (sorted alphabetically)
```

**Returns:** `string[]`

### `wiki.getPagesByType(type)`

Gets all pages of a specific type.

```typescript
const pages = wiki.getPagesByType('person')
```

**Returns:** `WikiPage[]`

### `wiki.export()`

Exports all pages.

```typescript
const pages = wiki.export()
```

**Returns:** `WikiPage[]`

### `wiki.import(pages, options?)`

Imports pages.

```typescript
const count = await wiki.import(pages, {
  mode: 'replace',
  emitEvents: false
})
```

**Options:**
- `mode` - Import mode: `'replace'` (default), `'merge'`, `'skip'`
- `emitEvents` - Emit change events (default: `false`)

**Returns:** `Promise<number>` (number of imported pages)

### `wiki.toJSON()`

Serializes the wiki to JSON.

```typescript
const json = wiki.toJSON()
```

**Returns:** `string`

### `wiki.onChange(callback)`

Subscribes to wiki changes.

```typescript
const unsubscribe = wiki.onChange((event) => {
  console.log(event.type) // 'create' | 'update' | 'delete' | 'rename'
  console.log(event.page)
})

// Later
unsubscribe()
```

**Event Types:**
- `create`: `{ type: 'create', page: WikiPage }`
- `update`: `{ type: 'update', page: WikiPage, previous: WikiPage }`
- `delete`: `{ type: 'delete', page: WikiPage }`
- `rename`: `{ type: 'rename', page: WikiPage, previousTitle: string }`

**Returns:** `() => void` (unsubscribe function)

## Storage Adapters

By default, wikis use in-memory storage. For persistence, implement the `WikiStorage` interface:

```typescript
interface WikiStorage {
  save(page: WikiPage): Promise<void>
  load(id: string): Promise<WikiPage | null>
  delete(id: string): Promise<void>
  list(): Promise<WikiPage[]>
}
```

### Built-in Adapters

#### Memory Storage (Default)

```typescript
import { memoryStorage, createWiki } from '@motioneffector/wiki'

const wiki = createWiki({ storage: memoryStorage() })
```

Data is lost when the process exits.

#### Custom Storage Example

```typescript
// IndexedDB adapter
const idbStorage: WikiStorage = {
  async save(page) {
    const db = await openDB('wiki')
    await db.put('pages', page)
  },
  async load(id) {
    const db = await openDB('wiki')
    return await db.get('pages', id)
  },
  async delete(id) {
    const db = await openDB('wiki')
    await db.delete('pages', id)
  },
  async list() {
    const db = await openDB('wiki')
    return await db.getAll('pages')
  }
}

const wiki = createWiki({ storage: idbStorage })
```

## Error Handling

```typescript
import { ValidationError } from '@motioneffector/wiki'

try {
  await wiki.createPage({ title: '' })
} catch (e) {
  if (e instanceof ValidationError) {
    console.error('Invalid page data:', e.message)
  }
}
```

**Error Types:**
- `ValidationError` - Invalid page data
- `NotFoundError` - Page not found
- Standard JavaScript errors for other cases

## Demo

Try the [interactive demo](https://motioneffector.github.io/wiki/demo.html) to see the library in action.

## Use Cases

- **Worldbuilding** - Track characters, locations, events and their relationships
- **Personal Knowledge Management** - Build a Zettelkasten-style note system
- **Documentation** - Create interconnected technical documentation
- **Game Design** - Manage design documents with linked concepts
- **Research** - Organize literature notes and citations

## Browser Support

Works in all modern browsers supporting ES2022+. For older browsers, transpile as needed.

## License

MIT © [motioneffector](https://github.com/motioneffector)
