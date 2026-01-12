# @motioneffector/wiki - Test Specification

## Overview

Test-driven development specification for the wiki/knowledge base library. Each test case should be specific enough that implementation behavior is unambiguous.

### Design Decisions

These decisions inform all test specifications:

1. **Link Resolution**: Links are resolved by normalizing the link text to an ID (slug). `[[Kingdom of Aldoria]]` matches the page with ID `kingdom-of-aldoria`, regardless of whether the page title is "Kingdom of Aldoria" or "kingdom of aldoria".

2. **Code Block Handling**: Links inside fenced code blocks (` ``` `) and inline code (`` ` ``) are NOT extracted. They are treated as literal text.

3. **Display Text Syntax**: The library supports `[[Page Title|Display Text]]` syntax where the link targets "Page Title" but the raw text shows "Display Text".

---

## 1. Wiki Creation

### `createWiki(options?)`

```
✓ creates wiki instance with no options
✓ accepts storage adapter option
✓ accepts custom link pattern option (regex)
✓ starts with no pages (listPages returns empty array)
✓ returns object with all documented methods
```

### Default Options

```
✓ uses memoryStorage() when no storage provided
✓ uses /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g as default link pattern
```

### Options Validation

```
✓ throws TypeError if storage is provided but doesn't implement WikiStorage interface
✓ throws TypeError if linkPattern is provided but is not a RegExp
✓ throws Error if linkPattern has no capture group
```

---

## 2. Page Creation

### `wiki.createPage(data)` - Basic

```
✓ creates page with title and content
✓ returns the created WikiPage object
✓ page is immediately retrievable via getPage()
✓ page is immediately retrievable via getPageByTitle()
```

### ID Handling

```
✓ generates id from title if not provided: 'King Aldric I' → 'king-aldric-i'
✓ uses provided id exactly if given
✓ throws Error with message "Page with id 'x' already exists" if id exists
✓ appends incrementing number if generated slug exists: 'king-aldric-i-2', 'king-aldric-i-3'
```

### ID Generation (Slugification)

```
✓ lowercases: 'King Aldric' → 'king-aldric'
✓ replaces spaces with hyphens: 'New York City' → 'new-york-city'
✓ removes special characters: 'Hello, World!' → 'hello-world'
✓ handles multiple consecutive spaces: 'Hello   World' → 'hello-world'
✓ handles leading/trailing spaces: '  King  ' → 'king'
✓ handles unicode letters: 'Café München' → 'cafe-munchen' (removes diacritics)
✓ preserves numbers: 'World War 2' → 'world-war-2'
✓ handles titles starting with numbers: '1984' → '1984'
✓ handles titles that are only numbers: '42' → '42'
✓ handles CJK characters: '東京' → generates valid slug (implementation-defined)
✓ handles emoji: 'Hello 🌍' → 'hello' (strips emoji)
✓ handles title that slugifies to empty string: generates fallback id 'page-1', 'page-2'
```

### Timestamps

```
✓ sets created to current Date
✓ sets modified equal to created on initial creation
✓ timestamps are Date objects, not strings
```

### Optional Fields

```
✓ accepts optional type field (string)
✓ accepts optional tags field (string array)
✓ omitted type is undefined (not null or empty string)
✓ omitted tags is undefined (not null or empty array)
```

### Validation Errors

```
✓ throws Error "Title is required" if title is undefined
✓ throws Error "Title is required" if title is null
✓ throws Error "Title cannot be empty" if title is empty string
✓ throws Error "Title cannot be empty" if title is only whitespace
✓ accepts empty string content (creates page with no content)
✓ accepts undefined content (defaults to empty string)
✓ throws TypeError "Tags must be an array" if tags is not an array
✓ throws TypeError "Each tag must be a non-empty string" if tags contains non-strings
✓ throws TypeError "Each tag must be a non-empty string" if tags contains empty strings
✓ throws TypeError "Type must be a string" if type is not a string
```

### Link Extraction on Create

```
✓ extracts links from content and stores them
✓ links are queryable immediately via getLinks()
✓ backlinks on target pages are updated immediately
```

### WikiPage Structure

