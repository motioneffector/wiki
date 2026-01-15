# Managing Dead Links

Dead links point to pages that don't exist yet. This guide shows how to find them, report on them, and fix them.

## Prerequisites

Before starting, you should:

- [Understand pages and links](Concept-Pages-And-Links)
- [Understand dead links and orphans](Concept-Dead-Links-And-Orphans)

## Overview

We'll manage dead links by:

1. Finding all dead links with `getDeadLinks()`
2. Checking specific pages with `getDeadLinksForPage()`
3. Fixing them by creating missing pages or updating content

## Step 1: Find All Dead Links

`getDeadLinks()` returns every broken link across your entire wiki.

```typescript
import { createWiki } from '@motioneffector/wiki'

const wiki = createWiki()

await wiki.createPage({
  title: 'Story',
  content: 'The [[Hero]] defeats the [[Dragon]] using the [[Magic Sword]].'
})

await wiki.createPage({
  title: 'Hero',
  content: 'The brave protagonist.'
})

// Dragon and Magic Sword don't exist
const deadLinks = wiki.getDeadLinks()
console.log(deadLinks)
// [
//   { source: 'story', target: 'Dragon' },
//   { source: 'story', target: 'Magic Sword' }
// ]
```

Each dead link tells you:
- `source` - The page ID containing the broken link
- `target` - The link text (what the user typed in `[[...]]`)

## Step 2: Check a Specific Page

When editing a page, check just that page's dead links.

```typescript
const storyDeadLinks = wiki.getDeadLinksForPage('story')
console.log(storyDeadLinks)
// ['Dragon', 'Magic Sword']

// Show warning in editor
if (storyDeadLinks.length > 0) {
  console.warn(`This page has ${storyDeadLinks.length} broken links`)
}
```

## Step 3: Fix Dead Links

Two approaches: create the missing pages, or update the content.

```typescript
// Option 1: Create the missing page
await wiki.createPage({
  title: 'Dragon',
  content: 'The fearsome beast.'
})

// Check again - Dragon is no longer dead
console.log(wiki.getDeadLinksForPage('story'))
// ['Magic Sword']

// Option 2: Update the content to remove the link
const story = wiki.getPage('story')
await wiki.updatePage('story', {
  content: story.content.replace('[[Magic Sword]]', 'a magic sword')
})

// All fixed
console.log(wiki.getDeadLinksForPage('story'))
// []
```

## Complete Example

```typescript
import { createWiki, type Wiki, type DeadLink } from '@motioneffector/wiki'

async function main() {
  const wiki = createWiki()

  // Build a wiki with some dead links
  await wiki.createPage({
    title: 'Index',
    content: 'Welcome to [[World Guide]] and [[Character List]].'
  })

  await wiki.createPage({
    title: 'World Guide',
    content: 'The world contains [[Kingdom of Valdor]] and [[Dark Forest]].'
  })

  await wiki.createPage({
    title: 'Character List',
    content: 'Heroes: [[Sir Galahad]], [[Lady Elara]]. Villains: [[The Shadow King]].'
  })

  // Generate a dead link report
  console.log(generateDeadLinkReport(wiki))

  // Auto-create stubs for missing pages
  await createMissingPages(wiki)

  // Verify all fixed
  console.log('\nAfter fix:', wiki.getDeadLinks().length, 'dead links')
}

function generateDeadLinkReport(wiki: Wiki): string {
  const deadLinks = wiki.getDeadLinks()

  if (deadLinks.length === 0) {
    return 'No dead links found!'
  }

  // Group by source page
  const grouped = new Map<string, string[]>()
  for (const { source, target } of deadLinks) {
    if (!grouped.has(source)) {
      grouped.set(source, [])
    }
    grouped.get(source)!.push(target)
  }

  // Format report
  let report = `Dead Link Report (${deadLinks.length} total)\n`
  report += '='.repeat(40) + '\n\n'

  for (const [sourceId, targets] of grouped) {
    const sourcePage = wiki.getPage(sourceId)
    report += `${sourcePage?.title ?? sourceId}:\n`
    for (const target of targets) {
      report += `  → [[${target}]] (missing)\n`
    }
    report += '\n'
  }

  return report
}

async function createMissingPages(wiki: Wiki): Promise<string[]> {
  const deadLinks = wiki.getDeadLinks()
  const missingTitles = [...new Set(deadLinks.map(dl => dl.target))]
  const created: string[] = []

  for (const title of missingTitles) {
    await wiki.createPage({
      title,
      content: `TODO: Add content for "${title}"`
    })
    created.push(title)
    console.log(`Created stub: ${title}`)
  }

  return created
}

main()
```

## Variations

### Interactive Dead Link Fixer

```typescript
async function interactiveDeadLinkFixer(wiki: Wiki) {
  const deadLinks = wiki.getDeadLinks()

  for (const { source, target } of deadLinks) {
    const sourcePage = wiki.getPage(source)
    console.log(`\nIn "${sourcePage?.title}": [[${target}]] is broken`)
    console.log('Options:')
    console.log('  1. Create page')
    console.log('  2. Remove link')
    console.log('  3. Skip')

    const choice = await prompt('Choice: ')

    switch (choice) {
      case '1':
        await wiki.createPage({ title: target, content: 'TODO' })
        console.log(`Created: ${target}`)
        break
      case '2':
        const content = sourcePage!.content.replace(
          new RegExp(`\\[\\[${escapeRegex(target)}\\]\\]`, 'g'),
          target
        )
        await wiki.updatePage(source, { content })
        console.log('Link removed')
        break
      default:
        console.log('Skipped')
    }
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
```

### Dead Link Monitoring

```typescript
function monitorDeadLinks(wiki: Wiki) {
  let lastCount = wiki.getDeadLinks().length

  wiki.onChange(() => {
    const currentCount = wiki.getDeadLinks().length

    if (currentCount > lastCount) {
      console.warn(`Dead links increased: ${lastCount} → ${currentCount}`)
    } else if (currentCount < lastCount) {
      console.log(`Dead links decreased: ${lastCount} → ${currentCount}`)
    }

    lastCount = currentCount
  })
}
```

## Troubleshooting

### Same Dead Link Appearing Multiple Times

**Symptom:** `getDeadLinks()` shows the same target from different source pages.

**Cause:** Multiple pages link to the same non-existent page.

**Solution:** This is expected. Creating the missing page fixes all of them at once:
```typescript
// Get unique missing pages
const missing = [...new Set(wiki.getDeadLinks().map(dl => dl.target))]
```

### Link Doesn't Register as Dead

**Symptom:** A page links to something that doesn't exist, but it's not in dead links.

**Cause:** The link might be inside a code block, which is ignored.

**Solution:** Check if the link is inside ``` or ` characters. Links in code are intentionally skipped.

## See Also

- **[Dead Links & Orphans](Concept-Dead-Links-And-Orphans)** - Conceptual explanation
- **[Exploring the Link Graph](Guide-Exploring-The-Link-Graph)** - Finding orphans and analyzing structure
- **[Graph API](API-Graph)** - Full reference for dead link methods
