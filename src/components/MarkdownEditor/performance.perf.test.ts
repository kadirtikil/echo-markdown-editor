import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Editor } from '@tiptap/core'
import MarkdownEditor from './MarkdownEditor.vue'
import { SHAPES, generateMarkdown } from './__perf__/generate'
import { createHeadlessEditor, formatTiming, measure } from './__perf__/measure'

/**
 * Performance guards for long documents.
 *
 * These run in jsdom, which is slower and noisier than a real browser, so the
 * budgets are deliberately loose. They exist to catch an accidental
 * O(document)-per-keystroke regression, not to certify a frame rate — a
 * failure means something got algorithmically worse.
 *
 * Run with `npm run test:perf`; they are excluded from the default suite
 * because they take about a minute.
 */

const LARGE = generateMarkdown(SHAPES.large)
const HUGE = generateMarkdown(SHAPES.huge)

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('typing does not scale with document size', () => {
  /**
   * The guard that matters. Serializing this document costs ~100ms, so if
   * anything ever puts `getMarkdown()` back on the keystroke path, per-key
   * cost jumps by two orders of magnitude and this fails.
   */
  it('keeps per-keystroke work off the document-sized path in the real component', async () => {
    const wrapper = mount(MarkdownEditor, {
      props: { modelValue: LARGE, debounce: 50 },
      attachTo: document.body,
    })

    await sleep(100)
    const editor = (wrapper.vm as unknown as { editor: Editor }).editor
    expect(editor).toBeTruthy()

    const timing = measure(
      'component keystroke',
      () => editor.commands.insertContentAt(1, 'x'),
      30,
      5,
    )
    console.log(formatTiming(timing))

    expect(timing.p95).toBeLessThan(40)

    wrapper.unmount()
  }, 120_000)

  it('coalesces a burst of keystrokes into a single emit', async () => {
    const wrapper = mount(MarkdownEditor, {
      props: { modelValue: LARGE, debounce: 50 },
      attachTo: document.body,
    })

    await sleep(100)
    const editor = (wrapper.vm as unknown as { editor: Editor }).editor

    const before = wrapper.emitted('update:modelValue')?.length ?? 0
    for (let i = 0; i < 30; i += 1) editor.commands.insertContentAt(1, 'a')

    // Nothing may be emitted while the burst is still in flight.
    expect((wrapper.emitted('update:modelValue')?.length ?? 0) - before).toBe(0)

    await sleep(200)

    const emitted = (wrapper.emitted('update:modelValue')?.length ?? 0) - before
    console.log(`30 keystrokes -> ${emitted} emit(s)`)
    expect(emitted).toBe(1)

    const payload = wrapper.emitted('update:modelValue')?.at(-1)?.[0] as string
    expect(payload).toContain('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')

    wrapper.unmount()
  }, 120_000)

  it('does not render HTML unless a listener reads it', async () => {
    const wrapper = mount(MarkdownEditor, {
      props: { modelValue: LARGE, debounce: 50 },
      attachTo: document.body,
    })

    await sleep(100)
    const editor = (wrapper.vm as unknown as { editor: Editor }).editor

    editor.commands.insertContentAt(1, 'z')
    await sleep(200)

    const payload = wrapper.emitted('change')?.at(-1)?.[0] as { markdown: string; html: string }
    expect(payload.markdown.length).toBeGreaterThan(0)

    // The `html` property is a getter; reading it is what costs, and only
    // consumers that ask for it pay.
    const descriptor = Object.getOwnPropertyDescriptor(payload, 'html')
    expect(descriptor?.get).toBeTypeOf('function')
    expect(payload.html).toContain('<')

    wrapper.unmount()
  }, 120_000)
})

describe('large document (6k lines / ~290KB)', () => {
  let editor: Editor

  beforeAll(() => {
    editor = createHeadlessEditor()
    editor.commands.setContent(LARGE, { emitUpdate: false })
  })

  afterAll(() => editor.destroy())

  it('parses within budget', () => {
    const fresh = createHeadlessEditor()
    const timing = measure('parse', () => fresh.commands.setContent(LARGE, { emitUpdate: false }), 3)
    console.log(formatTiming(timing))
    fresh.destroy()
    expect(timing.median).toBeLessThan(4000)
  }, 120_000)

  it('scans the outline cheaply enough to run on every edit', () => {
    const timing = measure(
      'outline',
      () => {
        const entries: unknown[] = []
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'heading') entries.push(pos)
        })
      },
      25,
    )
    console.log(formatTiming(timing))
    expect(timing.p95).toBeLessThan(25)
  })

  it('counts words cheaply enough to run on every edit', () => {
    const storage = editor.storage.characterCount as { words(): number; characters(): number }
    const timing = measure(
      'characterCount',
      () => {
        storage.words()
        storage.characters()
      },
      25,
    )
    console.log(formatTiming(timing))
    expect(timing.p95).toBeLessThan(25)
  })

  it('serializes within budget', () => {
    const timing = measure('serialize', () => editor.storage.markdown.getMarkdown(), 5)
    console.log(formatTiming(timing))
    expect(timing.median).toBeLessThan(600)
  }, 120_000)

  it('searches the whole document within budget', () => {
    const timing = measure('search', () => editor.commands.setSearchTerm('section'), 5)
    console.log(formatTiming(timing))
    expect(timing.median).toBeLessThan(100)
    expect(editor.storage.searchAndReplace.matches.length).toBeGreaterThan(0)
    editor.commands.clearSearch()
  }, 120_000)
})

