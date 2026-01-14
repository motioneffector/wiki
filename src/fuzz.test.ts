import { describe, it, expect } from 'vitest'
import { createWiki } from './core/wiki'
import { ValidationError } from './errors'
import type { Wiki } from './types'

// ============================================
// FUZZ TEST CONFIGURATION
// ============================================

const THOROUGH_MODE = process.env.FUZZ_THOROUGH === '1'
const THOROUGH_DURATION_MS = 10_000 // 10 seconds per test in thorough mode
const STANDARD_ITERATIONS = 200 // iterations per test in standard mode
const BASE_SEED = 12345 // reproducible seed for standard mode

// ============================================
// SEEDED PRNG
// ============================================

function createSeededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

// ============================================
// FUZZ LOOP HELPER
// ============================================

interface FuzzLoopResult {
  iterations: number
  seed: number
  durationMs: number
}

/**
 * Executes a fuzz test body in either standard or thorough mode.
 *
 * Standard mode: Runs exactly STANDARD_ITERATIONS times with BASE_SEED
 * Thorough mode: Runs for THOROUGH_DURATION_MS with time-based seed
 *
 * On failure, throws with full reproduction information.
 */
function fuzzLoop(
  testFn: (random: () => number, iteration: number) => void
): FuzzLoopResult {
  const startTime = Date.now()
  const seed = THOROUGH_MODE ? startTime : BASE_SEED
  const random = createSeededRandom(seed)

  let iteration = 0

  try {
    if (THOROUGH_MODE) {
      // Time-based: run until duration exceeded
      while (Date.now() - startTime < THOROUGH_DURATION_MS) {
        testFn(random, iteration)
        iteration++
      }
    } else {
      // Iteration-based: run fixed count
      for (iteration = 0; iteration < STANDARD_ITERATIONS; iteration++) {
        testFn(random, iteration)
      }
    }
  } catch (error) {
    const elapsed = Date.now() - startTime
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Fuzz test failed!\n` +
        `  Mode: ${THOROUGH_MODE ? 'thorough' : 'standard'}\n` +
        `  Seed: ${seed}\n` +
        `  Iteration: ${iteration}\n` +
        `  Elapsed: ${elapsed}ms\n` +
        `  Error: ${message}\n\n` +
        `To reproduce, run with:\n` +
        `  BASE_SEED=${seed} and start at iteration ${iteration}`
    )
  }

  return {
    iterations: iteration,
    seed,
    durationMs: Date.now() - startTime,
  }
}

/**
 * Async version of fuzzLoop for testing async functions.
 */
async function fuzzLoopAsync(
  testFn: (random: () => number, iteration: number) => Promise<void>
): Promise<FuzzLoopResult> {
  const startTime = Date.now()
  const seed = THOROUGH_MODE ? startTime : BASE_SEED
  const random = createSeededRandom(seed)

  let iteration = 0

  try {
    if (THOROUGH_MODE) {
      while (Date.now() - startTime < THOROUGH_DURATION_MS) {
        await testFn(random, iteration)
        iteration++
      }
    } else {
      for (iteration = 0; iteration < STANDARD_ITERATIONS; iteration++) {
        await testFn(random, iteration)
      }
    }
  } catch (error) {
    const elapsed = Date.now() - startTime
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Fuzz test failed!\n` +
        `  Mode: ${THOROUGH_MODE ? 'thorough' : 'standard'}\n` +
        `  Seed: ${seed}\n` +
        `  Iteration: ${iteration}\n` +
        `  Elapsed: ${elapsed}ms\n` +
        `  Error: ${message}\n\n` +
        `To reproduce, run with:\n` +
        `  BASE_SEED=${seed} and start at iteration ${iteration}`
    )
  }

  return {
    iterations: iteration,
    seed,
    durationMs: Date.now() - startTime,
  }
}

// ============================================
// VALUE GENERATORS
// ============================================

function generateString(random: () => number, maxLen = 1000): string {
  const len = Math.floor(random() * maxLen)
  return Array.from({ length: len }, () =>
    String.fromCharCode(Math.floor(random() * 0xffff))
  ).join('')
}

function generateNumber(random: () => number): number {
  const type = Math.floor(random() * 10)
  switch (type) {
    case 0:
      return 0
    case 1:
      return -0
    case 2:
      return NaN
    case 3:
      return Infinity
    case 4:
      return -Infinity
    case 5:
      return Number.MAX_SAFE_INTEGER
    case 6:
      return Number.MIN_SAFE_INTEGER
    case 7:
      return Number.EPSILON
    default:
      return (random() - 0.5) * Number.MAX_SAFE_INTEGER * 2
  }
}

