# Links API

Functions for querying link relationships between pages.

---

## `wiki.getLinks()`

Gets the outgoing links from a page (what the page links to).

**Signature:**

```typescript
getLinks(id: string): string[]
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | The page ID |

**Returns:** `string[]` — Array of link texts as written in content

**Example:**

```typescript
await wiki.createPage({
  title: 'Story',
  content: 'The [[Hero]] found the [[Magic Sword]].'
})

const links = wiki.getLinks('story')
console.log(links) // ['Hero', 'Magic Sword']
```

---

## `wiki.getBacklinks()`

Gets pages that link to this page.

**Signature:**

```typescript
getBacklinks(id: string): string[]
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | The target page ID |

**Returns:** `string[]` — Array of page IDs that link to this page

**Example:**

```typescript
await wiki.createPage({ title: 'Hero', content: '' })
await wiki.createPage({ title: 'Story', content: 'The [[Hero]] wins.' })
await wiki.createPage({ title: 'Ending', content: 'The [[Hero]] celebrates.' })

const backlinks = wiki.getBacklinks('hero')
console.log(backlinks) // ['story', 'ending']
```

---

## `wiki.getLinkedPages()`

Gets full page objects for pages this page links to.

**Signature:**

```typescript
getLinkedPages(id: string): WikiPage[]
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | The source page ID |

**Returns:** `WikiPage[]` — Array of linked pages (excludes dead links)

**Example:**

```typescript
await wiki.createPage({ title: 'Hero', content: '' })
await wiki.createPage({
  title: 'Story',
  content: '[[Hero]] and [[Missing]]'
})

const linkedPages = wiki.getLinkedPages('story')
console.log(linkedPages.length) // 1 (only Hero exists)
console.log(linkedPages[0].title) // 'Hero'
```

---

## `wiki.getBacklinkPages()`

Gets full page objects for pages that link to this page.

**Signature:**

```typescript
getBacklinkPages(id: string): WikiPage[]
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | The target page ID |

**Returns:** `WikiPage[]` — Array of pages that link here

**Example:**

```typescript
const backlinkPages = wiki.getBacklinkPages('hero')
for (const page of backlinkPages) {
  console.log(`${page.title} links to Hero`)
}
```

---

## `wiki.resolveLink()`

Converts link text to a page ID.

**Signature:**

```typescript
resolveLink(linkText: string): string
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `linkText` | `string` | Yes | The link text from `[[...]]` |

**Returns:** `string` — The slugified page ID

**Example:**

```typescript
const id = wiki.resolveLink('King Aldric')
console.log(id) // 'king-aldric'

const id = wiki.resolveLink('Café München')
console.log(id) // 'cafe-munchen'
```

---

## `wiki.resolveLinkToPage()`

Converts link text to the target page, if it exists.

**Signature:**

```typescript
resolveLinkToPage(linkText: string): WikiPage | undefined
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `linkText` | `string` | Yes | The link text from `[[...]]` |

**Returns:** `WikiPage | undefined` — The target page if it exists

**Example:**

```typescript
await wiki.createPage({ title: 'King Aldric', content: '' })

const page = wiki.resolveLinkToPage('King Aldric')
if (page) {
  console.log(page.id) // 'king-aldric'
}

const missing = wiki.resolveLinkToPage('Unknown')
console.log(missing) // undefined
```
