# Pages & Links

Pages are the fundamental unit of content in a wiki. Each page has a title, content, and automatic link extraction. When you write `[[Page Title]]` in your content, the library detects and tracks these links.

## How It Works

A page is a document with these properties:

- **id** - Unique identifier, auto-generated from title (slugified)
- **title** - The display name
- **content** - Text that can contain `[[wikilinks]]`
- **type** - Optional category (e.g., "person", "place")
- **tags** - Optional array of tags
- **created** / **modified** - Timestamps

When you create or update a page, the library scans the content for `[[wikilinks]]` and builds an index of relationships. This happens automatically - you just write content.

## Basic Usage

```typescript
import { createWiki } from '@motioneffector/wiki'

const wiki = createWiki()

// Create a page - ID is auto-generated from title
const page = await wiki.createPage({
  title: 'King Aldric',
  content: 'Ruler of [[Valdoria]]. Father of [[Prince Aldric II]].',
  type: 'person',
  tags: ['royalty', 'protagonist']
})

console.log(page.id)      // 'king-aldric'
console.log(page.created) // Date object
```

The links `[[Valdoria]]` and `[[Prince Aldric II]]` are automatically extracted and indexed.

## Key Points

- **IDs are slugified titles** - "King Aldric I" becomes "king-aldric-i". Spaces become hyphens, special characters are removed, diacritics are normalized (Café → cafe).

- **You can provide custom IDs** - Pass `id` in the create data if you need a specific identifier:
  ```typescript
  await wiki.createPage({
    id: 'aldric-the-great',
    title: 'King Aldric',
    content: '...'
  })
  ```

- **Links can have display text** - Use `[[Page Title|display text]]` to show different text than the page title:
  ```typescript
  content: 'See [[King Aldric|the king]] for details.'
  // Links to "King Aldric" but displays "the king"
  ```

- **Code blocks are ignored** - Links inside fenced code blocks (``` ```) or inline code (`) are not extracted. This prevents documentation examples from creating false links.

## Examples

### Retrieving Pages

```typescript
// By ID
const page = wiki.getPage('king-aldric')

// By title (exact match)
const page = wiki.getPageByTitle('King Aldric')

// By title (case-insensitive)
const page = wiki.getPageByTitle('king aldric', { ignoreCase: true })
```

### Updating Pages

```typescript
// Update content - links are re-extracted automatically
await wiki.updatePage('king-aldric', {
  content: 'Now links to [[New Character]] instead.'
})

// Update other fields
await wiki.updatePage('king-aldric', {
  type: 'historical-figure',
  tags: ['deceased', 'royalty']
})
```

### Renaming Pages

```typescript
// Rename title only (keeps same ID)
await wiki.renamePage('king-aldric', 'King Aldric the Great')

// Rename and update ID (also updates links in other pages!)
await wiki.renamePage('king-aldric', 'King Aldric the Great', { updateId: true })
```

## Related

- **[Bidirectional Links](Concept-Bidirectional-Links)** - How the library tracks links in both directions
- **[Your First Wiki](Your-First-Wiki)** - Hands-on tutorial creating pages
- **[Core API](API-Core)** - Full reference for page operations