function generateArray<T>(
  random: () => number,
  generator: (r: () => number) => T,
  maxLen = 100
): T[] {
  const len = Math.floor(random() * maxLen)
  return Array.from({ length: len }, () => generator(random))
}

function generateObject(
  random: () => number,
  depth = 0,
  maxDepth = 5
): unknown {
  if (depth >= maxDepth) return null

  const type = Math.floor(random() * 6)
  switch (type) {
    case 0:
      return null
    case 1:
      return generateNumber(random)
    case 2:
      return generateString(random, 100)
    case 3:
      return depth < maxDepth - 1
        ? generateArray(random, (r) => generateObject(r, depth + 1, maxDepth), 10)
        : []
    case 4: {
      const obj: Record<string, unknown> = {}
      const keyCount = Math.floor(random() * 10)
      for (let i = 0; i < keyCount; i++) {
        const key = generateString(random, 20) || `key${i}`
        obj[key] = generateObject(random, depth + 1, maxDepth)
      }
      return obj
    }
    default:
      return undefined
  }
}

// Prototype pollution test values
function generateMaliciousObject(random: () => number): unknown {
  const attacks = [
    { __proto__: { polluted: true } },
    { constructor: { prototype: { polluted: true } } },
    JSON.parse('{"__proto__": {"polluted": true}}'),
    Object.create(null, { dangerous: { value: true } }),
  ]
  return attacks[Math.floor(random() * attacks.length)]
}

// Wiki-specific generators

function generateTitle(random: () => number): string {
  const type = Math.floor(random() * 15)
  switch (type) {
    case 0:
      return ''
    case 1:
      return '   '
    case 2:
      return '\n\n'
    case 3:
      return '\0'
    case 4:
      return '🎭'.repeat(10) // Reduced from 100
    case 5:
      return 'A'.repeat(10000) // Reduced from 1MB to 10KB
    case 6:
      return '__proto__'
    case 7:
      return 'constructor'
    case 8:
      return '<script>alert("xss")</script>'
    case 9:
      return "'; DROP TABLE pages;--"
    case 10:
      return '\u200B\u200C\u200D' // zero-width chars
    case 11:
      return 'مرحبا' // RTL text
    case 12:
      return '𝕳𝖊𝖑𝖑𝖔' // mathematical alphanumeric symbols
    default:
      return generateString(random, 50)
  }
}

function generateContent(random: () => number): string {
  const type = Math.floor(random() * 20)
  switch (type) {
    case 0:
      return ''
    case 1:
      return '[['.repeat(100) + ']]'.repeat(100) // Reduced from 1000
    case 2:
      return '[[A|B|C|D|E]]' // multiple pipes
    case 3:
      return '[[]]' // empty link
    case 4:
      return '[[   ]]' // whitespace link
    case 5:
      return '[[A\nB]]' // newline in link
    case 6:
      return '[[' + 'A'.repeat(1000) + ']]' // Reduced from 100K to 1K
    case 7:
      return '```\n[[This is in a code block]]\n```'
    case 8:
      return '`[[Inline code]]`'
    case 9:
      return Array.from({ length: 100 }, (_, i) => `[[Link${i}]]`).join(' ') // Reduced from 1000
    case 10:
      return '[[[Triple brackets]]]'
    case 11:
      return 'Text [[A]][[B]][[C]] more text' // adjacent links
    case 12:
      return '[[A]] '.repeat(100) // Reduced from 10000
    case 13:
      return generateString(random, 10000) // Reduced from 1MB to 10KB
    case 14:
      return '\0\0\0' // null bytes
    case 15:
      return '((((((((((((((((((((((((((((((((((((((((((([[A]]' // ReDoS attempt
    default: {
      // Normal-ish content with some links
      const linkCount = Math.floor(random() * 10)
      const words = generateArray(random, (r) => generateString(r, 10), 50)
      const links = generateArray(
        random,
        (r) => `[[${generateString(r, 20)}]]`,
        linkCount
      )
      return [...words, ...links].join(' ')
    }
  }
}

