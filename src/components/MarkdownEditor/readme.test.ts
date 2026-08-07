import { describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import { createEditorExtensions } from './editorExtensions'

/**
 * The demo app loads this README into the editor as its starting document, so
 * the file doubles as a fixture: whatever it contains has to survive the
 * round-trip, or the deployed demo shows mangled docs. Imported the same way
 * the app imports it.
 */
import README from './README.md?raw'

function roundTrip(markdown: string): string {
  const editor = new Editor({ extensions: createEditorExtensions({ interactive: false }) })
  editor.commands.setContent(markdown, { emitUpdate: false })
  const result = editor.storage.markdown.getMarkdown()
  editor.destroy()
  return result
}

describe('README renders as the demo document', () => {
  it('is stable after the first normalizing pass', () => {
    const first = roundTrip(README)
    const second = roundTrip(first)
    expect(second).toBe(first)
  })

  it('keeps dollar signs inside code spans out of the math parser', () => {
    const result = roundTrip(README)
    expect(result).toContain('$E = mc^2$')
    expect(result).not.toContain('inline-math')
  })

  it('preserves every heading', () => {
    const headings = README.split('\n').filter((line) => /^#{1,6}\s/.test(line))
    const editor = new Editor({ extensions: createEditorExtensions({ interactive: false }) })
    editor.commands.setContent(README, { emitUpdate: false })

    let count = 0
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'heading') count += 1
    })

    editor.destroy()
    expect(count).toBe(headings.length)
  })

  it('preserves the fenced code blocks', () => {
    const fences = (README.match(/^```/gm) ?? []).length / 2
    const editor = new Editor({ extensions: createEditorExtensions({ interactive: false }) })
    editor.commands.setContent(README, { emitUpdate: false })

    let count = 0
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'codeBlock' || node.type.name === 'mermaid') count += 1
    })

    editor.destroy()
    expect(count).toBe(fences)
  })

  it('preserves the tables', () => {
    const editor = new Editor({ extensions: createEditorExtensions({ interactive: false }) })
    editor.commands.setContent(README, { emitUpdate: false })

    let count = 0
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'table') count += 1
    })

    editor.destroy()
    // Props, markdown round-trip, tests, and performance tables.
    expect(count).toBe(4)
  })
})
