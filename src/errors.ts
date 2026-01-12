export class WikiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WikiError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ValidationError extends WikiError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class StorageError extends WikiError {
  constructor(message: string) {
    super(message)
    this.name = 'StorageError'
  }
}