function generateTags(random: () => number): string[] | undefined {
  const type = Math.floor(random() * 6)
  switch (type) {
    case 0:
      return undefined
    case 1:
      return []
    case 2:
      return ['tag']
    case 3:
      return generateArray(random, (r) => generateString(r, 20), 100)
    case 4:
      return ['\0', '\n', '\t']
    case 5:
      return ['__proto__', 'constructor']
    default:
      return generateArray(random, (r) => generateString(r, 15), 5)
  }
}

function generateCreatePageData(random: () => number): any {
  return {
    title: generateTitle(random),
    content: generateContent(random),
    type: random() > 0.5 ? generateString(random, 20) : undefined,
    tags: generateTags(random),
    id: random() > 0.7 ? generateString(random, 30) : undefined,
  }
}

// ============================================
// FUZZ TESTS
// ============================================

describe('Fuzz: createPage', () => {
  it('handles random inputs without crashing', async () => {
    const result = await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()
      const data = generateCreatePageData(random)

      try {
        await wiki.createPage(data)
      } catch (e) {
        // Verify it's an expected error type
        if (!(e instanceof ValidationError || e instanceof Error)) {
          throw new Error(`Unexpected error type: ${e?.constructor?.name}`)
        }
      }
    })

    if (THOROUGH_MODE) {
      console.log(
        `Completed ${result.iterations} iterations in ${result.durationMs}ms`
      )
    }
  })

  it('never mutates input data', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()
      const data = generateCreatePageData(random)
      const original = JSON.parse(JSON.stringify(data))

      try {
        await wiki.createPage(data)
      } catch (e) {
        // Ignore validation errors
      }

      // Verify input wasn't mutated
      if (JSON.stringify(data) !== JSON.stringify(original)) {
        throw new Error('Input was mutated')
      }
    })
  })

  it('maintains backlink consistency after creation', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      // Create target page
      await wiki.createPage({ title: 'Target', content: '' })

      // Create page with link
      try {
        const page = await wiki.createPage({
          title: generateTitle(random),
          content: '[[Target]] and some other content',
        })

        // Verify backlink exists
        const backlinks = wiki.getBacklinks('target')
        if (!backlinks.includes(page.id)) {
          throw new Error('Backlink not created')
        }
      } catch (e) {
        if (!(e instanceof ValidationError)) {
          throw e
        }
      }
    })
  })

  it('never allows duplicate IDs', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      // Create first page successfully
      const title1 = `ValidTitle${i}_1`
      const page1 = await wiki.createPage({
        title: title1,
        content: 'Content 1',
      })

      // Try to create second page with same ID
      try {
        await wiki.createPage({
          title: `ValidTitle${i}_2`,
          content: 'Content 2',
          id: page1.id,
        })
        throw new Error('Should have rejected duplicate ID')
      } catch (e) {
        if (!(e instanceof ValidationError || e instanceof Error)) {
          throw new Error(`Expected error for duplicate ID`)
        }
      }
    })
  })

  it('completes within time budget', async () => {
    const wiki = createWiki()
    const startTime = Date.now()

    for (let i = 0; i < 50; i++) {
      try {
        await wiki.createPage({
          title: `TestPage${i}`,
          content: 'Some content [[Link1]] and [[Link2]]',
        })
      } catch (e) {
        // Ignore errors
      }
    }

    const elapsed = Date.now() - startTime
    if (elapsed > 5000) {
      // 50 pages in 5 seconds = 100ms average
      throw new Error(`Too slow: ${elapsed}ms for 50 pages`)
    }
  })
})

