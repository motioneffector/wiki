# Types Reference

TypeScript type definitions for the wiki library.

---

## `Wiki`

The main wiki interface returned by `createWiki()`.

```typescript
interface Wiki {
  // Page operations
  createPage(data: CreatePageData): Promise<WikiPage>
  getPage(id: string): WikiPage | undefined
  getPageByTitle(title: string, options?: GetPageByTitleOptions): WikiPage | undefined
  updatePage(id: string, data: UpdatePageData): Promise<WikiPage>
  deletePage(id: string, options?: DeletePageOptions): Promise<void>
  renamePage(id: string, newTitle: string, options?: RenamePageOptions): Promise<WikiPage>

  // Links
  getLinks(id: string): string[]
  getBacklinks(id: string): string[]
  getLinkedPages(id: string): WikiPage[]
  getBacklinkPages(id: string): WikiPage[]
  resolveLink(linkText: string): string
  resolveLinkToPage(linkText: string): WikiPage | undefined

  // Graph
  getDeadLinks(): DeadLink[]
  getDeadLinksForPage(id: string): string[]
  getOrphans(): WikiPage[]
  getGraph(): Graph
  getConnectedPages(id: string, depth?: number): WikiPage[]

  // Search and filter
  listPages(options?: ListPagesOptions): WikiPage[]
  search(query: string, options?: SearchOptions): WikiPage[]
  getTags(): string[]
  getPagesByTag(tag: string): WikiPage[]
  getTypes(): string[]
  getPagesByType(type: string): WikiPage[]

  // Import/Export
  export(): WikiPage[]
  import(pages: WikiPage[], options?: ImportOptions): Promise<number>
  toJSON(): string

  // Events
  on(event: string, callback: WikiEventCallback): UnsubscribeFunction
  onChange(callback: WikiEventCallback): UnsubscribeFunction
}
```

---

## `WikiPage`

A page in the wiki.

```typescript
interface WikiPage {
  id: string
  title: string
  content: string
  type?: string
  tags?: string[]
  created: Date
  modified: Date
}
```

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier (slugified from title or custom) |
| `title` | `string` | Display title |
| `content` | `string` | Page content (may contain `[[wikilinks]]`) |
| `type` | `string?` | Optional category type |
| `tags` | `string[]?` | Optional tags array |
| `created` | `Date` | Creation timestamp |
| `modified` | `Date` | Last modification timestamp |

---

## `WikiOptions`

Options for `createWiki()`.

```typescript
interface WikiOptions {
  storage?: WikiStorage
  linkPattern?: RegExp
}
```

| Property | Type | Description |
|----------|------|-------------|
| `storage` | `WikiStorage?` | Custom storage adapter. Default: `memoryStorage()` |
| `linkPattern` | `RegExp?` | Custom link regex. Default: `/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g` |

---

## `CreatePageData`

Data for creating a page.

```typescript
interface CreatePageData {
  id?: string
  title: string
  content?: string
  type?: string
  tags?: string[]
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | No | Custom ID. Default: slugified title |
| `title` | `string` | Yes | Page title |
| `content` | `string` | No | Page content. Default: `''` |
| `type` | `string` | No | Page type |
| `tags` | `string[]` | No | Page tags |

---

## `UpdatePageData`

Data for updating a page.

```typescript
interface UpdatePageData {
  title?: string
  content?: string
  type?: string | undefined
  tags?: string[] | undefined
}
```

| Property | Type | Description |
|----------|------|-------------|
| `title` | `string?` | New title |
| `content` | `string?` | New content |
| `type` | `string \| undefined` | New type, or `undefined` to remove |
| `tags` | `string[] \| undefined` | New tags, or `undefined` to remove |

---

## `ListPagesOptions`

Options for `listPages()`.

```typescript
interface ListPagesOptions {
  type?: string
  tags?: string[]
  sort?: 'title' | 'created' | 'modified'
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}
```

---

## `SearchOptions`

Options for `search()`.

```typescript
interface SearchOptions {
  fields?: ('title' | 'content' | 'tags')[]
  type?: string
  limit?: number
}
```

---

## `ImportOptions`

Options for `import()`.

```typescript
interface ImportOptions {
  mode?: 'replace' | 'merge' | 'skip'
  emitEvents?: boolean
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `mode` | `string` | `'replace'` | Import strategy |
| `emitEvents` | `boolean` | `false` | Fire events during import |

---

## `GetPageByTitleOptions`

Options for `getPageByTitle()`.

```typescript
interface GetPageByTitleOptions {
  ignoreCase?: boolean
}
```

---

## `RenamePageOptions`

Options for `renamePage()`.

```typescript
interface RenamePageOptions {
  updateId?: boolean
}
```

---

## `DeletePageOptions`

Options for `deletePage()`.

```typescript
interface DeletePageOptions {
  updateLinks?: boolean
}
```

---

## `DeadLink`

A link pointing to a non-existent page.

```typescript
interface DeadLink {
  source: string
  target: string
}
```

| Property | Type | Description |
|----------|------|-------------|
| `source` | `string` | Page ID containing the dead link |
| `target` | `string` | The link text (not slugified) |

---

## `Graph`

Adjacency list representation of page links.

```typescript
type Graph = Record<string, string[]>
```

Keys are page IDs, values are arrays of linked page IDs (slugified from link text).

---

## `WikiEvent`

Union type for all change events.

```typescript
type WikiEvent =
  | { type: 'create'; page: WikiPage }
  | { type: 'update'; page: WikiPage; previous: WikiPage }
  | { type: 'delete'; page: WikiPage }
  | { type: 'rename'; page: WikiPage; previousTitle: string }
```

---

## `WikiEventCallback`

Event handler function type.

```typescript
type WikiEventCallback = (event: WikiEvent) => void
```

---

## `UnsubscribeFunction`

Function to remove an event subscription.

```typescript
type UnsubscribeFunction = () => void
```

---

## `WikiStorage`

Interface for storage adapters.

```typescript
interface WikiStorage {
  save(page: WikiPage): Promise<void>
  load(id: string): Promise<WikiPage | null>
  delete(id: string): Promise<void>
  list(): Promise<WikiPage[]>
}
```

See [Storage API](API-Storage) for implementation details.
