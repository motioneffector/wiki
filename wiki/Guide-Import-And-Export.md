# Import & Export

Move wiki data between systems, create backups, or merge wikis. This guide covers exporting to JSON, importing with different modes, and handling data correctly.

## Prerequisites

Before starting, you should:

- Have a wiki with some pages ([Your First Wiki](Your-First-Wiki))

## Overview

We'll import and export data by:

1. Exporting pages with `export()` or `toJSON()`
2. Importing pages with `import()` using different modes
3. Handling Date serialization correctly

## Step 1: Export Your Wiki

Get all pages as an array or JSON string.

```typescript
import { createWiki } from '@motioneffector/wiki'

const wiki = createWiki()

await wiki.createPage({
  title: 'Home',
  content: 'Welcome to [[About]].'
})

await wiki.createPage({
  title: 'About',
  content: 'About this wiki.',
  tags: ['meta']
})

// Export as array of page objects
const pages = wiki.export()
console.log(pages.length) // 2

// Export as JSON string (for saving to file)
const json = wiki.toJSON()
console.log(json)
// [{"id":"home","title":"Home","content":"Welcome to [[About]].","created":"2024-01-01T...","modified":"2024-01-01T..."},...]
```

`export()` returns page objects with Date fields as Date objects. `toJSON()` returns a JSON string with dates serialized to ISO strings.

## Step 2: Import Data

Load pages into a wiki using different import modes.

```typescript
import { createWiki, type WikiPage } from '@motioneffector/wiki'

const newWiki = createWiki()

const pagesToImport: WikiPage[] = [
  {
    id: 'home',
    title: 'Home',
    content: 'Welcome!',
    created: new Date(),
    modified: new Date()
  },
  {
    id: 'about',
    title: 'About',
    content: 'About us.',
    created: new Date(),
    modified: new Date()
  }
]

// Import with replace mode (default) - clears existing, adds new
const count = await newWiki.import(pagesToImport, { mode: 'replace' })
console.log(`Imported ${count} pages`)
```

### Import Modes

```typescript
// Replace: Clear wiki first, then import all
await wiki.import(pages, { mode: 'replace' })

// Merge: Keep existing, add new, overwrite conflicts by ID
await wiki.import(pages, { mode: 'merge' })

// Skip: Keep existing, only add pages with new IDs
await wiki.import(pages, { mode: 'skip' })
```

## Step 3: Handle JSON Serialization

When loading from JSON, dates come back as strings and need conversion.

```typescript
// Save to file
const json = wiki.toJSON()
await fs.writeFile('wiki-backup.json', json)

// Load from file
const loaded = await fs.readFile('wiki-backup.json', 'utf-8')
const pages = JSON.parse(loaded)

// Import handles date conversion automatically
const newWiki = createWiki()
await newWiki.import(pages, { mode: 'replace' })

// Dates are restored as Date objects
const home = newWiki.getPage('home')
console.log(home?.created instanceof Date) // true
```

## Complete Example

```typescript
import { createWiki, type Wiki, type WikiPage } from '@motioneffector/wiki'

async function main() {
  // Create source wiki with content
  const sourceWiki = createWiki()

  await sourceWiki.createPage({
    title: 'Characters',
    content: 'Main: [[Hero]]. Villain: [[Shadow]].',
    type: 'index'
  })

  await sourceWiki.createPage({
    title: 'Hero',
    content: 'The protagonist.',
    type: 'character',
    tags: ['protagonist']
  })

  await sourceWiki.createPage({
    title: 'Shadow',
    content: 'The antagonist.',
    type: 'character',
    tags: ['antagonist']
  })

  // Export to JSON
  const backup = sourceWiki.toJSON()
  console.log('Backup created:', backup.length, 'bytes')

  // Simulate sending to another system
  const targetWiki = createWiki()

  // Import the backup
  const parsed = JSON.parse(backup)
  const imported = await targetWiki.import(parsed, { mode: 'replace' })
  console.log('Imported:', imported, 'pages')

  // Verify everything works
  console.log('\nPages:', targetWiki.listPages().map(p => p.title))
  console.log('Types:', targetWiki.getTypes())
  console.log('Tags:', targetWiki.getTags())
  console.log('Links from Characters:', targetWiki.getLinks('characters'))
}

main()
```