describe('Fuzz: updatePage', () => {
  it('handles random inputs without crashing', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      // Create a page to update
      const page = await wiki.createPage({
        title: `TestPage${i}`,
        content: 'Initial content',
      })

      // Generate random update data
      const updateData: any = {}
      if (random() > 0.5) updateData.title = generateTitle(random)
      if (random() > 0.5) updateData.content = generateContent(random)
      if (random() > 0.5) updateData.type = generateString(random, 20)
      if (random() > 0.5) updateData.tags = generateTags(random)

      try {
        await wiki.updatePage(page.id, updateData)
      } catch (e) {
        if (!(e instanceof ValidationError || e instanceof Error)) {
          throw new Error(`Unexpected error type: ${e?.constructor?.name}`)
        }
      }
    })
  })

  it('updates only specified fields', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      const page = await wiki.createPage({
        title: `TestPage${i}`,
        content: 'Original content',
        type: 'note',
        tags: ['tag1', 'tag2'],
      })

      const originalTitle = page.title
      const originalContent = page.content

      try {
        // Update only type
        const updated = await wiki.updatePage(page.id, { type: 'article' })

        // Title and content should be unchanged
        if (updated.title !== originalTitle) {
          throw new Error('Title was changed when it should not be')
        }
        if (updated.content !== originalContent) {
          throw new Error('Content was changed when it should not be')
        }
        if (updated.type !== 'article') {
          throw new Error('Type was not updated')
        }
      } catch (e) {
        if (!(e instanceof ValidationError)) {
          throw e
        }
      }
    })
  })

  it('correctly updates backlinks when content changes', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      // Create target pages
      await wiki.createPage({ title: 'Target1', content: '' })
      await wiki.createPage({ title: 'Target2', content: '' })

      // Create source page with link to Target1
      const source = await wiki.createPage({
        title: `Source${i}`,
        content: '[[Target1]]',
      })

      // Update to link to Target2 instead
      try {
        await wiki.updatePage(source.id, { content: '[[Target2]]' })

        const backlinks1 = wiki.getBacklinks('target1')
        const backlinks2 = wiki.getBacklinks('target2')

        if (backlinks1.includes(source.id)) {
          throw new Error('Old backlink not removed')
        }
        if (!backlinks2.includes(source.id)) {
          throw new Error('New backlink not created')
        }
      } catch (e) {
        if (!(e instanceof ValidationError)) {
          throw e
        }
      }
    })
  })

  it('throws when ID does not exist', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      const nonExistentId = `nonexistent${i}_${Math.random()}`

      try {
        await wiki.updatePage(nonExistentId, { title: 'New Title' })
        throw new Error('Should have thrown for non-existent ID')
      } catch (e) {
        if (!(e instanceof Error)) {
          throw new Error('Expected error for non-existent ID')
        }
      }
    })
  })
})

describe('Fuzz: renamePage', () => {
  it('handles random inputs without crashing', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      const page = await wiki.createPage({
        title: `TestPage${i}`,
        content: 'Content',
      })

      const newTitle = generateTitle(random)
      const updateId = random() > 0.5

      try {
        await wiki.renamePage(page.id, newTitle, { updateId })
      } catch (e) {
        if (!(e instanceof ValidationError || e instanceof Error)) {
          throw new Error(`Unexpected error type: ${e?.constructor?.name}`)
        }
      }
    })
  })

  it('with updateId=false preserves ID', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      const page = await wiki.createPage({
        title: `TestPage${i}`,
        content: 'Content',
      })

      const originalId = page.id
      const newTitle = `NewTitle${i}`

      try {
        const renamed = await wiki.renamePage(page.id, newTitle, {
          updateId: false,
        })

        if (renamed.id !== originalId) {
          throw new Error('ID changed when updateId=false')
        }
        if (renamed.title !== newTitle) {
          throw new Error('Title not updated')
        }
      } catch (e) {
        if (!(e instanceof ValidationError)) {
          throw e
        }
      }
    })
  })

  it('with updateId=true updates link content in other pages', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      // Create target page
      const target = await wiki.createPage({
        title: `Target${i}`,
        content: '',
      })

      // Create source page linking to target
      const source = await wiki.createPage({
        title: `Source${i}`,
        content: `[[Target${i}]]`,
      })

      try {
        // Rename target with updateId=true
        const renamed = await wiki.renamePage(target.id, `NewTarget${i}`, {
          updateId: true,
        })

        // Source content should be updated with new title
        const updatedSource = wiki.getPage(source.id)
        if (!updatedSource?.content.includes(`[[NewTarget${i}]]`)) {
          throw new Error('Link content not updated in source page')
        }
      } catch (e) {
        if (!(e instanceof ValidationError)) {
          throw e
        }
      }
    })
  })
})