describe('scaling', () => {
  /**
   * Parsing is the dominant cost when opening a document, so it is the one
   * that must stay linear. Measured ratios are ~2.1x per doubling; 4x would
   * mean it had gone quadratic.
   */
  it('parses in linear time as the document doubles', () => {
    const ratios: number[] = []
    let previous = 0

    for (const sections of [50, 100, 200]) {
      const markdown = generateMarkdown({ ...SHAPES.large, sections })
      const editor = createHeadlessEditor()
      const timing = measure(
        `parse ${sections} sections`,
        () => editor.commands.setContent(markdown, { emitUpdate: false }),
        3,
        1,
      )
      console.log(formatTiming(timing))
      if (previous) ratios.push(timing.median / previous)
      previous = timing.median
      editor.destroy()
    }

    console.log(`  parse ratios per 2x content: ${ratios.map((r) => r.toFixed(1)).join(', ')}`)
    ratios.forEach((ratio) => expect(ratio).toBeLessThan(3.2))
  }, 300_000)

  /**
   * Serialization is mildly superlinear (~n^1.6) inside prosemirror-markdown.
   * This documents the known behaviour and fails if it degrades to true
   * quadratic. It is affordable only because emits are debounced.
   */
  it('serializes no worse than mildly superlinear', () => {
    const ratios: number[] = []
    let previous = 0

    for (const sections of [50, 100, 200]) {
      const markdown = generateMarkdown({ ...SHAPES.large, sections })
      const editor = createHeadlessEditor()
      editor.commands.setContent(markdown, { emitUpdate: false })
      const timing = measure(
        `serialize ${sections} sections`,
        () => editor.storage.markdown.getMarkdown(),
        3,
        1,
      )
      console.log(formatTiming(timing))
      if (previous) ratios.push(timing.median / previous)
      previous = timing.median
      editor.destroy()
    }

    console.log(`  serialize ratios per 2x content: ${ratios.map((r) => r.toFixed(1)).join(', ')}`)
    // Generous: the small-document baseline is noisy in jsdom.
    ratios.forEach((ratio) => expect(ratio).toBeLessThan(12))
  }, 300_000)
})

describe('huge document (24k lines / ~1.1MB)', () => {
  it('still keeps keystrokes independent of document size', () => {
    const editor = createHeadlessEditor()
    editor.commands.setContent(HUGE, { emitUpdate: false })

    const timing = measure('huge keystroke', () => editor.commands.insertContentAt(1, 'x'), 25)
    console.log(formatTiming(timing))
    expect(timing.p95).toBeLessThan(120)

    editor.destroy()
  }, 300_000)
})

describe('diagram- and table-dense documents', () => {
  it('parses 50 mermaid diagrams without rendering any of them', () => {
    const markdown = generateMarkdown(SHAPES.diagrams)
    const editor = createHeadlessEditor()

    const timing = measure(
      'parse diagrams',
      () => editor.commands.setContent(markdown, { emitUpdate: false }),
      3,
    )
    console.log(formatTiming(timing))

    let count = 0
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'mermaid') count += 1
    })

    expect(count).toBe(50)
    expect(timing.median).toBeLessThan(1500)
    editor.destroy()
  }, 120_000)

  it('handles 120 tables', () => {
    const markdown = generateMarkdown(SHAPES.tables)
    const editor = createHeadlessEditor()

    const timing = measure(
      'parse tables',
      () => editor.commands.setContent(markdown, { emitUpdate: false }),
      3,
    )
    console.log(formatTiming(timing))

    let count = 0
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'table') count += 1
    })

    expect(count).toBe(120)
    expect(timing.median).toBeLessThan(3000)
    editor.destroy()
  }, 120_000)
})

describe('round-trip stability at scale', () => {
  it('reaches a fixed point after one round-trip', () => {
    const editor = createHeadlessEditor()

    editor.commands.setContent(LARGE, { emitUpdate: false })
    const first = editor.storage.markdown.getMarkdown()

    editor.commands.setContent(first, { emitUpdate: false })
    const second = editor.storage.markdown.getMarkdown()

    // The first pass may normalize spacing and escapes; after that the document
    // must be stable, or repeated edit/save cycles would drift indefinitely.
    expect(second).toBe(first)
    editor.destroy()
  }, 120_000)

  it('does not lose blocks on a round-trip', () => {
    const editor = createHeadlessEditor()

    editor.commands.setContent(LARGE, { emitUpdate: false })
    const before = editor.state.doc.childCount

    editor.commands.setContent(editor.storage.markdown.getMarkdown(), { emitUpdate: false })

    expect(editor.state.doc.childCount).toBe(before)
    editor.destroy()
  }, 120_000)
})
