# Module Development Work Order

Generic instructions for building any `@motioneffector` library module. Follow these steps in order.

---

## Prerequisites

Before starting, ensure you have:
- Node.js 18+
- pnpm (preferred) or npm
- The module folder already exists with README.md and TESTS.md

---

## Phase 1: Orientation

### 1.1 Read Required Documentation

Read these files in order. Do not skip any.

```
1. STYLE.md          - Coding standards (in module root)
2. README.md         - Public API and usage examples
3. TESTS.md          - Test specifications (this is your implementation contract)
```

**Key understanding checkpoints:**
- [ ] I understand the public API surface from README.md
- [ ] I understand every test case in TESTS.md
- [ ] I understand the code style requirements from STYLE.md

### 1.2 Clarify Ambiguities

If anything in TESTS.md or README.md is unclear or contradictory:
1. Stop
2. Document the question
3. Get clarification before proceeding

Do NOT make assumptions about intended behavior.

---

## Phase 2: Project Setup

### 2.1 Initialize Package Structure

Ensure the following structure exists:

```
module-name/
├── src/
│   ├── index.ts          # Public exports only
│   ├── types.ts          # Public type definitions
│   └── errors.ts         # Custom error classes
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── TESTS.md
├── STYLE.md
└── CHANGELOG.md
```

### 2.2 Configure package.json

```json
{
  "name": "@motioneffector/module-name",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest",
    "test:run": "vitest run",
    "lint": "eslint src",
    "format": "prettier --write src",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "vitest": "^2.0.0",
    "prettier": "^3.0.0",
    "eslint": "^9.0.0",
    "typescript-eslint": "^8.0.0"
  }
}
```

### 2.3 Configure TypeScript

Use strict mode as specified in STYLE.md:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 2.4 Configure Vite

```typescript
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: [] // Add peer dependencies here
    }
  }
})
```

### 2.5 Configure Prettier

Create `.prettierrc`:

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100,
  "arrowParens": "avoid"
}
```

### 2.6 Install Dependencies

```bash
pnpm install
```

---

## Phase 3: Define Types and Errors

### 3.1 Create Error Classes

In `src/errors.ts`, define all error types mentioned in TESTS.md:

```typescript
export class ModuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ModuleError'
  }
}

// Add specific error types as specified in TESTS.md
```

### 3.2 Create Type Definitions

In `src/types.ts`, define all public types:

```typescript
// Define interfaces for all public API contracts
// These should match what README.md documents
```

**Checklist:**
- [ ] Every public function's parameters have types
- [ ] Every public function's return value has a type
- [ ] All options objects have interfaces
- [ ] All callback signatures are typed

---

## Phase 4: Write Tests First (TDD)

### 4.1 Create Test Files

For each section in TESTS.md, create corresponding test file(s):

```
TESTS.md Section          →  Test File
─────────────────────────────────────────
## 1. Store Creation      →  src/core/store.test.ts
## 2. Basic Operations    →  src/core/store.test.ts (same file)
## 5. Condition Eval      →  src/core/condition-parser.test.ts
```

### 4.2 Translate TESTS.md to Vitest

Follow STYLE.md section 6.1 exactly:

```markdown
### `store.get(key)`

✓ returns value for existing key
✓ returns undefined for missing key
```

Becomes:

```typescript
describe('store.get(key)', () => {
  it('returns value for existing key', () => {
    // Implementation
  })

  it('returns undefined for missing key', () => {
    // Implementation
  })
})
```

**Rules:**
- Test names must match TESTS.md exactly (copy-paste)
- Every `✓` line becomes one `it()` block
- Every `###` heading becomes one `describe()` block
- Nested `####` headings become nested `describe()` blocks

### 4.3 Write Failing Tests

Write ALL tests before writing implementation:

```typescript
it('returns value for existing key', () => {
  const store = createStore({ initial: { name: 'Alice' } })
  expect(store.get('name')).toBe('Alice')
})
```

Run tests to confirm they fail:

```bash
pnpm test:run
```

