# @motioneffector/wiki

A wiki is a web of interconnected pages. This library handles the messy bookkeeping of link tracking so you can focus on your content. When you write `[[Page Title]]`, the library extracts those links, tracks them bidirectionally, and lets you query the relationship graph.

## I want to...

| Goal | Where to go |
|------|-------------|
| Get up and running quickly | [Your First Wiki](Your-First-Wiki) |
| Understand how pages and links work | [Pages & Links](Concept-Pages-And-Links) |
| Find what links to a page (backlinks) | [Working with Backlinks](Guide-Working-With-Backlinks) |
| Find broken links in my wiki | [Managing Dead Links](Guide-Managing-Dead-Links) |
| Search and filter pages | [Searching Pages](Guide-Searching-Pages) |
| Export/import my data | [Import & Export](Guide-Import-And-Export) |
| Build a custom storage backend | [Custom Storage Adapters](Guide-Custom-Storage-Adapters) |
| Look up a specific method | [Core API](API-Core) |

## Key Concepts

### Pages

The fundamental unit of content. A page has an id (auto-generated from title), title, content with `[[wikilinks]]`, optional type and tags, and timestamps for creation and modification.

### Wikilinks

The `[[Page Title]]` syntax for linking between pages. Links are automatically extracted from content and tracked. You can also use `[[Page Title|Display Text]]` for custom display text.

### Bidirectional Links

When page A links to page B, the library tracks this relationship in both directions. You can query what a page links to (outgoing) and what links to it (incoming backlinks) without maintaining these indexes yourself.

## Quick Example

```typescript
import { createWiki } from '@motioneffector/wiki'

// Create a wiki instance
const wiki = createWiki()

// Create pages with [[wikilinks]]
await wiki.createPage({
  title: 'Home',
  content: 'Welcome! Check out [[Getting Started]] and [[Features]].'
})

await wiki.createPage({
  title: 'Getting Started',
  content: 'Start here. Back to [[Home]].'
})

// Get backlinks - who links to "Getting Started"?
const page = wiki.getPageByTitle('Getting Started')
const backlinks = wiki.getBacklinks(page.id)
console.log(backlinks) // ['home']

// Find dead links - "Features" doesn't exist yet
const deadLinks = wiki.getDeadLinks()
console.log(deadLinks) // [{ source: 'home', target: 'Features' }]
```

---

**[Full API Reference →](API-Core)**
