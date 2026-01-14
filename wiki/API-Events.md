# Events API

Functions for subscribing to wiki changes.

---

## `wiki.onChange()`

Subscribes to all change events.

**Signature:**

```typescript
onChange(callback: WikiEventCallback): UnsubscribeFunction
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `callback` | `WikiEventCallback` | Yes | Function called on each change |

**Returns:** `UnsubscribeFunction` — Call to stop receiving events

**Example:**

```typescript
const unsubscribe = wiki.onChange((event) => {
  console.log(`${event.type}: ${event.page.title}`)
})

await wiki.createPage({ title: 'Test' })
// Console: "create: Test"

await wiki.updatePage('test', { content: 'Updated' })
// Console: "update: Test"

// Stop listening
unsubscribe()

await wiki.createPage({ title: 'Silent' })
// No console output
```

---

## `wiki.on()`

Alternative subscription method (same behavior as `onChange`).

**Signature:**

```typescript
on(event: string, callback: WikiEventCallback): UnsubscribeFunction
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `event` | `string` | Yes | Event name (currently unused) |
| `callback` | `WikiEventCallback` | Yes | Function called on each change |

**Returns:** `UnsubscribeFunction` — Call to stop receiving events

**Example:**

```typescript
const unsubscribe = wiki.on('change', (event) => {
  console.log(event.type)
})
```

---

## Event Types

### `WikiEvent`

Union type of all possible events:

```typescript
type WikiEvent =
  | { type: 'create'; page: WikiPage }
  | { type: 'update'; page: WikiPage; previous: WikiPage }
  | { type: 'delete'; page: WikiPage }
  | { type: 'rename'; page: WikiPage; previousTitle: string }
```

### Create Event

Fired after a page is created.

```typescript
{
  type: 'create',
  page: WikiPage  // The created page
}
```

### Update Event

Fired after a page is updated.

```typescript
{
  type: 'update',
  page: WikiPage,     // The page after update
  previous: WikiPage  // The page before update
}
```

### Delete Event

Fired after a page is deleted.

```typescript
{
  type: 'delete',
  page: WikiPage  // Snapshot of the deleted page
}
```

### Rename Event

Fired after a page is renamed.

```typescript
{
  type: 'rename',
  page: WikiPage,       // The page after rename
  previousTitle: string // The old title
}
```

---

## Event Handling Examples

### Type-Safe Event Handling

```typescript
wiki.onChange((event) => {
  switch (event.type) {
    case 'create':
      console.log('Created:', event.page.title)
      break

    case 'update':
      console.log('Updated:', event.page.title)
      console.log('Changed from:', event.previous.content)
      console.log('Changed to:', event.page.content)
      break

    case 'delete':
      console.log('Deleted:', event.page.title)
      break

    case 'rename':
      console.log(`Renamed: ${event.previousTitle} → ${event.page.title}`)
      break
  }
})
```

### Multiple Subscribers

```typescript
// UI updates
wiki.onChange((event) => {
  refreshUI()
})

// Logging
wiki.onChange((event) => {
  log(event)
})

// Both receive all events independently
```

### Error Handling

Errors in callbacks are caught and logged, but don't affect:
- The wiki operation (it still completes)
- Other subscribers (they still run)

```typescript
wiki.onChange(() => {
  throw new Error('Callback error')
})

wiki.onChange(() => {
  console.log('This still runs')
})

await wiki.createPage({ title: 'Test' })
// Console: "Subscriber error: Error: Callback error"
// Console: "This still runs"
// Page is still created successfully
```

---

## Types

### `WikiEventCallback`

```typescript
type WikiEventCallback = (event: WikiEvent) => void
```

### `UnsubscribeFunction`

```typescript
type UnsubscribeFunction = () => void
```