```typescript
interface WikiPage {
  id: string              // Unique identifier (slug)
  title: string           // Display title
  content: string         // Markdown with [[wiki links]]
  type?: string           // Category: 'person', 'place', 'event', etc.
  tags?: string[]         // Array of tag strings
  created: Date           // Creation timestamp
  modified: Date          // Last modification timestamp
}
```

---

## 3. Page Retrieval

### `wiki.getPage(id)`

```
✓ returns WikiPage object for existing page
✓ returns undefined for non-existent id
✓ returns undefined for empty string id
✓ returns undefined for null/undefined id (does not throw)
✓ id lookup is case-sensitive: getPage('King') !== getPage('king')
```

### `wiki.getPageByTitle(title)`

```
✓ returns WikiPage for exact title match
✓ returns undefined if title not found
✓ returns undefined for empty string title
✓ returns undefined for null/undefined title (does not throw)
✓ is case-sensitive by default: getPageByTitle('King') !== getPageByTitle('king')
```

### `wiki.getPageByTitle(title, options)`

```
✓ { ignoreCase: true } matches case-insensitively
✓ { ignoreCase: true } returns first match if multiple titles differ only by case
✓ { ignoreCase: false } is same as default (case-sensitive)
```

---

## 4. Page Updates

### `wiki.updatePage(id, data)` - Basic

```
✓ updates specified fields only
✓ preserves fields not included in data
✓ returns the updated WikiPage object
✓ updates modified timestamp to current Date
✓ does NOT update created timestamp
```

### Field Updates

```
✓ can update title
✓ can update content
✓ can update type
✓ can update tags
✓ can set type to undefined to remove it
✓ can set tags to undefined to remove them
✓ cannot change id (id field in data is ignored)
```

### Link Re-extraction

```
✓ re-extracts links when content changes
✓ updates backlinks: removes backlinks for links no longer present
✓ updates backlinks: adds backlinks for new links
✓ does not re-extract if content unchanged (other fields only)
```

### Errors

```
✓ throws Error "Page 'x' not found" if page doesn't exist
✓ throws same validation errors as createPage for invalid field values
```

### `wiki.renamePage(id, newTitle, options?)`

```
✓ changes page title to newTitle
✓ updates modified timestamp
✓ returns the updated WikiPage object
```

### Rename with ID Update

```
✓ { updateId: true } changes id to new slug from newTitle
✓ { updateId: true } throws if new id already exists
✓ { updateId: false } keeps original id (default)
✓ { updateId: true } updates all pages that link to this page (changes [[Old Title]] to [[New Title]])
```

### Rename Validation

```
✓ throws Error "Page 'x' not found" if page doesn't exist
✓ throws Error "Title cannot be empty" if newTitle is empty
```

---

## 5. Page Deletion

### `wiki.deletePage(id)`

```
✓ removes page from wiki
✓ subsequent getPage(id) returns undefined
✓ subsequent getPageByTitle() returns undefined
✓ removes page from listPages() results
✓ cleans up: page no longer appears in getOrphans()
```

### Backlink Updates on Delete

```
✓ pages that linked to deleted page now have dead links
✓ getDeadLinks() includes the now-dead links
✓ backlinks pointing TO deleted page are not automatically removed from source content
```

### Options

```
✓ { updateLinks: false } skips backlink processing (faster for bulk delete)
✓ { updateLinks: true } is the default
```

### Errors

```
✓ throws Error "Page 'x' not found" if page doesn't exist
```

---

## 6. Link Extraction

### Basic Extraction

```
✓ extracts [[Page Title]] from content
✓ extracts multiple distinct links
✓ deduplicates: same link appearing twice is extracted once
✓ handles links at very start of content: '[[Link]] rest of text'
✓ handles links at very end of content: 'text [[Link]]'
✓ handles adjacent links: '[[A]][[B]]' extracts both
✓ handles links separated by single character: '[[A]]/[[B]]'
```

### Display Text Syntax

```
✓ extracts [[Page Title|Display Text]] - target is 'Page Title'
✓ display text is preserved in raw content, not modified
✓ getLinks() returns 'Page Title', not 'Display Text'
✓ handles empty display text: [[Page|]] - target is 'Page'
✓ handles pipe in display text: [[Page|a|b]] - target is 'Page', display is 'a|b'
```

### Whitespace Handling

