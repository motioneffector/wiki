# Organizing with Types and Tags

Use types and tags to categorize your pages for better organization and navigation. Types provide single categorization, tags allow multiple.

## Prerequisites

Before starting, you should:

- Have a basic wiki set up ([Your First Wiki](Your-First-Wiki))

## Overview

We'll organize pages by:

1. Assigning types when creating pages
2. Adding tags for flexible categorization
3. Querying pages by type and tag

## Step 1: Assign Types

Types are single-value categories like "person", "place", or "item". Each page can have one type.

```typescript
import { createWiki } from '@motioneffector/wiki'

const wiki = createWiki()

await wiki.createPage({
  title: 'King Aldric',
  content: 'The wise ruler.',
  type: 'person'
})

await wiki.createPage({
  title: 'Castle Valdor',
  content: 'The royal fortress.',
  type: 'place'
})

await wiki.createPage({
  title: 'Crown of Ages',
  content: 'An ancient artifact.',
  type: 'item'
})
```

Types are free-form strings - use whatever categories make sense for your wiki.

## Step 2: Add Tags

Tags allow multiple categories per page. Use them for cross-cutting concerns.

```typescript
await wiki.createPage({
  title: 'King Aldric',
  content: 'The wise ruler.',
  type: 'person',
  tags: ['royalty', 'protagonist', 'chapter-1']
})

await wiki.createPage({
  title: 'Queen Isolde',
  content: 'The beloved queen.',
  type: 'person',
  tags: ['royalty', 'chapter-2', 'deceased']
})

await wiki.createPage({
  title: 'Castle Valdor',
  content: 'The royal fortress.',
  type: 'place',
  tags: ['royalty', 'chapter-1', 'chapter-3']
})
```

## Step 3: Query by Type and Tag

Find pages using their categorization.

```typescript
// Get all types in use
const types = wiki.getTypes()
console.log(types)
// ['item', 'person', 'place']

// Get all people
const people = wiki.getPagesByType('person')
console.log(people.map(p => p.title))
// ['King Aldric', 'Queen Isolde']

// Get all tags in use
const tags = wiki.getTags()
console.log(tags)
// ['chapter-1', 'chapter-2', 'chapter-3', 'deceased', 'protagonist', 'royalty']

// Get royalty-tagged pages
const royalty = wiki.getPagesByTag('royalty')
console.log(royalty.map(p => p.title))
// ['King Aldric', 'Queen Isolde', 'Castle Valdor']

// Combine in listPages for complex queries
const royalPeople = wiki.listPages({
  type: 'person',
  tags: ['royalty']
})
console.log(royalPeople.map(p => p.title))
// ['King Aldric', 'Queen Isolde']
```

## Complete Example

```typescript
import { createWiki, type Wiki } from '@motioneffector/wiki'

async function main() {
  const wiki = createWiki()

  // Create a categorized wiki
  await wiki.createPage({
    title: 'Gandalf',
    type: 'character',
    tags: ['wizard', 'protagonist', 'fellowship'],
    content: 'A powerful wizard.'
  })

  await wiki.createPage({
    title: 'Frodo',
    type: 'character',
    tags: ['hobbit', 'protagonist', 'fellowship', 'ring-bearer'],
    content: 'The ring-bearer.'
  })

  await wiki.createPage({
    title: 'Sauron',
    type: 'character',
    tags: ['villain', 'maiar'],
    content: 'The Dark Lord.'
  })

  await wiki.createPage({
    title: 'The Shire',
    type: 'location',
    tags: ['hobbit', 'safe'],
    content: 'Home of the hobbits.'
  })

  await wiki.createPage({
    title: 'Mordor',
    type: 'location',
    tags: ['dangerous', 'villain'],
    content: 'Land of shadow.'
  })

  await wiki.createPage({
    title: 'The One Ring',
    type: 'artifact',
    tags: ['dangerous', 'villain', 'ring-bearer'],
    content: 'The ring of power.'
  })

  // Build a sidebar navigation
  console.log(buildTypeSidebar(wiki))

  // Show tag relationships
  console.log('\n--- Dangerous things ---')
  for (const page of wiki.getPagesByTag('dangerous')) {
    console.log(`  ${page.title} (${page.type})`)
  }

  console.log('\n--- Fellowship members ---')
  const fellowship = wiki.listPages({
    type: 'character',
    tags: ['fellowship']
  })
  for (const page of fellowship) {
    console.log(`  ${page.title}`)
  }
}

function buildTypeSidebar(wiki: Wiki): string {
  const types = wiki.getTypes()
  let sidebar = 'WIKI CONTENTS\n'
  sidebar += '='.repeat(20) + '\n\n'

  for (const type of types) {
    const pages = wiki.getPagesByType(type)
    sidebar += `${type.toUpperCase()} (${pages.length})\n`
    for (const page of pages) {
      sidebar += `  • ${page.title}\n`
    }
    sidebar += '\n'
  }

  return sidebar
}

main()
```