## Variations

### Full Backup and Restore

```typescript
import { writeFile, readFile } from 'fs/promises'

async function backupWiki(wiki: Wiki, path: string) {
  const json = wiki.toJSON()
  await writeFile(path, json, 'utf-8')
  console.log(`Backed up ${wiki.listPages().length} pages to ${path}`)
}

async function restoreWiki(path: string): Promise<Wiki> {
  const json = await readFile(path, 'utf-8')
  const pages = JSON.parse(json)

  const wiki = createWiki()
  await wiki.import(pages, { mode: 'replace' })

  console.log(`Restored ${wiki.listPages().length} pages from ${path}`)
  return wiki
}

// Usage
await backupWiki(wiki, './backup.json')
const restored = await restoreWiki('./backup.json')
```

### Merging Two Wikis

```typescript
async function mergeWikis(target: Wiki, source: Wiki) {
  const sourcePages = source.export()

  // Merge mode: adds new pages, overwrites existing with same ID
  const merged = await target.import(sourcePages, { mode: 'merge' })

  console.log(`Merged ${merged} pages into target wiki`)
  console.log(`Target now has ${target.listPages().length} pages`)
}
```

### Selective Import

```typescript
async function importByType(target: Wiki, pages: WikiPage[], types: string[]) {
  const filtered = pages.filter(p => p.type && types.includes(p.type))

  const count = await target.import(filtered, { mode: 'merge' })
  console.log(`Imported ${count} pages of types: ${types.join(', ')}`)
}

// Only import characters
const allPages = JSON.parse(backup)
await importByType(newWiki, allPages, ['character'])
```

### Import with Events

```typescript
// By default, import doesn't fire events (for performance)
await wiki.import(pages, { mode: 'replace', emitEvents: false })

// Enable events if you need them
wiki.onChange((event) => {
  console.log(`${event.type}: ${event.page.title}`)
})

await wiki.import(pages, { mode: 'replace', emitEvents: true })
// Console: "create: Home", "create: About", etc.
```

## Troubleshooting

### Dates Are Strings After Import

**Symptom:** `page.created` is a string instead of a Date.

**Cause:** This shouldn't happen - import automatically converts ISO strings to Dates.

**Solution:** Verify you're using `import()` not manual assignment:
```typescript
// Wrong
const pages = JSON.parse(json)
for (const page of pages) {
  // Manual assignment doesn't convert dates
}

// Right
await wiki.import(JSON.parse(json), { mode: 'replace' })
```

### Links Not Working After Import

**Symptom:** `getLinks()` or `getBacklinks()` return empty after import.

**Cause:** This shouldn't happen - import rebuilds all link indexes.

**Solution:** Verify the import completed:
```typescript
const count = await wiki.import(pages, { mode: 'replace' })
console.log(`Imported ${count} pages`)
console.log(`Links indexed: ${wiki.listPages().flatMap(p => wiki.getLinks(p.id)).length}`)
```

### Import Validation Errors

**Symptom:** Import throws "Each page must have an id/title field".

**Cause:** The page objects are missing required fields.

**Solution:** Ensure all pages have at minimum `id`, `title`, `content`, `created`, `modified`:
```typescript
const validPage: WikiPage = {
  id: 'my-page',
  title: 'My Page',
  content: 'Content here',
  created: new Date(),
  modified: new Date()
}
```

## See Also

- **[Storage](Concept-Storage)** - Understanding persistence
- **[Custom Storage Adapters](Guide-Custom-Storage-Adapters)** - Building persistent backends
- **[Import/Export API](API-Import-Export)** - Full reference
