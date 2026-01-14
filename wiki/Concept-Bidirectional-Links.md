# Bidirectional Links

When page A contains `[[B]]`, the library tracks this relationship in two directions: A's outgoing links and B's incoming backlinks. You don't need to maintain these indexes yourself - they update automatically as content changes.

## How It Works

Think of links as one-way streets that the library maps from both ends:

```
Page A: "See [[B]] for details"
         ↓
    A → B (outgoing link from A)
    B ← A (backlink to B)
```

The library maintains two indexes:
1. **Link index** - For each page, what pages does it link to?
2. **Backlink index** - For each page, what pages link to it?

Both indexes update instantly when you create, update, or delete pages.

## Basic Usage

```typescript
import { createWiki } from '@motioneffector/wiki'

const wiki = createWiki()

await wiki.createPage({
  title: 'Characters',
  content: 'Main characters: [[Hero]] and [[Villain]].'
})

await wiki.createPage({
  title: 'Hero',
  content: 'The protagonist. Nemesis of [[Villain]].'
})

await wiki.createPage({
  title: 'Villain',
  content: 'The antagonist.'
})

// What does "Characters" link to?
const links = wiki.getLinks('characters')
console.log(links) // ['Hero', 'Villain']

// What links to "Villain"?
const backlinks = wiki.getBacklinks('villain')
console.log(backlinks) // ['characters', 'hero']
```

## Key Points

- **`getLinks(id)`** returns the raw link text as written in content. If you wrote `[[King Aldric]]`, you get "King Aldric" (not the slugified ID).

- **`getBacklinks(id)`** returns page IDs of pages that link to this page. The argument is the target page's ID.

- **`getLinkedPages(id)` and `getBacklinkPages(id)`** return full `WikiPage` objects instead of strings/IDs. Useful when you need page details.

- **Links to non-existent pages still work** - If a page links to `[[Future Page]]` that doesn't exist yet, the link is tracked. When you create "Future Page", the backlink appears automatically.

## Examples

### Building a "What Links Here" Feature

```typescript
function getWhatLinksHere(wiki: Wiki, pageId: string) {
  const backlinkPages = wiki.getBacklinkPages(pageId)

  return backlinkPages.map(page => ({
    title: page.title,
    id: page.id,
    // Optionally extract the context around the link
    snippet: extractLinkContext(page.content, pageId)
  }))
}
```

### Finding the Most Connected Pages

```typescript
function getMostLinkedPages(wiki: Wiki, limit = 10) {
  const pages = wiki.listPages()

  const ranked = pages.map(page => ({
    page,
    incomingCount: wiki.getBacklinks(page.id).length,
    outgoingCount: wiki.getLinks(page.id).length,
    totalConnections: wiki.getBacklinks(page.id).length + wiki.getLinks(page.id).length
  }))

  return ranked
    .sort((a, b) => b.totalConnections - a.totalConnections)
    .slice(0, limit)
}
```

### Resolving Link Text to Pages

```typescript
// Given link text, find the target page
const targetId = wiki.resolveLink('King Aldric')
console.log(targetId) // 'king-aldric'

// Or get the full page object
const targetPage = wiki.resolveLinkToPage('King Aldric')
if (targetPage) {
  console.log(targetPage.title) // 'King Aldric'
}
```

## Related

- **[Pages & Links](Concept-Pages-And-Links)** - Understanding pages and link syntax
- **[Dead Links & Orphans](Concept-Dead-Links-And-Orphans)** - When links point to missing pages
- **[Working with Backlinks](Guide-Working-With-Backlinks)** - Practical guide for backlink features
- **[Links API](API-Links)** - Full reference for link operations