```
✓ trims whitespace from link target: [[  King Aldric  ]] → 'King Aldric'
✓ preserves internal whitespace: [[New York City]] → 'New York City'
✓ trims whitespace with display text: [[  Page  |  Text  ]] → target 'Page'
✓ handles newline in link: content "[[Broken\nLink]]" is NOT a valid link
```

### Code Block Exclusion

```
✓ ignores links in fenced code blocks: ```\n[[Not a Link]]\n```
✓ ignores links in indented code blocks (4 spaces)
✓ ignores links in inline code: `[[Not a Link]]`
✓ extracts link adjacent to code: `code` [[Real Link]] extracts 'Real Link'
✓ handles nested backticks correctly
```

### Edge Cases

```
✓ empty link text: [[]] is ignored (not extracted)
✓ whitespace-only link: [[   ]] is ignored
✓ unclosed bracket: [[Missing End is ignored
✓ extra brackets: [[[Triple]]] extracts 'Triple' (outermost pair)
✓ nested brackets: [[Outer [[Inner]] End]] extracts 'Outer [[Inner' (greedy match)
✓ special characters in link: [[Hello, World!]] extracts 'Hello, World!'
✓ unicode in link: [[日本語]] extracts '日本語'
✓ very long link text (1000+ chars): extracts successfully
```

### Custom Link Pattern

```
✓ respects custom pattern: {{Page}} with /\{\{([^}]+)\}\}/g
✓ custom pattern must have capture group for link text
✓ custom pattern can include display text support if designed for it
```

---

## 7. Link Resolution

### How Links Map to Pages

```
✓ [[Kingdom of Aldoria]] matches page with id 'kingdom-of-aldoria'
✓ [[kingdom of aldoria]] also matches page with id 'kingdom-of-aldoria'
✓ [[KINGDOM OF ALDORIA]] also matches page with id 'kingdom-of-aldoria'
✓ resolution is by ID normalization, not title string matching
```

### Dead Link Detection

```
✓ link to non-existent page id is a dead link
✓ [[Nonexistent Page]] is dead if no page has id 'nonexistent-page'
✓ creating page resolves its dead links (no longer dead)
✓ deleting page creates new dead links
```

### `wiki.resolveLink(linkText)`

Utility for manually resolving link text to a page ID. Useful for consumers who need to check link validity or build custom link handling.

```
✓ returns normalized page ID for valid link text
✓ 'Kingdom of Aldoria' → 'kingdom-of-aldoria'
✓ 'kingdom of aldoria' → 'kingdom-of-aldoria' (case-insensitive)
✓ '  King Aldric  ' → 'king-aldric' (trims whitespace)
✓ returns the ID regardless of whether page exists (pure normalization)
✓ does NOT check if page exists (use wiki.getPage(wiki.resolveLink(text)) for that)
```

### `wiki.resolveLinkToPage(linkText)`

Convenience method combining resolution and lookup.

```
✓ returns WikiPage if link resolves to existing page
✓ returns undefined if link resolves to non-existent page
✓ equivalent to wiki.getPage(wiki.resolveLink(linkText))
```

---

## 8. Link Queries

### `wiki.getLinks(id)` - Outgoing Links

```
✓ returns array of link targets (strings) this page links to
✓ returns the link text as written, not the resolved page title
✓ returns empty array if page has no links
✓ returns empty array if page doesn't exist (not undefined)
✓ does not include dead links differently - all extracted links returned
✓ deduplicates: each target appears once even if linked multiple times
```

### `wiki.getBacklinks(id)` - Incoming Links

```
✓ returns array of page IDs that link to this page
✓ returns empty array if no pages link to this page
✓ returns empty array if page doesn't exist (not undefined)
✓ uses ID normalization: getBacklinks('kingdom-of-aldoria') finds [[Kingdom of Aldoria]]
```

### `wiki.getLinkedPages(id)` - Resolved Outgoing

```
✓ returns array of WikiPage objects for outgoing links
✓ only includes pages that exist (filters out dead links)
✓ returns empty array if all links are dead
✓ returns empty array if page has no links
✓ returns empty array if page doesn't exist
```

### `wiki.getBacklinkPages(id)` - Resolved Incoming

```
✓ returns array of WikiPage objects that link to this page
✓ returns empty array if no pages link to this page
✓ returns empty array if page doesn't exist
```

---

## 9. Dead Links & Orphans

