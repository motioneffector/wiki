// Import library to ensure it is available (also set by demo.js)
import * as Library from '../dist/index.js'
if (!window.Library) window.Library = Library

// ============================================
// DEMO INTEGRITY TESTS
// These tests verify the demo itself is correctly structured.
// They are IDENTICAL across all @motioneffector demos.
// Do not modify, skip, or weaken these tests.
// ============================================

function registerIntegrityTests() {
  // ─────────────────────────────────────────────
  // STRUCTURAL INTEGRITY
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Library is loaded', () => {
    if (typeof window.Library === 'undefined') {
      throw new Error('window.Library is undefined - library not loaded')
    }
  })

  testRunner.registerTest('[Integrity] Library has exports', () => {
    const exports = Object.keys(window.Library)
    if (exports.length === 0) {
      throw new Error('window.Library has no exports')
    }
  })

  testRunner.registerTest('[Integrity] Test runner exists', () => {
    const runner = document.getElementById('test-runner')
    if (!runner) {
      throw new Error('No element with id="test-runner"')
    }
  })

  testRunner.registerTest('[Integrity] Test runner is first section after header', () => {
    const main = document.querySelector('main')
    if (!main) {
      throw new Error('No <main> element found')
    }
    const firstSection = main.querySelector('section')
    if (!firstSection || firstSection.id !== 'test-runner') {
      throw new Error('Test runner must be the first <section> inside <main>')
    }
  })

  testRunner.registerTest('[Integrity] Run All Tests button exists with correct format', () => {
    const btn = document.getElementById('run-all-tests')
    if (!btn) {
      throw new Error('No button with id="run-all-tests"')
    }
    const text = btn.textContent.trim()
    if (!text.includes('Run All Tests')) {
      throw new Error(`Button text must include "Run All Tests", got: "${text}"`)
    }
    const icon = btn.querySelector('.btn-icon')
    if (!icon || !icon.textContent.includes('▶')) {
      throw new Error('Button must have play icon (▶) in .btn-icon element')
    }
  })

  testRunner.registerTest('[Integrity] At least one exhibit exists', () => {
    const exhibits = document.querySelectorAll('.exhibit')
    if (exhibits.length === 0) {
      throw new Error('No elements with class="exhibit"')
    }
  })

  testRunner.registerTest('[Integrity] All exhibits have unique IDs', () => {
    const exhibits = document.querySelectorAll('.exhibit')
    const ids = new Set()
    exhibits.forEach(ex => {
      if (!ex.id) {
        throw new Error('Exhibit missing id attribute')
      }
      if (ids.has(ex.id)) {
        throw new Error(`Duplicate exhibit id: ${ex.id}`)
      }
      ids.add(ex.id)
    })
  })

  testRunner.registerTest('[Integrity] All exhibits registered for walkthrough', () => {
    const exhibitElements = document.querySelectorAll('.exhibit')
    const registeredCount = testRunner.exhibits.length
    // Subtract any non-exhibit registrations if needed
    if (registeredCount < exhibitElements.length) {
      throw new Error(
        `Only ${registeredCount} exhibits registered for walkthrough, ` +
        `but ${exhibitElements.length} .exhibit elements exist`
      )
    }
  })

  testRunner.registerTest('[Integrity] CSS loaded from demo-files/', () => {
    const links = document.querySelectorAll('link[rel="stylesheet"]')
    const hasExternal = Array.from(links).some(link =>
      link.href.includes('demo-files/')
    )
    if (!hasExternal) {
      throw new Error('No stylesheet loaded from demo-files/ directory')
    }
  })

  testRunner.registerTest('[Integrity] No inline style tags', () => {
    const styles = document.querySelectorAll('style')
    if (styles.length > 0) {
      throw new Error(`Found ${styles.length} inline <style> tags - extract to demo-files/demo.css`)
    }
  })

  testRunner.registerTest('[Integrity] No inline onclick handlers', () => {
    const withOnclick = document.querySelectorAll('[onclick]')
    if (withOnclick.length > 0) {
      throw new Error(`Found ${withOnclick.length} elements with onclick - use addEventListener`)
    }
  })

  // ─────────────────────────────────────────────
  // NO AUTO-PLAY VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Output areas are empty on load', () => {
    const outputs = document.querySelectorAll('.exhibit-output, .output, [data-output]')
    outputs.forEach(output => {
      // Allow placeholder text but not actual content
      const hasPlaceholder = output.dataset.placeholder ||
        output.classList.contains('placeholder') ||
        output.querySelector('.placeholder')

      const text = output.textContent.trim()
      const children = output.children.length

      // If it has content that isn't a placeholder, that's a violation
      if ((text.length > 50 || children > 1) && !hasPlaceholder) {
        throw new Error(
          `Output area appears pre-populated: "${text.substring(0, 50)}..." - ` +
          `outputs must be empty until user interaction`
        )
      }
    })
  })

  testRunner.registerTest('[Integrity] No setTimeout calls on module load', () => {
    // This test verifies by checking a flag set during load
    // The test-runner.js must set window.__demoLoadComplete = true after load
    // Any setTimeout from module load would not have completed
    if (window.__suspiciousTimersDetected) {
      throw new Error(
        'Detected setTimeout/setInterval during page load - ' +
        'demos must not auto-run'
      )
    }
  })

  // ─────────────────────────────────────────────
  // REAL LIBRARY VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Library functions are callable', () => {
    const lib = window.Library
    const exports = Object.keys(lib)

    // At least one export must be a function
    const hasFunctions = exports.some(key => typeof lib[key] === 'function')
    if (!hasFunctions) {
      throw new Error('Library exports no callable functions')
    }
  })

  testRunner.registerTest('[Integrity] No mock implementations detected', () => {
    // Check for common mock patterns in window
    const suspicious = [
      'mockParse', 'mockValidate', 'fakeParse', 'fakeValidate',
      'stubParse', 'stubValidate', 'testParse', 'testValidate'
    ]
    suspicious.forEach(name => {
      if (typeof window[name] === 'function') {
        throw new Error(`Detected mock function: window.${name} - use real library`)
      }
    })
  })

  // ─────────────────────────────────────────────
  // VISUAL FEEDBACK VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] CSS includes animation definitions', () => {
    const sheets = document.styleSheets
    let hasAnimations = false

    try {
      for (const sheet of sheets) {
        // Skip cross-origin stylesheets
        if (!sheet.href || sheet.href.includes('demo-files/')) {
          const rules = sheet.cssRules || sheet.rules
          for (const rule of rules) {
            if (rule.type === CSSRule.KEYFRAMES_RULE ||
                (rule.style && (
                  rule.style.animation ||
                  rule.style.transition ||
                  rule.style.animationName
                ))) {
              hasAnimations = true
              break
            }
          }
        }
        if (hasAnimations) break
      }
    } catch (e) {
      // CORS error - assume external sheet has animations
      hasAnimations = true
    }

    if (!hasAnimations) {
      throw new Error('No CSS animations or transitions found - visual feedback required')
    }
  })

  testRunner.registerTest('[Integrity] Interactive elements have hover states', () => {
    const buttons = document.querySelectorAll('button, .btn')
    if (buttons.length === 0) return // No buttons to check

    // Check that buttons aren't unstyled
    const btn = buttons[0]
    const styles = window.getComputedStyle(btn)
    if (styles.cursor !== 'pointer') {
      throw new Error('Buttons should have cursor: pointer')
    }
  })

  // ─────────────────────────────────────────────
  // WALKTHROUGH REGISTRATION VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Walkthrough demonstrations are async functions', () => {
    testRunner.exhibits.forEach(exhibit => {
      if (typeof exhibit.demonstrate !== 'function') {
        throw new Error(`Exhibit "${exhibit.name}" has no demonstrate function`)
      }
      // Check if it's async by seeing if it returns a thenable
      const result = exhibit.demonstrate.toString()
      if (!result.includes('async') && !result.includes('Promise')) {
        console.warn(`Exhibit "${exhibit.name}" demonstrate() may not be async`)
      }
    })
  })

  testRunner.registerTest('[Integrity] Each exhibit has required elements', () => {
    const exhibits = document.querySelectorAll('.exhibit')
    exhibits.forEach(exhibit => {
      // Must have a title
      const title = exhibit.querySelector('.exhibit-title, h2, h3')
      if (!title) {
        throw new Error(`Exhibit ${exhibit.id} missing title element`)
      }

      // Must have an interactive area
      const interactive = exhibit.querySelector(
        '.exhibit-interactive, .exhibit-content, [data-interactive]'
      )
      if (!interactive) {
        throw new Error(`Exhibit ${exhibit.id} missing interactive area`)
      }
    })
  })
}