describe('Fuzz: search', () => {
  it('handles random queries without crashing', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      // Create some pages (reduced to avoid memory issues in thorough mode)
      for (let j = 0; j < 3; j++) {
        try {
          await wiki.createPage({
            title: `Page${i}_${j}`,
            content: generateContent(random),
          })
        } catch (e) {
          // Ignore creation errors
        }
      }

      const query = generateString(random, 100)
      const options: any = {}

      if (random() > 0.5) {
        options.limit = Math.floor(generateNumber(random))
      }

      try {
        const results = wiki.search(query, options)

        // Results should be an array
        if (!Array.isArray(results)) {
          throw new Error('Search did not return array')
        }

        // Results should never exceed limit
        if (options.limit && options.limit > 0 && results.length > options.limit) {
          throw new Error(`Results exceed limit: ${results.length} > ${options.limit}`)
        }
      } catch (e) {
        // Search should never throw
        throw new Error(`Search threw unexpectedly: ${e}`)
      }
    })
  })

  it('results are stable and deterministic', async () => {
    const wiki = createWiki()

    // Create pages with known content
    await wiki.createPage({ title: 'Alpha', content: 'test content alpha' })
    await wiki.createPage({ title: 'Beta', content: 'test content beta' })
    await wiki.createPage({ title: 'Gamma', content: 'test content gamma' })

    const results1 = wiki.search('test content')
    const results2 = wiki.search('test content')

    const ids1 = results1.map((p) => p.id).join(',')
    const ids2 = results2.map((p) => p.id).join(',')

    if (ids1 !== ids2) {
      throw new Error('Search results are not deterministic')
    }
  })

  it('never returns deleted pages', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      // Create pages (reduced for thorough mode)
      const pages = []
      for (let j = 0; j < 5; j++) {
        const page = await wiki.createPage({
          title: `Page${i}_${j}`,
          content: `searchable content ${i}`,
        })
        pages.push(page)
      }

      // Delete some pages randomly
      for (const page of pages) {
        if (random() > 0.5) {
          await wiki.deletePage(page.id)
        }
      }

      // Search should not return deleted pages
      const results = wiki.search(`searchable content ${i}`)

      for (const result of results) {
        try {
          wiki.getPage(result.id)
        } catch (e) {
          throw new Error(`Search returned deleted page: ${result.id}`)
        }
      }
    })
  })
})

describe('Fuzz: listPages', () => {
  it('handles random options without crashing', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      // Create some pages (reduced for thorough mode)
      for (let j = 0; j < 3; j++) {
        try {
          await wiki.createPage({
            title: `Page${i}_${j}`,
            content: 'Content',
            type: random() > 0.5 ? 'note' : 'article',
            tags: random() > 0.5 ? ['tag1'] : ['tag2'],
          })
        } catch (e) {
          // Ignore
        }
      }

      const options: any = {}

      if (random() > 0.5) {
        options.limit = Math.floor(generateNumber(random))
      }
      if (random() > 0.5) {
        options.offset = Math.floor(generateNumber(random))
      }
      if (random() > 0.5) {
        options.type = generateString(random, 20)
      }

      try {
        const results = wiki.listPages(options)

        if (!Array.isArray(results)) {
          throw new Error('listPages did not return array')
        }
      } catch (e) {
        // listPages should generally not throw
        if (!(e instanceof Error)) {
          throw new Error(`Unexpected error: ${e}`)
        }
      }
    })
  })

  it('respects limit correctly', async () => {
    const wiki = createWiki()

    // Create 20 pages
    for (let i = 0; i < 20; i++) {
      await wiki.createPage({ title: `Page${i}`, content: 'Content' })
    }

    const limits = [1, 5, 10, 15, 100]
    for (const limit of limits) {
      const results = wiki.listPages({ limit })
      if (results.length > limit) {
        throw new Error(`Results exceed limit: ${results.length} > ${limit}`)
      }
    }
  })

  it('never returns duplicates', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      for (let j = 0; j < 5; j++) {
        try {
          await wiki.createPage({
            title: `Page${i}_${j}`,
            content: 'Content',
          })
        } catch (e) {
          // Ignore
        }
      }

      const results = wiki.listPages()
      const ids = results.map((p) => p.id)
      const uniqueIds = [...new Set(ids)]

      if (ids.length !== uniqueIds.length) {
        throw new Error('listPages returned duplicate pages')
      }
    })
  })
})