### `wiki.getDeadLinks()`

```
✓ returns array of { source: string, target: string } objects
✓ source is the page ID containing the dead link
✓ target is the link text (not normalized)
✓ returns empty array if no dead links exist
✓ same dead link from multiple pages appears multiple times (once per source)
```

### `wiki.getDeadLinksForPage(id)`

```
✓ returns array of target strings (dead link texts) for specific page
✓ returns empty array if page has no dead links
✓ returns empty array if page doesn't exist
```

### `wiki.getOrphans()`

```
✓ returns array of WikiPage objects with no incoming links
✓ a page with only dead links TO it is still an orphan (dead links don't count)
✓ a page that links to others but has no incoming links is an orphan
✓ returns empty array if all pages have at least one backlink
✓ newly created page with no backlinks is an orphan
```

### Orphan Edge Cases

```
✓ page linking to itself is NOT an orphan (self-link counts)
✓ single page wiki: that page is an orphan
✓ two pages linking to each other: neither is an orphan
```

---

## 10. Link Graph

### `wiki.getGraph()`

```
✓ returns adjacency list as Record<string, string[]>
✓ keys are page IDs
✓ values are arrays of linked page IDs (normalized from link text)
✓ includes pages with no outgoing links (empty array value)
✓ dead links are included (links to non-existent IDs)
✓ returns empty object if wiki has no pages
```

### Graph Structure Example

```typescript
// Pages: 'king-aldric' links to Kingdom and Battle
//        'kingdom-of-aldoria' links back to King
//        'battle-of-five-rivers' has no links
{
  'king-aldric': ['kingdom-of-aldoria', 'battle-of-five-rivers'],
  'kingdom-of-aldoria': ['king-aldric'],
  'battle-of-five-rivers': []
}
```

### `wiki.getConnectedPages(id, depth?)`

```
✓ returns array of WikiPage objects within N links of given page
✓ default depth is 1 (direct links and backlinks only)
✓ depth 0 returns only the page itself
✓ depth 2 includes pages linked from directly linked pages
✓ includes both outgoing and incoming connections
✓ handles cycles without infinite loop
✓ does not include duplicates (page appears once even if reachable multiple ways)
✓ returns empty array if page doesn't exist
✓ returns [self] if page exists but has no connections (depth >= 0)
```

### Cycle Handling

```
✓ A → B → A: getConnectedPages('a', 10) returns [A, B] (no infinite loop)
✓ A → B → C → A: properly traverses full cycle once
✓ complex graph with multiple cycles terminates correctly
```

---

## 11. Page Listing

### `wiki.listPages()`

```
✓ returns array of all WikiPage objects
✓ returns empty array if wiki has no pages
✓ default sort order is by created date descending (newest first)
```

### `wiki.listPages(options)` - Filtering

```
✓ { type: 'person' } returns only pages with type 'person'
✓ { type: 'person' } returns empty array if no pages have that type
✓ { tags: ['magic'] } returns pages with 'magic' tag
✓ { tags: ['magic', 'fire'] } returns pages with ANY of the tags (OR logic)
✓ { tags: [] } returns all pages (no tag filter)
✓ { type: 'person', tags: ['royalty'] } combines filters (AND logic)
```

### `wiki.listPages(options)` - Sorting

```
✓ { sort: 'title' } sorts alphabetically by title
✓ { sort: 'created' } sorts by creation date
✓ { sort: 'modified' } sorts by modification date
✓ { order: 'asc' } sorts ascending
✓ { order: 'desc' } sorts descending (default)
✓ { sort: 'title', order: 'asc' } combines sort and order
```

### `wiki.listPages(options)` - Pagination

```
✓ { limit: 10 } returns at most 10 pages
✓ { offset: 5 } skips first 5 pages
✓ { limit: 10, offset: 5 } returns pages 6-15
✓ { offset: 1000 } returns empty array if offset exceeds total
✓ { limit: 0 } returns empty array
```

---

## 12. Search

### `wiki.search(query)` - Basic

```
✓ searches page titles and content by default
✓ returns array of WikiPage objects
✓ case-insensitive: 'king' matches 'King Aldric'
✓ partial match: 'ald' matches 'Aldric' and 'Aldoria'
✓ returns empty array if no matches
✓ returns empty array for empty string query
✓ returns empty array for whitespace-only query
```

