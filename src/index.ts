// @motioneffector/wiki
// Wiki / knowledge base with bidirectional linking

// Main wiki factory
export { createWiki } from './core/wiki'

// Storage adapters
export { memoryStorage } from './storage/memory'

// Error classes
export { WikiError, ValidationError, StorageError } from './errors'

// Types
export type {
  Wiki,
  WikiPage,
  WikiOptions,
  WikiStorage,
  CreatePageData,
  UpdatePageData,
  RenamePageOptions,
  DeletePageOptions,
  GetPageByTitleOptions,
  ListPagesOptions,
  SearchOptions,
  ImportOptions,
  DeadLink,
  Graph,
  WikiEvent,
  WikiEventCallback,
  UnsubscribeFunction,
} from './types'