// Register integrity tests FIRST
registerIntegrityTests()

// ============================================
// LIBRARY-SPECIFIC TESTS
// ============================================

const { createWiki } = window.Library

// Wiki Creation
testRunner.registerTest('creates wiki instance with no options', () => {
  const w = createWiki()
  if (!w) throw new Error('Expected wiki instance')
})

testRunner.registerTest('starts with no pages', () => {
  const w = createWiki()
  const pages = w.listPages()
  if (pages.length !== 0) throw new Error('Expected empty pages')
})

testRunner.registerTest('returns object with all documented methods', () => {
  const w = createWiki()
  const methods = ['createPage', 'getPage', 'updatePage', 'deletePage', 'listPages', 'search',
    'getLinks', 'getBacklinks', 'getDeadLinks', 'getOrphans', 'getGraph', 'getConnectedPages',
    'getTags', 'getTypes', 'export', 'import', 'onChange']
  for (const m of methods) {
    if (typeof w[m] !== 'function') throw new Error(`Missing method: ${m}`)
  }
})

// Page Creation
testRunner.registerTest('creates page with title only', async () => {
  const w = createWiki()
  const page = await w.createPage({ title: 'Test Page' })
  if (!page.id) throw new Error('Expected page id')
  if (page.title !== 'Test Page') throw new Error('Wrong title')
})

