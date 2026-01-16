# Errors Reference

Error classes thrown by the wiki library.

---

## `WikiError`

Base error class for all wiki-related errors.

```typescript
class WikiError extends Error {
  name: 'WikiError'
}
```

All wiki-specific errors extend this class, making it easy to catch any wiki error:

```typescript
try {
  await wiki.createPage({ title: '' })
} catch (error) {
  if (error instanceof WikiError) {
    console.log('Wiki error:', error.message)
  }
}
```

---

## `ValidationError`

Thrown when input validation fails.

```typescript
class ValidationError extends WikiError {
  name: 'ValidationError'
  field?: string
}
```

| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Description of the validation failure |
| `field` | `string?` | The field that failed validation (when applicable) |

### When Thrown

**Title validation:**

```typescript
// Empty or missing title
await wiki.createPage({ title: '' })
// ValidationError: "Title cannot be empty"

await wiki.createPage({ title: '   ' })
// ValidationError: "Title cannot be empty"

await wiki.createPage({} as any)
// ValidationError: "Title is required"
```

**Length limits:**

```typescript
// Title too long (max 1000 characters)
await wiki.createPage({ title: 'x'.repeat(1001) })
// ValidationError: "Title exceeds maximum length of 1000"

// Content too long (max 10MB)
await wiki.createPage({ title: 'Test', content: 'x'.repeat(10_000_001) })
// ValidationError: "Content exceeds maximum length of 10000000"

// Tag too long (max 100 characters)
await wiki.createPage({ title: 'Test', tags: ['x'.repeat(101)] })
// ValidationError: "Tag exceeds maximum length of 100"

// Too many tags (max 100)
await wiki.createPage({ title: 'Test', tags: Array(101).fill('tag') })
// ValidationError: "Tags array exceeds maximum count of 100"
```

### Example

```typescript
import { ValidationError } from '@motioneffector/wiki'

try {
  await wiki.createPage({ title: '' })
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation failed:', error.message)
    if (error.field) {
      console.log('Field:', error.field)
    }
  }
}
```

---

## `StorageError`

Thrown when storage operations fail.

```typescript
class StorageError extends WikiError {
  name: 'StorageError'
}
```

Typically thrown by custom storage adapters when persistence fails (network error, disk full, permission denied, etc.).

### Example

```typescript
import { StorageError } from '@motioneffector/wiki'

try {
  await wiki.createPage({ title: 'Test' })
} catch (error) {
  if (error instanceof StorageError) {
    console.log('Storage failed:', error.message)
    // Retry logic, fallback, or user notification
  }
}
```

---

## Standard Errors

The library also throws standard JavaScript errors for certain conditions:

### `Error`

```typescript
// Page not found
await wiki.updatePage('nonexistent', { title: 'New' })
// Error: "Page 'nonexistent' not found"

await wiki.deletePage('nonexistent')
// Error: "Page 'nonexistent' not found"

await wiki.renamePage('nonexistent', 'New')
// Error: "Page 'nonexistent' not found"

// Duplicate ID
await wiki.createPage({ id: 'existing', title: 'First' })
await wiki.createPage({ id: 'existing', title: 'Second' })
// Error: "Page with id 'existing' already exists"

// Rename collision
await wiki.createPage({ title: 'Target' })
await wiki.createPage({ title: 'Source' })
await wiki.renamePage('source', 'Target', { updateId: true })
// Error: "Page with id 'target' already exists"

// Import validation
await wiki.import([{ title: 'No ID' }] as any)
// Error: "Each page must have an id field"
```

### `TypeError`

```typescript
// Invalid tags
await wiki.createPage({ title: 'Test', tags: 'not-array' as any })
// TypeError: "Tags must be an array"

await wiki.createPage({ title: 'Test', tags: [123] as any })
// TypeError: "Each tag must be a non-empty string"

await wiki.createPage({ title: 'Test', tags: [''] })
// TypeError: "Each tag must be a non-empty string"

// Invalid type
await wiki.createPage({ title: 'Test', type: 123 as any })
// TypeError: "Type must be a string"

// Invalid storage
createWiki({ storage: { save: 'not a function' } as any })
// TypeError: "Storage must implement WikiStorage interface"

// Invalid link pattern
createWiki({ linkPattern: 'not a regex' as any })
// TypeError: "linkPattern must be a RegExp"
```

---

## Error Handling Patterns

### Catch All Wiki Errors

```typescript
import { WikiError } from '@motioneffector/wiki'

try {
  await wiki.createPage({ title: '' })
} catch (error) {
  if (error instanceof WikiError) {
    // Handle any wiki-specific error
    showError(error.message)
  } else {
    // Unexpected error
    throw error
  }
}
```

### Specific Error Handling

```typescript
import { ValidationError, StorageError } from '@motioneffector/wiki'

try {
  await wiki.createPage(data)
} catch (error) {
  if (error instanceof ValidationError) {
    showValidationError(error.message, error.field)
  } else if (error instanceof StorageError) {
    showStorageError(error.message)
    offerRetry()
  } else if (error instanceof Error) {
    showGenericError(error.message)
  }
}
```

### Form Validation

```typescript
async function savePage(data: CreatePageData) {
  try {
    return await wiki.createPage(data)
  } catch (error) {
    if (error instanceof ValidationError) {
      return { error: error.message, field: error.field }
    }
    throw error
  }
}

const result = await savePage({ title: '' })
if ('error' in result) {
  form.showError(result.error)
}
```
