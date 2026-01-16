# Search & Filter API

Functions for searching, filtering, and listing pages.

---

## `wiki.listPages()`

Lists pages with optional filtering, sorting, and pagination.

**Signature:**

```typescript
listPages(options?: ListPagesOptions): WikiPage[]
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `ListPagesOptions` | No | Filter and sort options |

**ListPagesOptions:**

| Property | Type | Description |
|----------|------|-------------|
| `type` | `string` | Filter by page type |
| `tags` | `string[]` | Filter by tags (OR logic - matches any tag) |
| `sort` | `'title' \| 'created' \| 'modified'` | Sort field. Default: `'created'` |
| `order` | `'asc' \| 'desc'` | Sort order. Default: `'desc'` |
| `limit` | `number` | Maximum pages to return |
| `offset` | `number` | Number of pages to skip |

**Returns:** `WikiPage[]` — Array of matching pages

**Example:**

```typescript
// All pages, newest first (default)
const all = wiki.listPages()

// Filter by type
const people = wiki.listPages({ type: 'person' })

// Filter by tags (OR logic)
const magical = wiki.listPages({ tags: ['magic', 'spell'] })

// Combine type and tags (AND logic between them)
const magicPeople = wiki.listPages({ type: 'person', tags: ['magic'] })

// Sort alphabetically
const alphabetical = wiki.listPages({ sort: 'title', order: 'asc' })

// Pagination
const page2 = wiki.listPages({ offset: 10, limit: 10 })
```

---

## `wiki.search()`

Searches pages by text in title, content, and/or tags.

**Signature:**

```typescript
search(query: string, options?: SearchOptions): WikiPage[]
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | `string` | Yes | Search text |
| `options` | `SearchOptions` | No | Search options |

**SearchOptions:**

| Property | Type | Description |
|----------|------|-------------|
| `fields` | `('title' \| 'content' \| 'tags')[]` | Fields to search. Default: `['title', 'content']` |
| `type` | `string` | Filter results by type |
| `limit` | `number` | Maximum results |

**Returns:** `WikiPage[]` — Matching pages, ranked by relevance

**Ranking:**
- Exact title match: highest score
- Title contains query: high score
- Tag contains query: medium score
- Content contains query: lower score

**Example:**

```typescript
// Basic search (title and content)
const results = wiki.search('magic')

// Search only titles
const titleOnly = wiki.search('magic', { fields: ['title'] })

// Search tags
const tagged = wiki.search('fire', { fields: ['tags'] })

// Combine with type filter
const magicSpells = wiki.search('fire', { type: 'spell' })

// Limit results
const top5 = wiki.search('magic', { limit: 5 })
```

Returns empty array for empty or whitespace-only queries.

---

## `wiki.getTags()`

Gets all unique tags used across all pages.

**Signature:**

```typescript
getTags(): string[]
```

**Returns:** `string[]` — Sorted array of unique tags

**Example:**

```typescript
await wiki.createPage({ title: 'A', tags: ['magic', 'fire'] })
await wiki.createPage({ title: 'B', tags: ['magic', 'ice'] })

const tags = wiki.getTags()
console.log(tags) // ['fire', 'ice', 'magic']
```

---

## `wiki.getPagesByTag()`

Gets all pages with a specific tag.

**Signature:**

```typescript
getPagesByTag(tag: string): WikiPage[]
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tag` | `string` | Yes | The tag to filter by |

**Returns:** `WikiPage[]` — Pages with this tag

**Example:**

```typescript
const magicPages = wiki.getPagesByTag('magic')
for (const page of magicPages) {
  console.log(page.title)
}
```

Tag matching is case-sensitive.

---

## `wiki.getTypes()`

Gets all unique types used across all pages.

**Signature:**

```typescript
getTypes(): string[]
```

**Returns:** `string[]` — Sorted array of unique types

**Example:**

```typescript
await wiki.createPage({ title: 'Alice', type: 'person' })
await wiki.createPage({ title: 'City', type: 'place' })
await wiki.createPage({ title: 'Bob', type: 'person' })

const types = wiki.getTypes()
console.log(types) // ['person', 'place']
```

---

## `wiki.getPagesByType()`

Gets all pages with a specific type.

**Signature:**

```typescript
getPagesByType(type: string): WikiPage[]
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `type` | `string` | Yes | The type to filter by |

**Returns:** `WikiPage[]` — Pages with this type

**Example:**

```typescript
const people = wiki.getPagesByType('person')
console.log(people.map(p => p.title)) // ['Alice', 'Bob']
```

Type matching is case-sensitive.