testRunner.registerTest('creates page with all fields', async () => {
  const w = createWiki()
  const page = await w.createPage({
    title: 'Full Page',
    content: 'Content here',
    type: 'article',
    tags: ['test', 'demo']
  })
  if (page.content !== 'Content here') throw new Error('Wrong content')
  if (page.type !== 'article') throw new Error('Wrong type')
  if (!page.tags.includes('test')) throw new Error('Missing tag')
})

testRunner.registerTest('generates slug id from title', async () => {
  const w = createWiki()
  const page = await w.createPage({ title: 'My Test Page' })
  if (page.id !== 'my-test-page') throw new Error(`Wrong id: ${page.id}`)
})

testRunner.registerTest('sets created and modified timestamps', async () => {
  const w = createWiki()
  const page = await w.createPage({ title: 'Timestamped' })
  if (!(page.created instanceof Date)) throw new Error('created not a Date')
  if (!(page.modified instanceof Date)) throw new Error('modified not a Date')
})

testRunner.registerTest('throws on empty title', async () => {
  const w = createWiki()
  try {
    await w.createPage({ title: '' })
    throw new Error('Should have thrown')
  } catch (e) {
    if (!e.message.includes('empty')) throw new Error('Wrong error message')
  }
})

// Page Retrieval
testRunner.registerTest('getPage returns page by id', async () => {
  const w = createWiki()
  await w.createPage({ title: 'Findable' })
  const page = w.getPage('findable')
  if (!page || page.title !== 'Findable') throw new Error('Page not found')
})

testRunner.registerTest('getPage returns undefined for non-existent', () => {
  const w = createWiki()
  const page = w.getPage('nonexistent')
  if (page !== undefined) throw new Error('Should be undefined')
})

testRunner.registerTest('getPageByTitle finds by exact title', async () => {
  const w = createWiki()
  await w.createPage({ title: 'Exact Title' })
  const page = w.getPageByTitle('Exact Title')
  if (!page) throw new Error('Page not found')
})

testRunner.registerTest('getPageByTitle case-insensitive option', async () => {
  const w = createWiki()
  await w.createPage({ title: 'CamelCase' })
  const page = w.getPageByTitle('camelcase', { ignoreCase: true })
  if (!page) throw new Error('Page not found')
})

// Page Update
testRunner.registerTest('updatePage changes content', async () => {
  const w = createWiki()
  await w.createPage({ title: 'Updatable' })
  await w.updatePage('updatable', { content: 'New content' })
  const page = w.getPage('updatable')
  if (page.content !== 'New content') throw new Error('Content not updated')
})

