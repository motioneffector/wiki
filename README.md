# @motioneffector/wiki

A TypeScript library for creating and managing interconnected knowledge bases with bidirectional linking.

## Overview

This library provides a wiki-style knowledge management system where pages can link to each other, with automatic tracking of both outgoing and incoming links. It's designed for applications that need structured, interconnected documentation or worldbuilding tools.

## Features

- **Bidirectional Linking**: Links are tracked in both directions automatically
- **Page Types**: Categorize pages (person, place, event, concept, etc.)
- **Full-Text Search**: Search across all page content
- **Link Extraction**: Automatically extract `[[wiki links]]` from content
- **Backlinks**: See all pages that link to a given page
- **Orphan Detection**: Find pages with no incoming links
- **Dead Link Detection**: Find links pointing to non-existent pages
- **Storage Agnostic**: Bring your own persistence layer
- **Type Safety**: Full TypeScript support

## Core Concepts

### Pages

Pages are the fundamental unit, containing content and metadata:

```typescript
interface WikiPage {
  id: string
  title: string
  content: string       // Markdown with [[wiki links]]
  type?: string         // 'person', 'place', 'event', etc.
  tags?: string[]
  created: Date
  modified: Date
}
```

### Wiki Links

Link to other pages using double-bracket syntax:

```markdown
The [[Kingdom of Aldoria]] was founded by [[King Aldric I]]
after the [[Battle of Five Rivers]].
```

### Bidirectional Linking

When page A links to page B, the system automatically tracks that B is linked from A. This enables:

- **Backlinks**: "What pages link to this one?"
- **Graph traversal**: "What's connected to what?"
- **Orphan detection**: "What pages have no incoming links?"

## API

### `createWiki(options?)`

Creates a wiki instance.

**Options:**
- `storage`: Storage adapter for persistence (optional)
- `linkPattern`: Regex for link syntax (default: `\[\[(.+?)\]\]`)

### `wiki.createPage(data)`

Create a new page.

```typescript
wiki.createPage({
  title: 'King Aldric I',
  content: 'Founder of [[Kingdom of Aldoria]]...',
  type: 'person'
})
```

### `wiki.getPage(id)`

Retrieve a page by ID.

### `wiki.getPageByTitle(title)`

Retrieve a page by title.

### `wiki.updatePage(id, data)`

Update a page. Links are automatically re-extracted.

### `wiki.deletePage(id)`

Delete a page. Updates backlinks on affected pages.

### `wiki.getLinks(id)`

Get all pages that this page links to (outgoing links).

### `wiki.getBacklinks(id)`

Get all pages that link to this page (incoming links).

### `wiki.search(query)`

Full-text search across all pages.

### `wiki.listPages(options?)`

List pages with optional filtering.

**Options:**
- `type`: Filter by page type
- `tags`: Filter by tags
- `sort`: Sort field (`'title'`, `'created'`, `'modified'`)

### `wiki.getOrphans()`

Get pages with no incoming links.

### `wiki.getDeadLinks()`

Get links pointing to non-existent pages.

### `wiki.getGraph()`

Get the full link graph as an adjacency list.

## Storage Adapters

The wiki is storage-agnostic. Implement the `WikiStorage` interface:

```typescript
interface WikiStorage {
  save(page: WikiPage): Promise<void>
  load(id: string): Promise<WikiPage | null>
  delete(id: string): Promise<void>
  list(): Promise<WikiPage[]>
}
```

Built-in adapters:
- `memoryStorage()` - In-memory (for testing)
- `localStorageAdapter(key)` - Browser localStorage
- Bring your own for databases, files, etc.

## Use Cases

- **Worldbuilding**: Track people, places, events, and their relationships
- **Personal Knowledge Management**: Zettelkasten-style note systems
- **Documentation**: Interconnected technical docs
- **Game Design**: Design documents with linked concepts
- **Research**: Literature notes with citations

## Example: Worldbuilding Wiki

```typescript
const lore = createWiki()

lore.createPage({
  title: 'Kingdom of Aldoria',
  type: 'place',
  content: `
    A prosperous kingdom in the eastern valleys.

    ## History
    Founded by [[King Aldric I]] after the [[Battle of Five Rivers]].

    ## Notable Locations
    - [[Castle Aldric]] - The royal seat
    - [[Port Valen]] - Major trading hub
  `
})

// Later: what links to this kingdom?
const backlinks = lore.getBacklinks('kingdom-of-aldoria')
// Returns pages for King Aldric I, Battle of Five Rivers, etc.

// Find dead links (mentioned but not created)
const deadLinks = lore.getDeadLinks()
// ['Castle Aldric', 'Port Valen'] - pages to create
```

## Link Syntax

Default syntax uses double brackets: `[[Page Title]]`

You can customize this:

```typescript
const wiki = createWiki({
  linkPattern: /\{\{(.+?)\}\}/g  // Use {{Page Title}} instead
})
```

## Design Philosophy

This library focuses on the core wiki mechanics: pages, links, and the relationships between them. It doesn't include editing UI, rendering, or complex formatting - those are left to you. What you get is a solid foundation for any application that needs interconnected knowledge.

## Installation

```bash
npm install @motioneffector/wiki
```

## License

MIT