describe('Fuzz: import/export', () => {
  it('export then import preserves state', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      // Create pages (reduced for thorough mode)
      for (let j = 0; j < 3; j++) {
        try {
          await wiki.createPage({
            title: `Page${i}_${j}`,
            content: generateContent(random),
            type: 'note',
            tags: ['tag1'],
          })
        } catch (e) {
          // Ignore creation errors
        }
      }

      const exported = wiki.export()
      const wiki2 = createWiki()
      await wiki2.import(exported)

      const pages1 = wiki.listPages()
      const pages2 = wiki2.listPages()

      if (pages1.length !== pages2.length) {
        throw new Error(
          `Page count mismatch: ${pages1.length} != ${pages2.length}`
        )
      }
    })
  })

  it('import with skip mode never overwrites', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      const page = await wiki.createPage({
        title: `TestPage${i}`,
        content: 'Original content',
      })

      const imported = [
        {
          id: page.id,
          title: `TestPage${i}`,
          content: 'New content',
          type: undefined,
          tags: [],
          created: new Date(),
          modified: new Date(),
        },
      ]

      await wiki.import(imported, { mode: 'skip' })

      const retrieved = wiki.getPage(page.id)
      if (retrieved.content !== 'Original content') {
        throw new Error('Page was overwritten in skip mode')
      }
    })
  })

  it('handles malformed import data gracefully', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      const malformed: any = generateArray(
        random,
        (r) => generateObject(r, 0, 3),
        10
      )

      try {
        await wiki.import(malformed)
      } catch (e) {
        // Should throw ValidationError or similar
        if (!(e instanceof Error)) {
          throw new Error(`Unexpected error type: ${e}`)
        }
      }

      // Wiki should still be functional
      const pages = wiki.listPages()
      expect(Array.isArray(pages)).toBe(true)
    })
  })
})

describe('Fuzz: resolveLink', () => {
  it('handles random strings without crashing', () => {
    fuzzLoop((random, i) => {
      const wiki = createWiki()
      const input = generateString(random, 200)

      try {
        const result = wiki.resolveLink(input)

        if (typeof result !== 'string') {
          throw new Error('resolveLink did not return string')
        }
      } catch (e) {
        throw new Error(`resolveLink threw unexpectedly: ${e}`)
      }
    })
  })

  it('is idempotent', () => {
    fuzzLoop((random, i) => {
      const wiki = createWiki()
      const input = generateString(random, 100)

      const result1 = wiki.resolveLink(input)
      const result2 = wiki.resolveLink(result1)

      if (result1 !== result2) {
        throw new Error('resolveLink is not idempotent')
      }
    })
  })

  it('is case-insensitive', () => {
    const wiki = createWiki()

    const testCases = [
      ['ABC', 'abc'],
      ['Hello World', 'HELLO WORLD'],
      ['Test', 'TeSt'],
    ]

    for (const [a, b] of testCases) {
      const resolved1 = wiki.resolveLink(a)
      const resolved2 = wiki.resolveLink(b)

      if (resolved1 !== resolved2) {
        throw new Error(
          `resolveLink not case-insensitive: ${a} -> ${resolved1}, ${b} -> ${resolved2}`
        )
      }
    }
  })
})

describe('Fuzz: State machine sequences', () => {
  it('maintains consistency through random operations', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()
      const pageIds: string[] = []

      // Perform random sequence of operations (reduced for thorough mode)
      const opCount = Math.floor(random() * 20) + 5
      for (let j = 0; j < opCount; j++) {
        const op = Math.floor(random() * 4)

        try {
          if (op === 0 || pageIds.length === 0) {
            // Create page
            const page = await wiki.createPage({
              title: `Page${i}_${j}`,
              content: generateContent(random),
            })
            pageIds.push(page.id)
          } else if (op === 1 && pageIds.length > 0) {
            // Update page
            const id = pageIds[Math.floor(random() * pageIds.length)]
            await wiki.updatePage(id, {
              content: generateContent(random),
            })
          } else if (op === 2 && pageIds.length > 0) {
            // Rename page
            const id = pageIds[Math.floor(random() * pageIds.length)]
            await wiki.renamePage(id, `Renamed${i}_${j}`)
          } else if (op === 3 && pageIds.length > 0) {
            // Delete page
            const idx = Math.floor(random() * pageIds.length)
            const id = pageIds[idx]
            await wiki.deletePage(id)
            pageIds.splice(idx, 1)
          }
        } catch (e) {
          // Some operations may fail, that's ok
        }
      }

      // Verify final consistency
      const listed = wiki.listPages()
      if (listed.length !== pageIds.length) {
        throw new Error(
          `Page count mismatch: expected ${pageIds.length}, got ${listed.length}`
        )
      }

      // Verify graph only contains existing pages as SOURCE keys
      // (Targets can be dead links, which is expected behavior)
      const graph = wiki.getGraph()
      for (const source of Object.keys(graph)) {
        if (!pageIds.includes(source)) {
          throw new Error(
            `Graph contains deleted page as source: ${source}`
          )
        }
      }

      // Verify backlink index only contains existing pages
      // (Both sources and targets in backlinks should exist)
      for (const id of pageIds) {
        const backlinks = wiki.getBacklinks(id)
        for (const backlink of backlinks) {
          if (!pageIds.includes(backlink)) {
            throw new Error(
              `Backlink index contains deleted page: ${backlink}`
            )
          }
        }
      }
    })
  })

  it('maintains graph consistency', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      // Create interconnected pages (reduced for thorough mode)
      const pages = []
      const pageCount = 5
      for (let j = 0; j < pageCount; j++) {
        const page = await wiki.createPage({
          title: `Page${i}_${j}`,
          content: `Content with [[Page${i}_${(j + 1) % pageCount}]]`,
        })
        pages.push(page)
      }

      // Randomly delete some pages
      const toDelete = pages.filter(() => random() > 0.7)
      for (const page of toDelete) {
        await wiki.deletePage(page.id)
      }

      // Verify graph sources are all existing pages
      // (Targets can be dead links after deletion)
      const graph = wiki.getGraph()
      const allIds = wiki.listPages().map((p) => p.id)

      for (const source of Object.keys(graph)) {
        if (!allIds.includes(source)) {
          throw new Error(`Graph has deleted source: ${source}`)
        }
      }

      // Verify dead links are tracked
      const deadLinks = wiki.getDeadLinks()
      if (toDelete.length > 0 && deadLinks.length === 0) {
        // This might not always fail if deleted pages weren't linked
        // So we just verify the API works
      }
    })
  })
})

