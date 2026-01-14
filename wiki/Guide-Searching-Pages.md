# Searching Pages

Find pages by searching text, filtering by type or tags, and paginating results. This guide covers all the ways to query your wiki.

## Prerequisites

Before starting, you should:

- Have a wiki with some pages ([Your First Wiki](Your-First-Wiki))

## Overview

We'll search and filter pages using:

1. `search()` for text search across titles and content
2. `listPages()` for filtering by type, tags, with sorting and pagination
3. `getPagesByTag()` and `getPagesByType()` for exact matches

## Step 1: Text Search

Use `search()` to find pages by matching text in titles and content.

```typescript
import { createWiki } from '@motioneffector/wiki'

const wiki = createWiki()

await wiki.createPage({
  title: 'Magic Sword',
  content: 'A powerful enchanted blade.'
})

await wiki.createPage({
  title: 'Fire Magic',
  content: 'The art of controlling flames.'
})

await wiki.createPage({
  title: 'Basic Training',
  content: 'Learn to wield a sword effectively.'
})

// Search for "magic"
const results = wiki.search('magic')
console.log(results.map(p => p.title))
// ['Magic Sword', 'Fire Magic']
// Note: "Basic Training" matches "sword" not "magic"

// Search for "sword"
const swordResults = wiki.search('sword')
console.log(swordResults.map(p => p.title))
// ['Magic Sword', 'Basic Training']
```

Search is case-insensitive and matches partial words.

## Step 2: Filter by Type and Tags

Use `listPages()` to filter pages by their type or tags.

```typescript
await wiki.createPage({
  title: 'Fireball',
  type: 'spell',
  tags: ['fire', 'offensive']
})

await wiki.createPage({
  title: 'Healing Light',
  type: 'spell',
  tags: ['holy', 'defensive']
})

await wiki.createPage({
  title: 'Dragon',
  type: 'creature',
  tags: ['fire', 'boss']
})

// Get all spells
const spells = wiki.listPages({ type: 'spell' })
console.log(spells.map(p => p.title))
// ['Fireball', 'Healing Light']

// Get pages with 'fire' tag
const firePages = wiki.listPages({ tags: ['fire'] })
console.log(firePages.map(p => p.title))
// ['Fireball', 'Dragon']

// Combine: spells with offensive tag
const offensiveSpells = wiki.listPages({ type: 'spell', tags: ['offensive'] })
console.log(offensiveSpells.map(p => p.title))
// ['Fireball']
```

## Step 3: Sort and Paginate

Control the order and limit results.

```typescript
// Sort by title alphabetically
const alphabetical = wiki.listPages({ sort: 'title', order: 'asc' })

// Sort by most recently modified
const recent = wiki.listPages({ sort: 'modified', order: 'desc' })

// Pagination: get pages 11-20
const page2 = wiki.listPages({ offset: 10, limit: 10 })

// Combine everything
const results = wiki.listPages({
  type: 'spell',
  sort: 'title',
  order: 'asc',
  limit: 10,
  offset: 0
})
```

## Complete Example

```typescript
import { createWiki, type Wiki } from '@motioneffector/wiki'

async function main() {
  const wiki = createWiki()

  // Create sample content
  await wiki.createPage({
    title: 'Fireball',
    content: 'Hurls a ball of fire at enemies.',
    type: 'spell',
    tags: ['fire', 'offensive', 'aoe']
  })

  await wiki.createPage({
    title: 'Ice Lance',
    content: 'Pierces a single target with ice.',
    type: 'spell',
    tags: ['ice', 'offensive', 'single-target']
  })

  await wiki.createPage({
    title: 'Healing Wave',
    content: 'Restores health to allies.',
    type: 'spell',
    tags: ['holy', 'defensive', 'healing']
  })

  await wiki.createPage({
    title: 'Fire Elemental',
    content: 'A creature made of living flame.',
    type: 'creature',
    tags: ['fire', 'summoned']
  })

  // Search examples
  console.log('--- Search "fire" ---')
  const fireSearch = wiki.search('fire')
  for (const page of fireSearch) {
    console.log(`  ${page.title} (${page.type})`)
  }

  console.log('\n--- All spells ---')
  const spells = wiki.listPages({ type: 'spell', sort: 'title', order: 'asc' })
  for (const spell of spells) {
    console.log(`  ${spell.title}`)
  }

  console.log('\n--- Offensive spells ---')
  const offensive = wiki.listPages({ type: 'spell', tags: ['offensive'] })
  for (const spell of offensive) {
    console.log(`  ${spell.title}: ${spell.tags?.join(', ')}`)
  }

  console.log('\n--- All fire-related ---')
  const fireTagged = wiki.getPagesByTag('fire')
  for (const page of fireTagged) {
    console.log(`  ${page.title} (${page.type})`)
  }
}

main()
```

## Variations

### Search with Field Restrictions

```typescript
// Search only titles
const titleMatches = wiki.search('fire', { fields: ['title'] })

// Search only content
const contentMatches = wiki.search('fire', { fields: ['content'] })

// Search tags
const tagMatches = wiki.search('offensive', { fields: ['tags'] })

// Combine with type filter
const fireSpells = wiki.search('fire', { type: 'spell' })

// Limit results
const top5 = wiki.search('fire', { limit: 5 })
```

### Building a Tag Cloud

```typescript
function getTagCloud(wiki: Wiki) {
  const allTags = wiki.getTags()

  return allTags.map(tag => ({
    tag,
    count: wiki.getPagesByTag(tag).length
  })).sort((a, b) => b.count - a.count)
}

const cloud = getTagCloud(wiki)
for (const { tag, count } of cloud) {
  console.log(`${tag}: ${count} pages`)
}
```

### Type-Based Navigation

```typescript
function getNavigationByType(wiki: Wiki) {
  const types = wiki.getTypes()

  return types.map(type => ({
    type,
    pages: wiki.getPagesByType(type).map(p => ({
      title: p.title,
      id: p.id
    }))
  }))
}

const nav = getNavigationByType(wiki)
for (const { type, pages } of nav) {
  console.log(`\n${type.toUpperCase()}`)
  for (const page of pages) {
    console.log(`  - ${page.title}`)
  }
}
```

### Paginated Listing

```typescript
function paginatedList(wiki: Wiki, page: number, perPage: number) {
  const offset = (page - 1) * perPage
  const pages = wiki.listPages({
    sort: 'modified',
    order: 'desc',
    limit: perPage,
    offset
  })

  const total = wiki.listPages().length

  return {
    pages,
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage)
  }
}

const result = paginatedList(wiki, 1, 10)
console.log(`Page ${result.page} of ${result.totalPages}`)
```

## Troubleshooting

### Search Returns No Results

**Symptom:** `search()` returns empty array for a term you know exists.

**Cause:** Search matches against the actual text. Check for typos or that the term isn't inside a wikilink.

**Solution:** Verify the content contains the exact text:
```typescript
const page = wiki.getPageByTitle('Known Page')
console.log(page?.content.includes('search term'))
```

### Tags Filter Not Working

**Symptom:** `listPages({ tags: ['x'] })` returns empty.

**Cause:** Tags are case-sensitive.

**Solution:** Ensure exact case match:
```typescript
const allTags = wiki.getTags()
console.log(allTags) // Check actual tag values
```

## See Also

- **[Organizing with Types and Tags](Guide-Organizing-With-Types-And-Tags)** - Best practices for categorization
- **[Search & Filter API](API-Search-And-Filter)** - Full reference