### Search Options

```
✓ { fields: ['title'] } searches only titles
✓ { fields: ['content'] } searches only content
✓ { fields: ['title', 'content'] } searches both (default)
✓ { fields: ['tags'] } searches tag values
✓ { type: 'person' } filters results by type
✓ { limit: 5 } limits number of results
```

### Search Ranking

```
✓ exact title match ranks highest
✓ title contains query ranks higher than content-only match
✓ results are sorted by relevance score descending
✓ multiple query words: pages matching more words rank higher
```

### Special Characters in Search

```
✓ query with regex special chars is treated literally: 'a+b' searches for 'a+b'
✓ query with brackets: '[test]' searches for literal '[test]'
✓ query is not interpreted as regex
```

---

## 13. Tags

### `wiki.getTags()`

```
✓ returns array of unique tag strings across all pages
✓ returns empty array if no pages have tags
✓ tags are not duplicated even if used by multiple pages
✓ sorted alphabetically
```

### `wiki.getPagesByTag(tag)`

```
✓ returns array of WikiPage objects with the given tag
✓ returns empty array if no pages have that tag
✓ tag matching is case-sensitive
```

### Tag Edge Cases

```
✓ page with empty tags array: tags not included in getTags()
✓ page with duplicate tags in array: each tag counted once
✓ updating page tags updates getTags() result
✓ deleting page removes its tags from getTags() (if no other pages use them)
```

---

## 14. Page Types

### `wiki.getTypes()`

```
✓ returns array of unique type strings across all pages
✓ returns empty array if no pages have types
✓ sorted alphabetically
```

### `wiki.getPagesByType(type)`

```
✓ returns array of WikiPage objects with the given type
✓ returns empty array if no pages have that type
✓ type matching is case-sensitive
```

---

## 15. Storage Adapter

### WikiStorage Interface

```typescript
interface WikiStorage {
  save(page: WikiPage): Promise<void>
  load(id: string): Promise<WikiPage | null>
  delete(id: string): Promise<void>
  list(): Promise<WikiPage[]>
}
```

### `memoryStorage()`

```
✓ implements WikiStorage interface
✓ save() stores page in memory
✓ load() retrieves page by id
✓ load() returns null for non-existent id
✓ delete() removes page
✓ list() returns all stored pages
✓ data is lost when instance is garbage collected
```

### `localStorageAdapter(key)`

```
✓ implements WikiStorage interface
✓ persists to window.localStorage under provided key
✓ survives page reload
✓ serializes Date objects correctly (restored as Dates, not strings)
✓ handles localStorage quota exceeded: throws Error "Storage quota exceeded"
✓ handles localStorage unavailable: throws Error "localStorage is not available"
```

### Storage Integration

```
✓ wiki.createPage() calls storage.save()
✓ wiki.updatePage() calls storage.save()
✓ wiki.deletePage() calls storage.delete()
✓ storage.list() is called on wiki initialization to load existing pages
✓ storage operations are awaited before returning
```

### Storage Error Handling

```
✓ if storage.save() rejects, createPage() rejects with same error
✓ if storage.save() rejects, wiki state is not corrupted (page not added)
✓ if storage.delete() rejects, deletePage() rejects with same error
✓ if storage.list() rejects on init, createWiki() rejects
```

### Custom Storage Adapter

```
✓ any object implementing WikiStorage interface works
✓ async adapters (database, file system) work correctly
✓ wiki waits for storage operations to complete
```

---

## 16. Import/Export

### `wiki.export()`

```
✓ returns array of all WikiPage objects
✓ returns empty array if wiki is empty
✓ pages include all fields (id, title, content, type, tags, created, modified)
✓ returned array is a copy (modifying it doesn't affect wiki)
✓ Date objects are preserved as Dates
```

### `wiki.import(pages, options?)`

```
✓ imports array of WikiPage objects
✓ extracts and indexes links for all imported pages
✓ builds backlink index for all imported pages
✓ returns count of imported pages
```

### Import Options

```
✓ { mode: 'replace' } clears existing pages first (default)
✓ { mode: 'merge' } keeps existing pages, adds/overwrites imported
✓ { mode: 'merge' } page with same id overwrites existing
✓ { mode: 'merge' } page with new id is added
✓ { mode: 'skip' } keeps existing pages, only adds new ids
```