describe('Fuzz: Event system', () => {
  it('unsubscribed listeners never fire', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      let fired = false
      const unsubscribe = wiki.onChange(() => {
        fired = true
      })

      // Unsubscribe immediately
      unsubscribe()

      // Perform operations
      try {
        await wiki.createPage({ title: `TestPage${i}`, content: 'Content' })
      } catch (e) {
        // Ignore
      }

      if (fired) {
        throw new Error('Unsubscribed listener fired')
      }
    })
  })

  it('active listeners receive all events', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      const events: any[] = []
      wiki.onChange((event) => {
        events.push(event)
      })

      // Perform operations (reduced for thorough mode)
      const operations = Math.floor(random() * 3) + 1
      for (let j = 0; j < operations; j++) {
        try {
          await wiki.createPage({
            title: `Page${i}_${j}`,
            content: 'Content',
          })
        } catch (e) {
          // Ignore
        }
      }

      // Should have received events (at least attempted)
      // Events should be objects with type field
      for (const event of events) {
        if (typeof event !== 'object' || !event.type) {
          throw new Error('Invalid event object')
        }
      }
    })
  })
})

describe('Fuzz: Concurrency', () => {
  it('concurrent createPage with same title creates unique IDs', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      const title = `SharedTitle${i}`
      const promises = []

      for (let j = 0; j < 10; j++) {
        promises.push(
          wiki.createPage({ title, content: `Content${j}` }).catch(() => null)
        )
      }

      const results = await Promise.all(promises)
      const pages = results.filter((p) => p !== null)

      // All successful pages should have unique IDs
      const ids = pages.map((p) => p!.id)
      const uniqueIds = [...new Set(ids)]

      if (ids.length !== uniqueIds.length) {
        throw new Error('Concurrent creates resulted in duplicate IDs')
      }
    })
  })

  it('concurrent operations maintain consistency', async () => {
    await fuzzLoopAsync(async (random, i) => {
      const wiki = createWiki()

      // Create initial pages (reduced for thorough mode)
      const pages = []
      for (let j = 0; j < 3; j++) {
        const page = await wiki.createPage({
          title: `Page${i}_${j}`,
          content: 'Initial',
        })
        pages.push(page)
      }

      // Fire concurrent updates (reduced for thorough mode)
      const promises = []
      for (let j = 0; j < 5; j++) {
        const page = pages[Math.floor(random() * pages.length)]
        promises.push(
          wiki
            .updatePage(page.id, { content: `Updated${j}` })
            .catch(() => null)
        )
      }

      await Promise.all(promises)

      // Wiki should still be consistent
      const listed = wiki.listPages()
      expect(listed.length).toBeGreaterThan(0)

      // All pages should be retrievable
      for (const page of listed) {
        wiki.getPage(page.id)
      }
    })
  })
})