testRunner.registerTest('updatePage changes modified timestamp', async () => {
  const w = createWiki()
  const created = await w.createPage({ title: 'Time Test' })
  await new Promise(r => setTimeout(r, 10))
  await w.updatePage('time-test', { content: 'Changed' })
  const updated = w.getPage('time-test')
  if (updated.modified.getTime() <= created.modified.getTime()) {
    throw new Error('Modified time not updated')
  }
})

// Page Deletion
testRunner.registerTest('deletePage removes page', async () => {
  const w = createWiki()
  await w.createPage({ title: 'Deletable' })
  await w.deletePage('deletable')
  if (w.getPage('deletable')) throw new Error('Page still exists')
})

testRunner.registerTest('deletePage throws for non-existent', async () => {
  const w = createWiki()
  try {
    await w.deletePage('ghost')
    throw new Error('Should have thrown')
  } catch (e) {
    if (!e.message.includes('not found')) throw new Error('Wrong error')
  }
})

// Links
testRunner.registerTest('extracts links from content', async () => {
  const w = createWiki()
  await w.createPage({ title: 'Linker', content: 'See [[Target One]] and [[Target Two]]' })
  const links = w.getLinks('linker')
  if (links.length !== 2) throw new Error(`Expected 2 links, got ${links.length}`)
})

testRunner.registerTest('getBacklinks returns linking pages', async () => {
  const w = createWiki()
  await w.createPage({ title: 'Source', content: '[[Target]]' })
  await w.createPage({ title: 'Target', content: '' })
  const backlinks = w.getBacklinks('target')
  if (!backlinks.includes('source')) throw new Error('Missing backlink')
})

testRunner.registerTest('resolveLink converts title to id', () => {
  const w = createWiki()
  const id = w.resolveLink('My Page Title')
  if (id !== 'my-page-title') throw new Error(`Wrong id: ${id}`)
})

// Dead Links
testRunner.registerTest('getDeadLinks finds broken links', async () => {
  const w = createWiki()
  await w.createPage({ title: 'Orphan Linker', content: '[[Nonexistent Page]]' })
  const dead = w.getDeadLinks()
  if (dead.length !== 1) throw new Error('Expected 1 dead link')
  if (dead[0].target !== 'Nonexistent Page') throw new Error('Wrong dead link target')
})

testRunner.registerTest('getDeadLinksForPage returns page-specific dead links', async () => {
  const w = createWiki()
  await w.createPage({ title: 'Broken', content: '[[Missing]]' })
  const dead = w.getDeadLinksForPage('broken')
  if (dead.length !== 1) throw new Error('Expected 1 dead link')
})

// Orphans
testRunner.registerTest('getOrphans finds unlinked pages', async () => {
  const w = createWiki()
  await w.createPage({ title: 'Connected', content: '' })
  await w.createPage({ title: 'Linker', content: '[[Connected]]' })
  await w.createPage({ title: 'Lonely', content: '' })
  const orphans = w.getOrphans()
  const orphanTitles = orphans.map(p => p.title)
  if (!orphanTitles.includes('Lonely')) throw new Error('Missing orphan')
  if (!orphanTitles.includes('Linker')) throw new Error('Linker should be orphan too')
})

// Graph
testRunner.registerTest('getGraph returns adjacency list', async () => {
  const w = createWiki()
  await w.createPage({ title: 'A', content: '[[B]]' })
  await w.createPage({ title: 'B', content: '[[A]]' })
  const graph = w.getGraph()
  if (!graph['a'] || !graph['a'].includes('b')) throw new Error('Missing edge A->B')
  if (!graph['b'] || !graph['b'].includes('a')) throw new Error('Missing edge B->A')
})

testRunner.registerTest('getConnectedPages with depth 1', async () => {
  const w = createWiki()
  await w.createPage({ title: 'Center', content: '[[Near]]' })
  await w.createPage({ title: 'Near', content: '[[Far]]' })
  await w.createPage({ title: 'Far', content: '' })
  const connected = w.getConnectedPages('center', 1)
  const titles = connected.map(p => p.title)
  if (!titles.includes('Center')) throw new Error('Missing Center')
  if (!titles.includes('Near')) throw new Error('Missing Near')
  if (titles.includes('Far')) throw new Error('Far should not be at depth 1')
})