### Import Validation

```
✓ throws Error if pages is not an array
✓ throws Error if any page missing required id field
✓ throws Error if any page missing required title field
✓ validates all pages before importing any (atomic)
✓ restores created/modified as Date objects if they're ISO strings
```

### `wiki.toJSON()`

```
✓ returns JSON-serializable representation of entire wiki
✓ Date objects are serialized as ISO strings
✓ can be passed to JSON.stringify()
```

### `wiki.fromJSON(json)`

```
✓ static method to create wiki from JSON
✓ restores Date objects from ISO strings
✓ rebuilds link index
```

---

## 17. Events

### `wiki.on(event, callback)` / `wiki.onChange(callback)`

```
✓ registers callback for wiki changes
✓ returns unsubscribe function
✓ calling unsubscribe stops future callbacks
```

### Event Types and Payloads

```
✓ 'create' fires after page created: { type: 'create', page: WikiPage }
✓ 'update' fires after page updated: { type: 'update', page: WikiPage, previous: WikiPage }
✓ 'delete' fires after page deleted: { type: 'delete', page: WikiPage }
✓ 'rename' fires after page renamed: { type: 'rename', page: WikiPage, previousTitle: string }
```

### Event Timing

```
✓ events fire after operation completes successfully
✓ events fire after storage is updated
✓ events do not fire if operation throws
✓ events do not fire if storage rejects
```

### Multiple Subscribers

```
✓ multiple callbacks can be registered
✓ all callbacks receive the event
✓ unsubscribing one doesn't affect others
✓ callbacks are called in registration order
```

### Callback Error Handling

```
✓ error in callback does not affect wiki operation
✓ error in callback does not prevent other callbacks
✓ error in callback is logged to console.error
```

### Import Events

```
✓ { emitEvents: true } fires 'create' for each imported page
✓ { emitEvents: false } does not fire events (default, for performance)
```

---

## 18. Edge Cases & Error Handling

### Self-Referential Links

```
✓ page can link to itself: [[Self]] in page 'Self'
✓ self-link appears in getLinks()
✓ self-link appears in getBacklinks()
✓ page with only self-link is NOT an orphan
```

### Circular References

```
✓ A links to B, B links to A: both have backlinks
✓ A → B → C → A: circular chain works correctly
✓ getConnectedPages handles cycles without infinite loop
✓ getGraph correctly represents cycles
```

### Large Content

```
✓ handles content with 100+ links
✓ handles content with 1MB+ text
✓ handles wiki with 10,000+ pages (performance test)
```

### Empty/Minimal States

```
✓ empty content is valid
✓ content with only whitespace is valid
✓ content with only links: '[[A]] [[B]] [[C]]'
✓ single page wiki works for all operations
```

### Unicode & International

```
✓ unicode in titles: '日本語タイトル'
✓ unicode in content with links: 'Visit [[東京]]'
✓ RTL text in content
✓ emoji in titles (stripped from ID, preserved in title)
✓ mixed scripts in single page
```

### Special Characters

```
✓ HTML entities in content are preserved: '&amp;'
✓ markdown syntax in content is preserved
✓ backslashes in content: 'path\\to\\file'
✓ quotes in titles: 'The "Great" War'
✓ apostrophes: "Aldric's Kingdom"
```

### Malformed Input

```
✓ unclosed wiki link: '[[Missing end' - no link extracted, no error
✓ only opening brackets: '[[' - no link extracted, no error
✓ mismatched brackets: '[[Text]' - no link extracted, no error
✓ empty brackets: '[[]]' - no link extracted, no error
✓ null bytes in content: handled gracefully
```

---

## 19. Async Behavior

### All Public Methods Return Types