All tests should fail at this point. If any pass, something is wrong.

---

## Phase 5: Implementation

### 5.1 Create Source Files

Organize implementation files logically:

```
src/
├── index.ts              # Exports only
├── types.ts              # Public types
├── errors.ts             # Error classes
├── core/
│   ├── store.ts          # Main implementation
│   ├── store.test.ts     # Tests (colocated)
│   ├── parser.ts         # Supporting implementation
│   └── parser.test.ts    # Tests (colocated)
└── utils/
    ├── validators.ts     # Internal utilities
    └── validators.test.ts
```

### 5.2 Implement to Pass Tests

Work through tests systematically:

1. Pick a `describe()` block
2. Implement just enough code to pass those tests
3. Run tests: `pnpm test:run`
4. Refactor if needed (tests still pass)
5. Move to next `describe()` block

**Do NOT:**
- Implement features not covered by tests
- Add "nice to have" functionality
- Optimize prematurely

### 5.3 Export Public API

In `src/index.ts`, export only public API:

```typescript
// Functions
export { createStore } from './core/store'

// Errors
export { ValidationError, ParseError } from './errors'

// Types
export type { Store, StoreOptions } from './types'
```

---

## Phase 6: Documentation

### 6.1 Add JSDoc to Public API

Every exported function needs JSDoc:

```typescript
/**
 * Creates a new store instance.
 *
 * @param options - Configuration options
 * @returns A new Store instance
 *
 * @example
 * ```typescript
 * const store = createStore({ initial: { count: 0 } })
 * ```
 *
 * @throws {ValidationError} If options are invalid
 */
export function createStore(options?: StoreOptions): Store {
```

### 6.2 Verify README.md Accuracy

- [ ] All examples in README.md actually work
- [ ] API reference matches implementation
- [ ] No documented features are missing
- [ ] No undocumented features exist

### 6.3 Update CHANGELOG.md

```markdown
# Changelog

## [0.0.1] - YYYY-MM-DD

### Added
- Initial implementation
- Feature X
- Feature Y
```

---

## Phase 7: Quality Checks

### 7.1 Run All Tests

```bash
pnpm test:run
```

**Required: 100% of tests pass.**

### 7.2 Type Check

```bash
pnpm typecheck
```

**Required: Zero type errors.**

### 7.3 Lint

```bash
pnpm lint
```

**Required: Zero lint errors.**

### 7.4 Format

```bash
pnpm format
```

### 7.5 Build

```bash
pnpm build
```

**Required: Build succeeds with no errors.**

### 7.6 Manual Checklist

From STYLE.md appendix:

**Code Quality:**
- [ ] No `any` types
- [ ] All public functions have JSDoc
- [ ] All public functions have explicit return types
- [ ] No commented-out code
- [ ] No `console.log` (except in error handlers)
- [ ] No magic numbers/strings (use named constants)

**Testing:**
- [ ] All tests from TESTS.md implemented
- [ ] All tests pass
- [ ] Test names match TESTS.md specification exactly

**Documentation:**
- [ ] README.md examples work
- [ ] CHANGELOG.md updated
- [ ] JSDoc examples are correct

---

## Phase 8: Final Review

### 8.1 Self-Review

Read through all code as if reviewing someone else's work:

- Does it follow STYLE.md?
- Is it the simplest solution that works?
- Would a new developer understand it?

### 8.2 Test as Consumer

Create a simple test script that uses the library as an external consumer would:

```typescript
import { createStore } from '@motioneffector/module-name'

const store = createStore()
// Test basic workflows from README.md
```

### 8.3 Deliverables Checklist

Before marking complete:

- [ ] All TESTS.md specifications have passing tests
- [ ] `pnpm test:run` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds
- [ ] README.md examples verified working
- [ ] CHANGELOG.md updated
- [ ] No TODO comments remain (or all are tracked issues)

---

## Appendix: Common Patterns

### Factory Function Pattern