testRunner.registerTest('getConnectedPages with depth 2', async () => {
  const w = createWiki()
  await w.createPage({ title: 'Center', content: '[[Near]]' })
  await w.createPage({ title: 'Near', content: '[[Far]]' })
  await w.createPage({ title: 'Far', content: '' })
  const connected = w.getConnectedPages('center', 2)
  const titles = connected.map(p => p.title)
  if (!titles.includes('Far')) throw new Error('Far should be at depth 2')
})

// Search
testRunner.registerTest('search finds by title', async () => {
  const w = createWiki()
  await w.createPage({ title: 'Searchable Page' })
  await w.createPage({ title: 'Other' })
  const results = w.search('searchable')
  if (results.length !== 1) throw new Error('Expected 1 result')
})

testRunner.registerTest('search finds by content', async () => {
  const w = createWiki()
  await w.createPage({ title: 'Doc', content: 'unique keyword here' })
  const results = w.search('keyword')
  if (results.length !== 1) throw new Error('Expected 1 result')
})

testRunner.registerTest('search respects limit option', async () => {
  const w = createWiki()
  await w.createPage({ title: 'Match A' })
  await w.createPage({ title: 'Match B' })
  await w.createPage({ title: 'Match C' })
  const results = w.search('match', { limit: 2 })
  if (results.length !== 2) throw new Error('Expected 2 results')
})

// Tags & Types
testRunner.registerTest('getTags returns all unique tags', async () => {
  const w = createWiki()
  await w.createPage({ title: 'A', tags: ['foo', 'bar'] })
  await w.createPage({ title: 'B', tags: ['bar', 'baz'] })
  const tags = w.getTags()
  if (!tags.includes('foo') || !tags.includes('bar') || !tags.includes('baz')) {
    throw new Error('Missing tags')
  }
})

testRunner.registerTest('getPagesByTag returns matching pages', async () => {
  const w = createWiki()
  await w.createPage({ title: 'Tagged', tags: ['special'] })
  await w.createPage({ title: 'Untagged' })
  const pages = w.getPagesByTag('special')
  if (pages.length !== 1 || pages[0].title !== 'Tagged') {
    throw new Error('Wrong pages returned')
  }
})

testRunner.registerTest('getTypes returns all unique types', async () => {
  const w = createWiki()
  await w.createPage({ title: 'A', type: 'article' })
  await w.createPage({ title: 'B', type: 'note' })
  const types = w.getTypes()
  if (!types.includes('article') || !types.includes('note')) {
    throw new Error('Missing types')
  }
})

testRunner.registerTest('getPagesByType returns matching pages', async () => {
  const w = createWiki()
  await w.createPage({ title: 'Article', type: 'article' })
  await w.createPage({ title: 'Note', type: 'note' })
  const pages = w.getPagesByType('article')
  if (pages.length !== 1 || pages[0].title !== 'Article') {
    throw new Error('Wrong pages returned')
  }
})

// listPages
testRunner.registerTest('listPages returns all pages', async () => {
  const w = createWiki()
  await w.createPage({ title: 'One' })
  await w.createPage({ title: 'Two' })
  const pages = w.listPages()
  if (pages.length !== 2) throw new Error('Expected 2 pages')
})

testRunner.registerTest('listPages filters by type', async () => {
  const w = createWiki()
  await w.createPage({ title: 'Article', type: 'article' })
  await w.createPage({ title: 'Note', type: 'note' })
  const pages = w.listPages({ type: 'article' })
  if (pages.length !== 1) throw new Error('Expected 1 page')
})

testRunner.registerTest('listPages supports pagination', async () => {
  const w = createWiki()
  for (let i = 0; i < 5; i++) {
    await w.createPage({ title: `Page ${i}` })
  }
  const page1 = w.listPages({ limit: 2, offset: 0 })
  const page2 = w.listPages({ limit: 2, offset: 2 })
  if (page1.length !== 2 || page2.length !== 2) throw new Error('Wrong pagination')
})

// Import/Export
testRunner.registerTest('export returns all pages', async () => {
  const w = createWiki()
  await w.createPage({ title: 'Exportable' })
  const data = w.export()
  if (data.length !== 1) throw new Error('Expected 1 page')
})

testRunner.registerTest('import loads pages', async () => {
  const w = createWiki()
  await w.import([
    { id: 'test', title: 'Imported', content: '', created: new Date(), modified: new Date() }
  ])
  const page = w.getPage('test')
  if (!page || page.title !== 'Imported') throw new Error('Import failed')
})

