# Changelog

## [0.0.1] - 2026-01-11

### Added
- Complete wiki system with bidirectional linking
- Page CRUD operations (create, read, update, delete, rename)
- Automatic ID generation from titles with slugification
- Link extraction from `[[wiki link]]` syntax with optional display text `[[Page|Display]]`
- Code block exclusion (fenced, inline, and indented)
- Bidirectional link tracking with forward and reverse indexes
- Dead link and orphan page detection
- Link graph generation and connected pages traversal
- Page listing with filtering by type/tags, sorting, and pagination
- Full-text search with relevance ranking across titles, content, and tags
- Tags and types management
- Memory storage adapter for in-memory persistence
- Import/export functionality with multiple merge modes
- Event system for change notifications (create, update, delete, rename)
- Full TypeScript support with strict type checking
- Comprehensive test suite with 346 passing tests
