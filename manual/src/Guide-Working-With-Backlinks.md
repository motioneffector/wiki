# Working with Backlinks

Backlinks show you what pages link to a specific page. This guide covers how to query backlinks and build features like "What links here" navigation.

## Prerequisites

Before starting, you should:

- [Understand pages and links](Concept-Pages-And-Links)
- [Understand bidirectional linking](Concept-Bidirectional-Links)

## Overview

We'll query backlinks by:

1. Getting a page's ID
2. Calling `getBacklinks()` or `getBacklinkPages()`
3. Using the results for navigation or analysis

## Step 1: Get the Target Page

You need the page ID to query backlinks. Get it from the page object or by title lookup.

```typescript
import { createWiki } from '@motioneffector/wiki'

const wiki = createWiki()

// If you have the page object
const page = await wiki.createPage({ title: 'Hero' })
const pageId = page.id // 'hero'

// If you only have the title
const found = wiki.getPageByTitle('Hero')
const pageId = found?.id // 'hero'

// If you only have link text
const pageId = wiki.resolveLink('Hero') // 'hero'
```

## Step 2: Query Backlinks

Use `getBacklinks()` for just IDs, or `getBacklinkPages()` for full page objects.

```typescript
// Setup: create pages with links
await wiki.createPage({
  title: 'Story',
  content: 'The [[Hero]] saves the day.'
})

await wiki.createPage({
  title: 'Characters',
  content: 'Main character: [[Hero]]. Sidekick: [[Companion]].'
})

await wiki.createPage({
  title: 'Hero',
  content: 'The protagonist.'
})

// Query: what links to Hero?
const backlinkIds = wiki.getBacklinks('hero')
console.log(backlinkIds)
// ['story', 'characters']

// Get full page objects
const backlinkPages = wiki.getBacklinkPages('hero')
console.log(backlinkPages.map(p => p.title))
// ['Story', 'Characters']
```

## Step 3: Use the Results

Common uses for backlink data:

```typescript
// Build a "What links here" list
function whatLinksHere(wiki: Wiki, pageId: string) {
  return wiki.getBacklinkPages(pageId).map(page => ({
    title: page.title,
    url: `/wiki/${page.id}`
  }))
}

// Count incoming links (popularity)
function getLinkCount(wiki: Wiki, pageId: string) {
  return wiki.getBacklinks(pageId).length
}

// Check if a page is referenced
function isReferenced(wiki: Wiki, pageId: string) {
  return wiki.getBacklinks(pageId).length > 0
}
```

## Complete Example

```typescript
import { createWiki, type Wiki, type WikiPage } from '@motioneffector/wiki'

async function main() {
  const wiki = createWiki()

  // Create a small wiki
  await wiki.createPage({
    title: 'Index',
    content: 'Welcome! See [[Characters]] and [[Locations]].'
  })

  await wiki.createPage({
    title: 'Characters',
    content: '[[Alice]] is the hero. [[Bob]] is the mentor.'
  })

  await wiki.createPage({
    title: 'Alice',
    content: 'Main character. Lives in [[Hometown]].'
  })

  await wiki.createPage({
    title: 'Locations',
    content: '[[Hometown]] is where it all begins.'
  })

  await wiki.createPage({
    title: 'Hometown',
    content: 'A small village. Home of [[Alice]].'
  })

  // What links to Alice?
  const aliceBacklinks = wiki.getBacklinkPages('alice')
  console.log('\nPages linking to Alice:')
  for (const page of aliceBacklinks) {
    console.log(`  - ${page.title}`)
  }
  // Characters, Hometown

  // What links to Hometown?
  const hometownBacklinks = wiki.getBacklinkPages('hometown')
  console.log('\nPages linking to Hometown:')
  for (const page of hometownBacklinks) {
    console.log(`  - ${page.title}`)
  }
  // Alice, Locations
}

main()
```

## Variations

### Finding Most-Linked Pages

```typescript
function getMostLinkedPages(wiki: Wiki, limit = 10) {
  const pages = wiki.listPages()

  return pages
    .map(page => ({
      page,
      backlinkCount: wiki.getBacklinks(page.id).length
    }))
    .sort((a, b) => b.backlinkCount - a.backlinkCount)
    .slice(0, limit)
}

const popular = getMostLinkedPages(wiki, 5)
for (const { page, backlinkCount } of popular) {
  console.log(`${page.title}: ${backlinkCount} incoming links`)
}
```

### Building Related Pages

```typescript
function getRelatedPages(wiki: Wiki, pageId: string) {
  const related = new Set<string>()

  // Pages this one links to
  for (const linked of wiki.getLinkedPages(pageId)) {
    related.add(linked.id)
  }

  // Pages that link to this one
  for (const backlink of wiki.getBacklinkPages(pageId)) {
    related.add(backlink.id)
  }

  // Remove self
  related.delete(pageId)

  return [...related].map(id => wiki.getPage(id)!).filter(Boolean)
}
```

## Troubleshooting

### Backlinks Not Appearing

**Symptom:** `getBacklinks()` returns empty array even though pages link to it.

**Cause:** The linking page's content doesn't match the target page's ID when slugified.

**Solution:** Check that `[[Link Text]]` slugifies to the target ID:
```typescript
const targetId = wiki.resolveLink('Link Text')
console.log(targetId) // Should match your target page's ID
```

### Backlinks Include Deleted Pages

**Symptom:** Backlink IDs reference pages that no longer exist.

**Cause:** This shouldn't happen - backlinks are cleaned up on delete. If it does, it's a bug.

**Solution:** Filter results to existing pages:
```typescript
const existingBacklinks = wiki.getBacklinks(pageId)
  .filter(id => wiki.getPage(id) !== undefined)
```

## See Also

- **[Bidirectional Links](Concept-Bidirectional-Links)** - How the backlink index works
- **[Exploring the Link Graph](Guide-Exploring-The-Link-Graph)** - Deeper graph analysis
- **[Links API](API-Links)** - Full reference for link methods
