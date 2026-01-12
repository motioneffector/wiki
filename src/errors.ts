/**
 * Base error class for all wiki-related errors.
 */
export class WikiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WikiError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Error thrown when input validation fails.
 *
 * @example
 * ```typescript
 * try {
 *   await wiki.createPage({ title: '' })
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.error(`Validation failed: ${error.message}`)
 *     console.error(`Field: ${error.field}`)
 *   }
 * }
 * ```
 */
export class ValidationError extends WikiError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Error thrown when storage operations fail.
 */
export class StorageError extends WikiError {
  constructor(message: string) {
    super(message)
    this.name = 'StorageError'
  }
}
