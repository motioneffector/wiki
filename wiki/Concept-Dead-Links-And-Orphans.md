# Dead Links & Orphans

Dead links point to pages that don't exist. Orphans are pages that nothing links to. Both are normal in growing wikis, and the library provides tools to find and manage them.

## How It Works

**Dead links** occur when content references a page that hasn't been created:

```
Page "Story": "The [[Hero]] found the [[Magic Sword]]."
                  ↓                    ↓
              Hero exists        Magic Sword doesn't exist
                                      ↓
                              This is a dead link
```

**Orphans** are pages with no incoming links - no other page references them:

```
Page "Index" → links to → "Chapter 1" → links to → "Chapter 2"

Page "Random Notes" ← nothing links here = ORPHAN
```

Orphans aren't necessarily problems (your home page might be an orphan by design), but they can indicate forgotten or disconnected content.

## Basic Usage

```typescript
import { createWiki } from '@motioneffector/wiki'

const wiki = createWiki()

await wiki.createPage({
  title: 'Story',
  content: 'The [[Hero]] defeats the [[Dragon]].'
})

await wiki.createPage({
  title: 'Hero',
  content: 'The protagonist.'
})

// Find all dead links in the wiki
const deadLinks = wiki.getDeadLinks()
console.log(deadLinks)
// [{ source: 'story', target: 'Dragon' }]

// Find dead links for a specific page
const storyDeadLinks = wiki.getDeadLinksForPage('story')
console.log(storyDeadLinks)
// ['Dragon']

// Find orphan pages
const orphans = wiki.getOrphans()
console.log(orphans.map(p => p.title))
// ['Story'] - nothing links to Story yet
```

## Key Points

- **`getDeadLinks()`** returns an array of `{ source, target }` objects. `source` is the page ID containing the link, `target` is the link text (not normalized).

- **`getDeadLinksForPage(id)`** returns just the dead link texts for one specific page. Useful for showing warnings on a page editor.

- **`getOrphans()`** returns full `WikiPage` objects of all pages with zero incoming links.

- **Creating the target page "heals" dead links** - Once you create "Dragon", it's no longer a dead link. No manual cleanup needed.

- **Self-links prevent orphan status** - A page that links to itself (like `[[Home]]` on the Home page) is not considered an orphan.

## Examples

### Dead Link Report

```typescript
function generateDeadLinkReport(wiki: Wiki) {
  const deadLinks = wiki.getDeadLinks()

  // Group by source page
  const bySource = new Map<string, string[]>()
  for (const { source, target } of deadLinks) {
    if (!bySource.has(source)) {
      bySource.set(source, [])
    }
    bySource.get(source)!.push(target)
  }

  // Format report
  for (const [sourceId, targets] of bySource) {
    const page = wiki.getPage(sourceId)
    console.log(`\n${page?.title ?? sourceId}:`)
    for (const target of targets) {
      console.log(`  - [[${target}]] (missing)`)
    }
  }
}
```

### Auto-Create Missing Pages

```typescript
async function createMissingPages(wiki: Wiki) {
  const deadLinks = wiki.getDeadLinks()
  const created: string[] = []

  // Get unique targets
  const missingTitles = [...new Set(deadLinks.map(dl => dl.target))]

  for (const title of missingTitles) {
    await wiki.createPage({
      title,
      content: `TODO: Add content for ${title}`
    })
    created.push(title)
  }

  return created
}
```

### Finding Disconnected Content

```typescript
function findDisconnectedContent(wiki: Wiki) {
  const orphans = wiki.getOrphans()
  const deadLinks = wiki.getDeadLinks()

  return {
    // Pages nothing links to
    unreachable: orphans.map(p => p.title),

    // Intended pages that don't exist
    missing: [...new Set(deadLinks.map(dl => dl.target))],

    // Health score
    healthScore: calculateHealthScore(wiki, orphans, deadLinks)
  }
}

function calculateHealthScore(wiki: Wiki, orphans: WikiPage[], deadLinks: DeadLink[]) {
  const totalPages = wiki.listPages().length
  if (totalPages === 0) return 100

  const orphanPenalty = (orphans.length / totalPages) * 50
  const deadLinkPenalty = Math.min(deadLinks.length * 2, 50)

  return Math.max(0, 100 - orphanPenalty - deadLinkPenalty)
}
```

## Related

- **[Bidirectional Links](Concept-Bidirectional-Links)** - How links are tracked
- **[Managing Dead Links](Guide-Managing-Dead-Links)** - Practical guide to wiki maintenance
- **[Graph API](API-Graph)** - Full reference for dead links and orphans
