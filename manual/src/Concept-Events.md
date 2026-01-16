# Events

The wiki emits events when pages are created, updated, deleted, or renamed. Subscribe to these events to react to changes - sync to external systems, update UI, trigger workflows, or log activity.

## How It Works

```
wiki.createPage(...) → Page created → Event emitted
                                           ↓
                                     All subscribers called
                                           ↓
                              { type: 'create', page: WikiPage }
```

Events fire *after* the operation completes successfully. If an operation throws an error, no event is emitted.

## Basic Usage

```typescript
import { createWiki } from '@motioneffector/wiki'

const wiki = createWiki()

// Subscribe to all changes
const unsubscribe = wiki.onChange((event) => {
  console.log(`${event.type}: ${event.page.title}`)
})

await wiki.createPage({ title: 'Test' })
// Console: "create: Test"

await wiki.updatePage('test', { content: 'New content' })
// Console: "update: Test"

// Stop listening
unsubscribe()
```

## Key Points

- **`onChange(callback)`** subscribes to all change events. Returns an unsubscribe function.

- **`on(event, callback)`** also subscribes to changes. Currently functions identically to `onChange`. Returns an unsubscribe function.

- **Four event types exist:**
  - `create` - Page was created
  - `update` - Page was modified
  - `delete` - Page was removed
  - `rename` - Page title changed

- **Events fire after storage is updated** - When your callback runs, the page is already persisted and retrievable.

- **Callback errors don't break the wiki** - If your callback throws, the error is logged to console but the wiki operation still succeeds. Other callbacks still run.

## Examples

### Event Payloads

```typescript
wiki.onChange((event) => {
  switch (event.type) {
    case 'create':
      // event.page - the created page
      console.log('Created:', event.page.title)
      break

    case 'update':
      // event.page - the updated page
      // event.previous - the page before update
      console.log('Updated:', event.page.title)
      console.log('Old content:', event.previous.content)
      console.log('New content:', event.page.content)
      break

    case 'delete':
      // event.page - the deleted page (snapshot before deletion)
      console.log('Deleted:', event.page.title)
      break

    case 'rename':
      // event.page - the renamed page
      // event.previousTitle - the old title
      console.log(`Renamed: "${event.previousTitle}" → "${event.page.title}"`)
      break
  }
})
```

### Syncing to External System

```typescript
wiki.onChange(async (event) => {
  // Sync changes to a search index
  switch (event.type) {
    case 'create':
    case 'update':
      await searchIndex.upsert({
        id: event.page.id,
        title: event.page.title,
        content: event.page.content,
        tags: event.page.tags
      })
      break

    case 'delete':
      await searchIndex.delete(event.page.id)
      break

    case 'rename':
      await searchIndex.upsert({
        id: event.page.id,
        title: event.page.title,
        content: event.page.content,
        tags: event.page.tags
      })
      break
  }
})
```

### Activity Logging

```typescript
const activityLog: Array<{ timestamp: Date; action: string; pageId: string }> = []

wiki.onChange((event) => {
  activityLog.push({
    timestamp: new Date(),
    action: event.type,
    pageId: event.page.id
  })
})
```

### Multiple Subscribers

```typescript
// UI updates
wiki.onChange((event) => {
  refreshPageList()
  if (currentPageId === event.page.id) {
    refreshCurrentPage()
  }
})

// Analytics
wiki.onChange((event) => {
  analytics.track('wiki_change', {
    type: event.type,
    pageId: event.page.id
  })
})

// Each subscriber is independent - they all receive every event
```

## Related

- **[Events API](API-Events)** - Full reference for event types and methods
- **[Import & Export](Guide-Import-And-Export)** - Controlling events during bulk operations