testRunner.registerTest('import mode skip preserves existing', async () => {
  const w = createWiki()
  await w.createPage({ id: 'existing', title: 'Original' })
  await w.import([
    { id: 'existing', title: 'New', content: '', created: new Date(), modified: new Date() }
  ], { mode: 'skip' })
  const page = w.getPage('existing')
  if (page.title !== 'Original') throw new Error('Skip mode failed')
})

// Events
testRunner.registerTest('onChange fires on create', async () => {
  const w = createWiki()
  let fired = false
  w.onChange((e) => { if (e.type === 'create') fired = true })
  await w.createPage({ title: 'Event Test' })
  if (!fired) throw new Error('Event not fired')
})

testRunner.registerTest('onChange fires on update', async () => {
  const w = createWiki()
  let fired = false
  await w.createPage({ title: 'Update Test' })
  w.onChange((e) => { if (e.type === 'update') fired = true })
  await w.updatePage('update-test', { content: 'Changed' })
  if (!fired) throw new Error('Event not fired')
})

testRunner.registerTest('onChange fires on delete', async () => {
  const w = createWiki()
  let fired = false
  await w.createPage({ title: 'Delete Test' })
  w.onChange((e) => { if (e.type === 'delete') fired = true })
  await w.deletePage('delete-test')
  if (!fired) throw new Error('Event not fired')
})

testRunner.registerTest('unsubscribe stops events', async () => {
  const w = createWiki()
  let count = 0
  const unsub = w.onChange(() => count++)
  await w.createPage({ title: 'First' })
  unsub()
  await w.createPage({ title: 'Second' })
  if (count !== 1) throw new Error('Unsubscribe failed')
})

// ============================================
// EXHIBIT WALKTHROUGH REGISTRATION
// ============================================

testRunner.registerExhibit(
  'Living Wiki',
  document.getElementById('exhibit-living-wiki'),
  async () => {
    // Demonstrate Living Wiki exhibit
    const newPageBtn = document.getElementById('wiki-new-btn')
    if (newPageBtn) {
      newPageBtn.click()
      await testRunner.delay(300)
    }

    // Fill in editor if visible
    const titleInput = document.getElementById('wiki-editor-title')
    const contentInput = document.getElementById('wiki-editor-content')
    const saveBtn = document.getElementById('wiki-save-btn')

    if (titleInput && contentInput && saveBtn) {
      titleInput.value = 'Demo Page'
      titleInput.dispatchEvent(new Event('input'))
      await testRunner.delay(200)

      contentInput.value = 'This is a demonstration of the wiki functionality with [[Kingdom of Valdoria]].'
      contentInput.dispatchEvent(new Event('input'))
      await testRunner.delay(200)

      saveBtn.click()
      await testRunner.delay(500)
    }
  }
)

testRunner.registerExhibit(
  'Graph Explorer',
  document.getElementById('exhibit-graph-explorer'),
  async () => {
    // Demonstrate Graph Explorer
    const depthSlider = document.getElementById('depth-slider')
    if (depthSlider) {
      depthSlider.value = '2'
      depthSlider.dispatchEvent(new Event('input'))
      await testRunner.delay(400)
    }

    const shakeBtn = document.getElementById('graph-shake-btn')
    if (shakeBtn) {
      shakeBtn.click()
      await testRunner.delay(600)
    }
  }
)

testRunner.registerExhibit(
  'Tag & Type Workshop',
  document.getElementById('exhibit-workshop'),
  async () => {
    // Demonstrate workshop
    const searchInput = document.getElementById('workshop-search-input')
    if (searchInput) {
      searchInput.value = 'King'
      searchInput.dispatchEvent(new Event('input'))
      await testRunner.delay(400)

      searchInput.value = ''
      searchInput.dispatchEvent(new Event('input'))
      await testRunner.delay(200)
    }

    // Toggle untagged filter
    const untaggedToggle = document.getElementById('workshop-untagged-toggle')
    if (untaggedToggle) {
      untaggedToggle.checked = true
      untaggedToggle.dispatchEvent(new Event('change'))
      await testRunner.delay(400)

      untaggedToggle.checked = false
      untaggedToggle.dispatchEvent(new Event('change'))
      await testRunner.delay(200)
    }
  }
)
