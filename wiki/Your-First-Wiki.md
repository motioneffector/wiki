# Your First Wiki

Build a working wiki with interconnected pages in about 5 minutes.

By the end of this guide, you'll have a wiki with three pages, links between them, and you'll know how to query backlinks and detect dead links.

## What We're Building

A small knowledge base with a Home page linking to two other pages. We'll see how the library automatically tracks these relationships and helps find broken links.

## Step 1: Create a Wiki Instance

First, import and create a wiki. The default configuration stores everything in memory.

```typescript
import { createWiki } from '@motioneffector/wiki'

const wiki = createWiki()
```

The wiki starts empty. All operations for creating and querying pages go through this instance.

## Step 2: Create Your First Page

Create a Home page with links to other pages using `[[wikilink]]` syntax.

```typescript
await wiki.createPage({
  title: 'Home',
  content: `
    Welcome to my wiki!

    Check out [[About]] for more information,
    or jump to [[Projects]] to see what I'm working on.
  `
})
```

The library automatically extracts `About` and `Projects` as links from this content. Note that these pages don't exist yet - that's fine, they become "dead links" we can query.

## Step 3: Create Linked Pages

Now create the pages that Home links to.

```typescript
await wiki.createPage({
  title: 'About',
  content: 'This wiki is about my work. Back to [[Home]].'
})

await wiki.createPage({
  title: 'Projects',
  content: 'Current projects: [[Project Alpha]]. See also [[About]].'
})
```

Each page can link to any other page, including pages that don't exist yet.

## Step 4: Query Backlinks

Find out what pages link to a specific page.

```typescript
// Get the About page
const aboutPage = wiki.getPageByTitle('About')

// What links to About?
const backlinks = wiki.getBacklinks(aboutPage.id)
console.log(backlinks)
// Output: ['home', 'projects']

// Get full page objects instead of just IDs
const backlinkPages = wiki.getBacklinkPages(aboutPage.id)
console.log(backlinkPages.map(p => p.title))
// Output: ['Home', 'Projects']
```

Backlinks update automatically when you create, update, or delete pages.

## Step 5: Find Dead Links

Dead links point to pages that don't exist. Find them across your entire wiki.

```typescript
const deadLinks = wiki.getDeadLinks()
console.log(deadLinks)
// Output: [{ source: 'projects', target: 'Project Alpha' }]
```

The `Projects` page links to `[[Project Alpha]]`, but we never created that page. You can fix this by creating the missing page:

```typescript
await wiki.createPage({
  title: 'Project Alpha',
  content: 'My first project. Part of [[Projects]].'
})

// Dead links is now empty
console.log(wiki.getDeadLinks())
// Output: []
```

## The Complete Code

Here's everything together:

```typescript
import { createWiki } from '@motioneffector/wiki'

const wiki = createWiki()

// Create interconnected pages
await wiki.createPage({
  title: 'Home',
  content: `
    Welcome to my wiki!
    Check out [[About]] for more information,
    or jump to [[Projects]] to see what I'm working on.
  `
})

await wiki.createPage({
  title: 'About',
  content: 'This wiki is about my work. Back to [[Home]].'
})

await wiki.createPage({
  title: 'Projects',
  content: 'Current projects: [[Project Alpha]]. See also [[About]].'
})

// Query relationships
const aboutPage = wiki.getPageByTitle('About')
const backlinks = wiki.getBacklinks(aboutPage.id)
console.log('What links to About:', backlinks)

// Find broken links
const deadLinks = wiki.getDeadLinks()
console.log('Dead links:', deadLinks)

// Fix the dead link
await wiki.createPage({
  title: 'Project Alpha',
  content: 'My first project. Part of [[Projects]].'
})

console.log('Dead links after fix:', wiki.getDeadLinks())
```

## What's Next?

Now that you have the basics:

- **[Understand pages and links deeper](Concept-Pages-And-Links)** - Learn about IDs, link syntax, and how extraction works
- **[Work with backlinks](Guide-Working-With-Backlinks)** - Build "what links here" features
- **[Manage dead links](Guide-Managing-Dead-Links)** - Keep your wiki healthy
- **[Explore the API](API-Core)** - Full reference when you need details