```typescript
export function createThing(options?: ThingOptions): Thing {
  // Private state via closure
  const state = new Map<string, unknown>()

  // Return public interface
  return {
    get(key) {
      return state.get(key)
    },
    set(key, value) {
      state.set(key, value)
      return this // Enable chaining
    },
  }
}
```

### Validation Pattern

```typescript
function validateKey(key: string): void {
  if (typeof key !== 'string') {
    throw new TypeError('Key must be a string')
  }
  if (key.trim() === '') {
    throw new ValidationError('Key cannot be empty')
  }
}
```

### Subscription Pattern

```typescript
type Callback = (value: unknown) => void

function createObservable() {
  const listeners = new Set<Callback>()

  return {
    subscribe(callback: Callback) {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    notify(value: unknown) {
      listeners.forEach(cb => {
        try {
          cb(value)
        } catch (e) {
          console.error('Subscriber error:', e)
        }
      })
    },
  }
}
```

### Error Class Pattern

```typescript
export class ModuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ModuleError'
    // Fix prototype chain for instanceof
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ValidationError extends ModuleError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}
```

---

## Troubleshooting

### Tests won't run
- Check vitest is installed: `pnpm add -D vitest`
- Check test files match pattern: `*.test.ts`

### Type errors in tests
- Use `@ts-expect-error` for intentional type violations
- Import types with `import type { }`

### Build fails
- Check `src/index.ts` exports exist
- Check no circular dependencies
- Run `pnpm typecheck` for specific errors

### Lint errors
- Run `pnpm format` first
- Check STYLE.md for conventions

---

## Module-Specific Notes: @motioneffector/wiki

### Key Implementation Areas

1. **Link Extraction** - Regex-based `[[wiki link]]` parsing
2. **Bidirectional Links** - Track both outgoing and incoming links
3. **Link Graph** - Maintain adjacency list for traversal
4. **Storage Adapters** - Pluggable persistence layer
5. **Search** - Full-text search across pages

### Architecture Recommendation

Separate link management from page storage:

```
src/
├── core/
│   ├── wiki.ts               # Main wiki facade
│   ├── wiki.test.ts
│   ├── link-extractor.ts     # Regex parsing
│   ├── link-extractor.test.ts
│   ├── link-graph.ts         # Bidirectional link tracking
│   └── link-graph.test.ts
├── storage/
│   ├── types.ts              # WikiStorage interface
│   ├── memory.ts             # In-memory implementation
│   └── memory.test.ts
├── errors.ts
├── types.ts
└── index.ts
```

### Test Patterns

**Link Extraction:**
```typescript
describe('link extractor', () => {
  it('extracts single link', () => {
    const content = 'Visit the [[Kingdom of Aldoria]] today.'
    expect(extractLinks(content)).toEqual(['Kingdom of Aldoria'])
  })

  it('extracts multiple links', () => {
    const content = '[[King Aldric]] founded [[Aldoria]] after [[The War]].'
    expect(extractLinks(content)).toEqual(['King Aldric', 'Aldoria', 'The War'])
  })

  it('handles links with special characters', () => {
    const content = "[[The King's Crown]] and [[Hall of Heroes (East)]]"
    expect(extractLinks(content)).toEqual(["The King's Crown", 'Hall of Heroes (East)'])
  })

  it('returns empty array for no links', () => {
    expect(extractLinks('No links here.')).toEqual([])
  })

  it('ignores nested brackets', () => {
    const content = '[[Link]] and [[not a [[nested]] link]]'
    // Behavior depends on design decision
  })

  it('deduplicates repeated links', () => {
    const content = '[[Hero]] meets [[Hero]] again.'
    expect(extractLinks(content)).toEqual(['Hero'])  // or ['Hero', 'Hero']?
  })
})
```

