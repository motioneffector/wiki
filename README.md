# @motioneffector/wiki

A TypeScript library for creating interconnected knowledge bases with bidirectional linking and graph analysis.

[![npm version](https://img.shields.io/npm/v/@motioneffector/wiki.svg)](https://www.npmjs.com/package/@motioneffector/wiki)
[![license](https://img.shields.io/npm/l/@motioneffector/wiki.svg)](https://github.com/motioneffector/wiki/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

**[Try the interactive demo →](https://motioneffector.github.io/wiki/)**

## Features

- **Bidirectional Linking** - Links tracked automatically in both directions
- **Dead Link Detection** - Find and manage broken links across pages
- **Graph Analysis** - Explore connection depth and page relationships
- **Flexible Storage** - Custom storage adapters for any backend
- **Search & Filtering** - Query by title, content, tags, and types
- **Event System** - React to page creation, updates, and deletions
- **Import/Export** - Portable JSON format for data management
- **Zero Dependencies** - Lightweight with no external runtime dependencies

[Read the full manual →](https://github.com/motioneffector/wiki#readme)

## Quick Start

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
  content: 'Link back to [[Home]] anytime.'
})

// Get backlinks automatically
const homePage = wiki.getPageByTitle('Home')
const backlinks = wiki.getBacklinks(homePage.id) // ['getting-started']

// Find dead links
const deadLinks = wiki.getDeadLinks() // [{ source: 'home', target: 'features' }]
```

## Testing & Validation

- **Comprehensive test suite** - 379 unit tests covering core functionality
- **Fuzz tested** - Randomized input testing to catch edge cases
- **Strict TypeScript** - Full type coverage with no `any` types
- **Zero dependencies** - No supply chain risk

## License

MIT © [motioneffector](https://github.com/motioneffector)
