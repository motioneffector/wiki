# Graph API

Functions for analyzing link structure, finding dead links, and exploring the wiki graph.

---

## `wiki.getDeadLinks()`

Finds all links pointing to non-existent pages.

**Signature:**

```typescript
getDeadLinks(): DeadLink[]
```

**Returns:** `DeadLink[]` — Array of dead link objects

**DeadLink:**

| Property | Type | Description |
|----------|------|-------------|
| `source` | `string` | Page ID containing the dead link |
| `target` | `string` | Link text (the missing page reference) |

**Example:**

```typescript
await wiki.createPage({
  title: 'Story',
  content: '[[Hero]] defeats [[Dragon]].'
})
await wiki.createPage({ title: 'Hero', content: '' })
// Dragon doesn't exist

const deadLinks = wiki.getDeadLinks()
console.log(deadLinks)
// [{ source: 'story', target: 'Dragon' }]
```

---

## `wiki.getDeadLinksForPage()`

Finds dead links in a specific page.

**Signature:**

```typescript
getDeadLinksForPage(id: string): string[]
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | The page ID to check |

**Returns:** `string[]` — Array of link texts that don't resolve to pages

**Example:**

```typescript
const deadLinks = wiki.getDeadLinksForPage('story')
console.log(deadLinks) // ['Dragon']
```

---

## `wiki.getOrphans()`

Finds pages with no incoming links.

**Signature:**

```typescript
getOrphans(): WikiPage[]
```

**Returns:** `WikiPage[]` — Array of pages that nothing links to

**Example:**

```typescript
await wiki.createPage({ title: 'Index', content: '[[Page A]]' })
await wiki.createPage({ title: 'Page A', content: '' })
await wiki.createPage({ title: 'Forgotten', content: '' })

const orphans = wiki.getOrphans()
console.log(orphans.map(p => p.title))
// ['Index', 'Forgotten']
// Note: Index is orphan (nothing links to it)
// Page A is not orphan (Index links to it)
```

---

## `wiki.getGraph()`

Gets the complete link graph as an adjacency list.

**Signature:**

```typescript
getGraph(): Graph
```

**Returns:** `Graph` — Object mapping page IDs to arrays of linked IDs

**Graph type:**

```typescript
type Graph = Record<string, string[]>
```

**Example:**

```typescript
await wiki.createPage({ title: 'A', content: '[[B]] [[C]]' })
await wiki.createPage({ title: 'B', content: '[[A]]' })
await wiki.createPage({ title: 'C', content: '' })

const graph = wiki.getGraph()
console.log(graph)
// {
//   'a': ['b', 'c'],
//   'b': ['a'],
//   'c': []
// }
```

The graph includes dead links (links to non-existent pages appear as target IDs without their own key).

---

## `wiki.getConnectedPages()`

Finds pages within N links of a starting page.

**Signature:**

```typescript
getConnectedPages(id: string, depth?: number): WikiPage[]
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | Starting page ID |
| `depth` | `number` | No | Maximum link distance. Default: `1` |

**Returns:** `WikiPage[]` — Array of pages within the specified depth (includes starting page)

**Example:**

```typescript
await wiki.createPage({ title: 'A', content: '[[B]]' })
await wiki.createPage({ title: 'B', content: '[[C]]' })
await wiki.createPage({ title: 'C', content: '[[D]]' })
await wiki.createPage({ title: 'D', content: '' })

// Depth 0: just the page itself
const depth0 = wiki.getConnectedPages('a', 0)
console.log(depth0.map(p => p.title)) // ['A']

// Depth 1: direct connections
const depth1 = wiki.getConnectedPages('a', 1)
console.log(depth1.map(p => p.title)) // ['A', 'B']

// Depth 2: two hops away
const depth2 = wiki.getConnectedPages('a', 2)
console.log(depth2.map(p => p.title)) // ['A', 'B', 'C']

// Includes both outgoing and incoming links
await wiki.createPage({ title: 'X', content: '[[A]]' })
const withBacklink = wiki.getConnectedPages('a', 1)
console.log(withBacklink.map(p => p.title)) // ['A', 'B', 'X']
```

Returns empty array if page doesn't exist. Handles cycles without infinite loops.