**Bidirectional Link Tracking:**
```typescript
describe('bidirectional links', () => {
  it('tracks outgoing links from a page', () => {
    const wiki = createWiki()
    wiki.createPage({
      title: 'Kingdom',
      content: 'Ruled by [[King Aldric]] from [[Castle Aldric]].'
    })

    const links = wiki.getLinks('kingdom')
    expect(links).toContain('king-aldric')
    expect(links).toContain('castle-aldric')
  })

  it('tracks incoming links (backlinks) to a page', () => {
    const wiki = createWiki()
    wiki.createPage({ title: 'King Aldric', content: 'The ruler.' })
    wiki.createPage({
      title: 'Kingdom',
      content: 'Ruled by [[King Aldric]].'
    })
    wiki.createPage({
      title: 'History',
      content: '[[King Aldric]] founded the realm.'
    })

    const backlinks = wiki.getBacklinks('king-aldric')
    expect(backlinks).toContain('kingdom')
    expect(backlinks).toContain('history')
  })

  it('updates backlinks when page content changes', () => {
    const wiki = createWiki()
    wiki.createPage({ title: 'King Aldric', content: '' })
    wiki.createPage({
      title: 'Kingdom',
      content: 'Ruled by [[King Aldric]].'
    })

    expect(wiki.getBacklinks('king-aldric')).toContain('kingdom')

    wiki.updatePage('kingdom', { content: 'Ruled by nobody.' })

    expect(wiki.getBacklinks('king-aldric')).not.toContain('kingdom')
  })

  it('removes backlinks when page is deleted', () => {
    const wiki = createWiki()
    wiki.createPage({ title: 'Target', content: '' })
    wiki.createPage({ title: 'Source', content: '[[Target]]' })

    expect(wiki.getBacklinks('target')).toContain('source')

    wiki.deletePage('source')

    expect(wiki.getBacklinks('target')).not.toContain('source')
  })
})
```

**Dead Links and Orphans:**
```typescript
describe('dead links', () => {
  it('identifies links to non-existent pages', () => {
    const wiki = createWiki()
    wiki.createPage({
      title: 'Story',
      content: 'The [[Hero]] found the [[Magic Sword]].'
    })
    // Neither 'Hero' nor 'Magic Sword' pages exist

    const deadLinks = wiki.getDeadLinks()
    expect(deadLinks).toContain('Hero')
    expect(deadLinks).toContain('Magic Sword')
  })
})

describe('orphan pages', () => {
  it('identifies pages with no incoming links', () => {
    const wiki = createWiki()
    wiki.createPage({ title: 'Main', content: '[[Character]]' })
    wiki.createPage({ title: 'Character', content: '' })
    wiki.createPage({ title: 'Unused Note', content: '' })  // Orphan

    const orphans = wiki.getOrphans()
    expect(orphans).toContain('unused-note')
    expect(orphans).not.toContain('character')
  })
})
```

**Storage Adapter Testing:**
```typescript
describe('memory storage', () => {
  it('saves and loads pages', async () => {
    const storage = createMemoryStorage()
    const page = { id: 'test', title: 'Test', content: '', created: new Date(), modified: new Date() }

    await storage.save(page)
    const loaded = await storage.load('test')

    expect(loaded).toEqual(page)
  })

  it('returns null for non-existent page', async () => {
    const storage = createMemoryStorage()
    expect(await storage.load('nonexistent')).toBeNull()
  })

  it('lists all pages', async () => {
    const storage = createMemoryStorage()
    await storage.save({ id: 'a', title: 'A', content: '', created: new Date(), modified: new Date() })
    await storage.save({ id: 'b', title: 'B', content: '', created: new Date(), modified: new Date() })

    const pages = await storage.list()
    expect(pages).toHaveLength(2)
  })
})
```

### ID Generation

Pages need consistent IDs for linking. Common approach:

```typescript
function titleToId(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

// 'King Aldric I' → 'king-aldric-i'
// 'The "Magic" Sword' → 'the-magic-sword'
```

### Common Pitfalls

- Link matching is case-insensitive for lookup but preserves case for display
- ID generation must be deterministic (same title → same ID)
- Backlinks must be updated atomically with page updates
- Deleting a page doesn't delete references to it (they become dead links)
- Search should handle partial matches and be case-insensitive
- Watch for regex edge cases: `[[]]`, `[[ ]]`, `[[nested [[link]]]]`