## Variations

### Type-Based Navigation Component

```typescript
function getTypeNavigation(wiki: Wiki) {
  const types = wiki.getTypes()

  return types.map(type => {
    const pages = wiki.getPagesByType(type)
    return {
      type,
      label: type.charAt(0).toUpperCase() + type.slice(1) + 's',
      count: pages.length,
      pages: pages.map(p => ({ id: p.id, title: p.title }))
    }
  })
}

// Usage in a React-like component
const nav = getTypeNavigation(wiki)
// [
//   { type: 'character', label: 'Characters', count: 3, pages: [...] },
//   { type: 'location', label: 'Locations', count: 2, pages: [...] },
//   ...
// ]
```

### Tag Cloud with Weights

```typescript
function getWeightedTagCloud(wiki: Wiki) {
  const tags = wiki.getTags()
  const counts = tags.map(tag => ({
    tag,
    count: wiki.getPagesByTag(tag).length
  }))

  const maxCount = Math.max(...counts.map(c => c.count))

  return counts.map(({ tag, count }) => ({
    tag,
    count,
    weight: count / maxCount, // 0-1 scale for sizing
    size: Math.ceil((count / maxCount) * 4) + 1 // 1-5 scale
  }))
}
```

### Updating Categories

```typescript
// Change a page's type
await wiki.updatePage('gandalf', { type: 'maiar' })

// Add a tag
const page = wiki.getPage('gandalf')
await wiki.updatePage('gandalf', {
  tags: [...(page?.tags ?? []), 'grey-council']
})

// Remove a tag
await wiki.updatePage('gandalf', {
  tags: page?.tags?.filter(t => t !== 'fellowship')
})

// Clear type or tags
await wiki.updatePage('gandalf', { type: undefined })
await wiki.updatePage('gandalf', { tags: undefined })
```

## Troubleshooting

### Type/Tag Not Appearing in getTypes()/getTags()

**Symptom:** You set a type or tag but it doesn't show in the list.

**Cause:** `getTypes()` and `getTags()` only return values that are currently assigned to at least one page.

**Solution:** This is expected behavior. Once you assign the type/tag to a page, it will appear.

### Tags Array Mutations Not Saving

**Symptom:** You modified the tags array but changes don't persist.

**Cause:** You might be mutating the returned object instead of using `updatePage`.

**Solution:** Always use `updatePage` to modify pages:
```typescript
// Wrong
const page = wiki.getPage('id')
page.tags.push('new-tag') // This doesn't persist!

// Right
const page = wiki.getPage('id')
await wiki.updatePage('id', {
  tags: [...(page?.tags ?? []), 'new-tag']
})
```

## See Also

- **[Searching Pages](Guide-Searching-Pages)** - Finding pages by type and tag
- **[Search & Filter API](API-Search-And-Filter)** - Full reference for type and tag methods
