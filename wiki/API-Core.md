# Core API

Core functions for creating wikis and managing pages.

---

## `createWiki()`

Creates a new wiki instance.

**Signature:**

```typescript
function createWiki(options?: WikiOptions): Wiki
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `WikiOptions` | No | Configuration options |

**Options:**

| Property | Type | Description |
|----------|------|-------------|
| `storage` | `WikiStorage` | Custom storage adapter. Default: `memoryStorage()` |
| `linkPattern` | `RegExp` | Custom link syntax regex. Default: `/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g` |

**Returns:** `Wiki` — A new wiki instance

**Example:**

```typescript
import { createWiki, memoryStorage } from '@motioneffector/wiki'

// Default configuration
const wiki = createWiki()

// With custom storage
const wiki = createWiki({ storage: myStorage })

// With custom link pattern (e.g., {{link}} instead of [[link]])
const wiki = createWiki({ linkPattern: /\{\{([^}]+)\}\}/g })
```

**Throws:**

- `TypeError` — If storage doesn't implement WikiStorage interface
- `TypeError` — If linkPattern is not a RegExp
- `Error` — If linkPattern has no capture group

---

## `wiki.createPage()`

Creates a new page in the wiki.

**Signature:**

```typescript
createPage(data: CreatePageData): Promise<WikiPage>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `CreatePageData` | Yes | Page data |

**CreatePageData:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | `string` | Yes | Page title (cannot be empty) |
| `id` | `string` | No | Custom page ID. Default: slugified title |
| `content` | `string` | No | Page content. Default: `''` |
| `type` | `string` | No | Page type category |
| `tags` | `string[]` | No | Array of tags |

**Returns:** `Promise<WikiPage>` — The created page with generated fields

**Example:**

```typescript
// Minimal
const page = await wiki.createPage({ title: 'Home' })

// Full options
const page = await wiki.createPage({
  title: 'King Aldric',
  content: 'Ruler of [[Valdoria]].',
  type: 'person',
  tags: ['royalty', 'protagonist']
})

// Custom ID
const page = await wiki.createPage({
  id: 'aldric-the-great',
  title: 'King Aldric'
})
```

**Throws:**

- `ValidationError` — If title is missing, empty, or whitespace-only
- `Error` — If a page with the given ID already exists
- `TypeError` — If tags is not an array or contains non-strings

---

## `wiki.getPage()`

Retrieves a page by ID.

**Signature:**

```typescript
getPage(id: string): WikiPage | undefined
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | The page ID |

**Returns:** `WikiPage | undefined` — The page if found, undefined otherwise

**Example:**

```typescript
const page = wiki.getPage('king-aldric')
if (page) {
  console.log(page.title)
}
```

---

## `wiki.getPageByTitle()`

Retrieves a page by its title.

**Signature:**

```typescript
getPageByTitle(title: string, options?: GetPageByTitleOptions): WikiPage | undefined
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | The exact page title |
| `options` | `GetPageByTitleOptions` | No | Lookup options |

**Options:**

| Property | Type | Description |
|----------|------|-------------|
| `ignoreCase` | `boolean` | Match case-insensitively. Default: `false` |

**Returns:** `WikiPage | undefined` — The page if found, undefined otherwise

**Example:**

```typescript
// Exact match
const page = wiki.getPageByTitle('King Aldric')

// Case-insensitive
const page = wiki.getPageByTitle('king aldric', { ignoreCase: true })
```

---

## `wiki.updatePage()`

Updates an existing page.

**Signature:**

```typescript
updatePage(id: string, data: UpdatePageData): Promise<WikiPage>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | The page ID to update |
| `data` | `UpdatePageData` | Yes | Fields to update |

**UpdatePageData:**

| Property | Type | Description |
|----------|------|-------------|
| `title` | `string` | New title |
| `content` | `string` | New content (re-extracts links) |
| `type` | `string \| undefined` | New type, or undefined to remove |
| `tags` | `string[] \| undefined` | New tags, or undefined to remove |

**Returns:** `Promise<WikiPage>` — The updated page

**Example:**

```typescript
// Update content
await wiki.updatePage('king-aldric', {
  content: 'Former ruler of [[Valdoria]].'
})

// Update multiple fields
await wiki.updatePage('king-aldric', {
  title: 'King Aldric the Great',
  type: 'historical-figure',
  tags: ['royalty', 'deceased']
})

// Remove type
await wiki.updatePage('king-aldric', { type: undefined })
```

**Throws:**

- `Error` — If page not found
- `ValidationError` — If title is empty

---

## `wiki.deletePage()`

Deletes a page from the wiki.

**Signature:**

```typescript
deletePage(id: string, options?: DeletePageOptions): Promise<void>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | The page ID to delete |
| `options` | `DeletePageOptions` | No | Deletion options |

**Options:**

| Property | Type | Description |
|----------|------|-------------|
| `updateLinks` | `boolean` | Update link indexes. Default: `true` |

**Example:**

```typescript
await wiki.deletePage('old-page')
```

**Throws:**

- `Error` — If page not found

---

## `wiki.renamePage()`

Changes a page's title, optionally updating its ID.

**Signature:**

```typescript
renamePage(id: string, newTitle: string, options?: RenamePageOptions): Promise<WikiPage>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | Current page ID |
| `newTitle` | `string` | Yes | New title |
| `options` | `RenamePageOptions` | No | Rename options |

**Options:**

| Property | Type | Description |
|----------|------|-------------|
| `updateId` | `boolean` | Also change ID to slugified new title. Default: `false` |

**Returns:** `Promise<WikiPage>` — The renamed page

**Example:**

```typescript
// Rename title only (keeps same ID)
await wiki.renamePage('king-aldric', 'King Aldric II')

// Rename title and ID (also updates links in other pages!)
await wiki.renamePage('king-aldric', 'King Aldric II', { updateId: true })
```

**Throws:**

- `Error` — If page not found
- `Error` — If title is empty
- `Error` — If `updateId: true` and new ID already exists