```
✓ createPage: Promise<WikiPage>
✓ getPage: WikiPage | undefined (sync) OR Promise<WikiPage | undefined>
✓ getPageByTitle: WikiPage | undefined (sync) OR Promise<WikiPage | undefined>
✓ updatePage: Promise<WikiPage>
✓ deletePage: Promise<void>
✓ renamePage: Promise<WikiPage>
✓ listPages: WikiPage[] (sync, from cache)
✓ search: WikiPage[] (sync)
✓ getLinks: string[] (sync)
✓ getBacklinks: string[] (sync)
✓ getLinkedPages: WikiPage[] (sync)
✓ getBacklinkPages: WikiPage[] (sync)
✓ getOrphans: WikiPage[] (sync)
✓ getDeadLinks: { source: string, target: string }[] (sync)
✓ getGraph: Record<string, string[]> (sync)
✓ getConnectedPages: WikiPage[] (sync)
✓ export: WikiPage[] (sync)
✓ import: Promise<number>
```

### Storage Synchronization

```
✓ reads from in-memory cache (fast, sync)
✓ writes go to storage and update cache
✓ wiki is consistent after await completes
```

---

## 20. Concurrency Considerations

### Sequential Operations

```
✓ rapid sequential creates work correctly
✓ rapid sequential updates to same page work correctly
✓ create then immediate update works
✓ create then immediate delete works
```

### Concurrent Operations (If Supported)

```
✓ concurrent creates of different pages work
✓ concurrent updates to different pages work
✓ concurrent operations on same page: last write wins
✓ concurrent delete and update: delete wins
```

---

## 21. Performance Expectations

These are not strict requirements but guide implementation:

```
✓ getPage(id): O(1) - hash lookup
✓ getLinks(id): O(1) - pre-computed index
✓ getBacklinks(id): O(1) - pre-computed index
✓ listPages(): O(n) - returns cached list
✓ search(query): O(n * m) - n pages, m avg content length
✓ createPage: O(k) - k links in content
✓ updatePage: O(k + b) - k links, b backlinks to update
✓ getOrphans(): O(n) - scan all pages
✓ getDeadLinks(): O(n * k) - n pages, k avg links per page
```

---

## Test Utilities

### Factory Functions

```typescript
// Create wiki with predefined test pages
function createTestWiki(): Wiki

// Create a single test page
function createTestPage(overrides?: Partial<WikiPage>): WikiPage

// Create wiki with specific link structure for graph tests
function createLinkedWiki(structure: Record<string, string[]>): Wiki
```

### Common Fixtures

```typescript
// Standard test pages
const kingAldric: WikiPage = {
  id: 'king-aldric-i',
  title: 'King Aldric I',
  content: 'Founder of [[Kingdom of Aldoria]] after [[Battle of Five Rivers]].',
  type: 'person',
  tags: ['royalty', 'historical'],
  created: new Date('2024-01-01'),
  modified: new Date('2024-01-01')
}

const kingdom: WikiPage = {
  id: 'kingdom-of-aldoria',
  title: 'Kingdom of Aldoria',
  content: 'Founded by [[King Aldric I]].',
  type: 'place',
  tags: ['nation'],
  created: new Date('2024-01-01'),
  modified: new Date('2024-01-01')
}

const orphanPage: WikiPage = {
  id: 'forgotten-lore',
  title: 'Forgotten Lore',
  content: 'Ancient knowledge with no connections.',
  type: 'concept',
  created: new Date('2024-01-01'),
  modified: new Date('2024-01-01')
}
```

### Mock Storage

```typescript
// Create mock storage with spies for testing storage integration
function createMockStorage(): WikiStorage & {
  saveCalls: WikiPage[]
  loadCalls: string[]
  deleteCalls: string[]
  listCalls: number
}
```

### Assertion Helpers

```typescript
// Assert graph structure matches expected
function assertGraphEquals(actual: Graph, expected: Graph): void

// Assert page has expected links
function assertLinksTo(wiki: Wiki, sourceId: string, targetTitles: string[]): void

// Assert page has expected backlinks
function assertBacklinkedFrom(wiki: Wiki, targetId: string, sourceIds: string[]): void
```

---

## Notes for Implementers

1. **Link Index**: Maintain two indexes for performance:
   - Forward index: pageId → [linked page ids]
   - Reverse index: pageId → [linking page ids] (backlinks)

2. **ID Normalization**: Use consistent slugification for both page ID generation and link resolution. The same function should be used in both places.

3. **Storage Sync**: The wiki should work entirely from memory after initialization. Storage is for persistence, not primary data access.

4. **Event Emission**: Events should fire after all internal state is consistent, not during mutation.

5. **Error Messages**: Use consistent, specific error messages that include the relevant ID or value for debugging.
