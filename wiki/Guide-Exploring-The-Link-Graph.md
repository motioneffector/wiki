# Exploring the Link Graph

Visualize and analyze how your wiki pages connect. This guide covers getting the full graph, exploring neighborhoods, and analyzing wiki structure.

## Prerequisites

Before starting, you should:

- [Understand bidirectional links](Concept-Bidirectional-Links)
- Have a wiki with interconnected pages

## Overview

We'll explore the link graph by:

1. Getting the full graph with `getGraph()`
2. Exploring neighborhoods with `getConnectedPages()`
3. Combining with orphans and dead links for analysis

## Step 1: Get the Full Graph

`getGraph()` returns an adjacency list of all page connections.

```typescript
import { createWiki } from '@motioneffector/wiki'

const wiki = createWiki()

await wiki.createPage({
  title: 'Home',
  content: '[[About]] | [[Projects]]'
})

await wiki.createPage({
  title: 'About',
  content: 'Back to [[Home]].'
})

await wiki.createPage({
  title: 'Projects',
  content: '[[Project A]] | [[Project B]]'
})

const graph = wiki.getGraph()
console.log(graph)
// {
//   'home': ['about', 'projects'],
//   'about': ['home'],
//   'projects': ['project-a', 'project-b']
// }
```

The graph includes dead links (targets that don't exist as pages).

## Step 2: Explore Neighborhoods

`getConnectedPages()` finds pages within N links of a starting page.

```typescript
await wiki.createPage({ title: 'Project A', content: '[[Team]]' })
await wiki.createPage({ title: 'Project B', content: '' })
await wiki.createPage({ title: 'Team', content: '[[Alice]] | [[Bob]]' })
await wiki.createPage({ title: 'Alice', content: '' })
await wiki.createPage({ title: 'Bob', content: '' })

// Depth 1: direct connections only
const depth1 = wiki.getConnectedPages('projects', 1)
console.log(depth1.map(p => p.title))
// ['Projects', 'Project A', 'Project B', 'Home']
// Includes: outgoing links, backlinks, and self

// Depth 2: connections of connections
const depth2 = wiki.getConnectedPages('projects', 2)
console.log(depth2.map(p => p.title))
// ['Projects', 'Project A', 'Project B', 'Home', 'Team', 'About']

// Depth 0: just the page itself
const depth0 = wiki.getConnectedPages('projects', 0)
console.log(depth0.map(p => p.title))
// ['Projects']
```

## Step 3: Analyze Wiki Health

Combine graph tools to understand your wiki's structure.

```typescript
function analyzeWiki(wiki: Wiki) {
  const pages = wiki.listPages()
  const orphans = wiki.getOrphans()
  const deadLinks = wiki.getDeadLinks()
  const graph = wiki.getGraph()

  // Count connections
  const connectionCounts = pages.map(page => ({
    title: page.title,
    outgoing: wiki.getLinks(page.id).length,
    incoming: wiki.getBacklinks(page.id).length,
    total: wiki.getLinks(page.id).length + wiki.getBacklinks(page.id).length
  }))

  // Find most connected
  const mostConnected = connectionCounts
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // Find isolated clusters
  // (pages that aren't connected to the main wiki)

  return {
    totalPages: pages.length,
    totalLinks: Object.values(graph).flat().length,
    orphanCount: orphans.length,
    deadLinkCount: deadLinks.length,
    averageConnections: connectionCounts.reduce((sum, c) => sum + c.total, 0) / pages.length,
    mostConnected,
    orphans: orphans.map(p => p.title),
    missingPages: [...new Set(deadLinks.map(dl => dl.target))]
  }
}
```

## Complete Example

```typescript
import { createWiki, type Wiki, type WikiPage } from '@motioneffector/wiki'

async function main() {
  const wiki = createWiki()

  // Build a sample wiki
  await wiki.createPage({
    title: 'Main',
    content: '[[Characters]] | [[Locations]] | [[Plot]]'
  })

  await wiki.createPage({
    title: 'Characters',
    content: '[[Alice]] | [[Bob]] | [[Villain]]'
  })

  await wiki.createPage({
    title: 'Locations',
    content: '[[City]] | [[Forest]]'
  })

  await wiki.createPage({
    title: 'Alice',
    content: 'Lives in [[City]]. Friend of [[Bob]].'
  })

  await wiki.createPage({
    title: 'Bob',
    content: 'Lives in [[Forest]]. Friend of [[Alice]].'
  })

  await wiki.createPage({
    title: 'City',
    content: 'Home of [[Alice]].'
  })

  await wiki.createPage({
    title: 'Forest',
    content: 'Home of [[Bob]]. Hides the [[Secret Cave]].'
  })

  // An orphan page
  await wiki.createPage({
    title: 'Deleted Scene',
    content: 'This was cut from the story.'
  })

  // Analyze
  console.log('=== Wiki Graph Analysis ===\n')

  const graph = wiki.getGraph()
  console.log('Adjacency List:')
  for (const [pageId, links] of Object.entries(graph)) {
    const page = wiki.getPage(pageId)
    console.log(`  ${page?.title}: → ${links.join(', ') || '(none)'}`)
  }

  console.log('\n--- Neighborhood of Alice (depth 2) ---')
  const neighborhood = wiki.getConnectedPages('alice', 2)
  for (const page of neighborhood) {
    const depth = page.id === 'alice' ? 0 :
      wiki.getLinks('alice').map(l => wiki.resolveLink(l)).includes(page.id) ||
      wiki.getBacklinks('alice').includes(page.id) ? 1 : 2
    console.log(`  ${'  '.repeat(depth)}${page.title}`)
  }

  console.log('\n--- Health Report ---')
  console.log('Orphans:', wiki.getOrphans().map(p => p.title))
  console.log('Dead Links:', wiki.getDeadLinks().map(dl => dl.target))
}

main()
```

## Variations

### Building a Graph Visualization

```typescript
function toGraphViz(wiki: Wiki): string {
  const graph = wiki.getGraph()
  let dot = 'digraph Wiki {\n'
  dot += '  rankdir=LR;\n'
  dot += '  node [shape=box];\n\n'

  for (const [sourceId, targets] of Object.entries(graph)) {
    const source = wiki.getPage(sourceId)
    for (const targetId of targets) {
      const target = wiki.getPage(targetId)
      const targetLabel = target?.title ?? `[${targetId}]`
      dot += `  "${source?.title}" -> "${targetLabel}";\n`
    }
  }

  // Style dead link targets
  const deadTargets = new Set(wiki.getDeadLinks().map(dl => dl.target))
  for (const target of deadTargets) {
    dot += `  "${target}" [style=dashed, color=red];\n`
  }

  dot += '}\n'
  return dot
}

// Output can be rendered with Graphviz tools
console.log(toGraphViz(wiki))
```

### Finding Clusters

```typescript
function findClusters(wiki: Wiki): WikiPage[][] {
  const pages = wiki.listPages()
  const visited = new Set<string>()
  const clusters: WikiPage[][] = []

  for (const page of pages) {
    if (visited.has(page.id)) continue

    // Get all connected pages at max depth
    const cluster = wiki.getConnectedPages(page.id, 100)
    for (const p of cluster) {
      visited.add(p.id)
    }

    clusters.push(cluster)
  }

  return clusters.sort((a, b) => b.length - a.length)
}

const clusters = findClusters(wiki)
console.log(`Found ${clusters.length} clusters:`)
for (const [i, cluster] of clusters.entries()) {
  console.log(`  Cluster ${i + 1}: ${cluster.length} pages`)
  console.log(`    ${cluster.map(p => p.title).join(', ')}`)
}
```

### Path Finding

```typescript
function findPath(wiki: Wiki, fromId: string, toId: string): string[] | null {
  const visited = new Set<string>()
  const queue: Array<{ id: string; path: string[] }> = [
    { id: fromId, path: [fromId] }
  ]

  while (queue.length > 0) {
    const { id, path } = queue.shift()!

    if (id === toId) return path
    if (visited.has(id)) continue
    visited.add(id)

    // Try outgoing links
    for (const linkText of wiki.getLinks(id)) {
      const targetId = wiki.resolveLink(linkText)
      if (!visited.has(targetId)) {
        queue.push({ id: targetId, path: [...path, targetId] })
      }
    }

    // Try backlinks
    for (const backlinkId of wiki.getBacklinks(id)) {
      if (!visited.has(backlinkId)) {
        queue.push({ id: backlinkId, path: [...path, backlinkId] })
      }
    }
  }

  return null
}

const path = findPath(wiki, 'alice', 'forest')
if (path) {
  console.log('Path:', path.map(id => wiki.getPage(id)?.title).join(' → '))
}
```

## Troubleshooting

### Graph Shows Dead Links as Targets

**Symptom:** Graph values include IDs that don't have their own keys.

**Cause:** The page links to something that doesn't exist (a dead link).

**Solution:** This is expected. Filter if you only want existing pages:
```typescript
const graph = wiki.getGraph()
const existingOnly: Graph = {}
for (const [source, targets] of Object.entries(graph)) {
  existingOnly[source] = targets.filter(t => wiki.getPage(t) !== undefined)
}
```

### getConnectedPages Returns Empty

**Symptom:** `getConnectedPages()` returns empty array.

**Cause:** The page ID doesn't exist.

**Solution:** Verify the page exists first:
```typescript
const page = wiki.getPage('my-id')
if (page) {
  const connected = wiki.getConnectedPages('my-id')
}
```

## See Also

- **[Bidirectional Links](Concept-Bidirectional-Links)** - How links are tracked
- **[Dead Links & Orphans](Concept-Dead-Links-And-Orphans)** - Finding disconnected content
- **[Graph API](API-Graph)** - Full reference
