import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { Editor } from '@tiptap/core'
import { createEditorExtensions } from './editorExtensions'

let editor: Editor

beforeEach(() => {
  // The shipping extension stack, so these assertions can't drift from it.
  editor = new Editor({ extensions: createEditorExtensions({ interactive: false }) })
})

afterEach(() => editor.destroy())

/** markdown -> ProseMirror doc -> markdown */
function roundTrip(markdown: string): string {
  editor.commands.setContent(markdown, { emitUpdate: false })
  return editor.storage.markdown.getMarkdown()
}

describe('markdown round-trip', () => {
  it('preserves headings, emphasis and lists', () => {
    const source = ['# Title', '', 'Some **bold** and *italic* text.', '', '- one', '- two'].join(
      '\n',
    )
    expect(roundTrip(source)).toBe(source)
  })

  it('preserves task lists', () => {
    const source = ['- [x] done', '- [ ] pending'].join('\n')
    expect(roundTrip(source)).toBe(source)
  })

  it('preserves fenced code blocks with a language', () => {
    const source = ['```ts', 'const x: number = 1', '```'].join('\n')
    expect(roundTrip(source)).toBe(source)
  })

  it('preserves tables', () => {
    const result = roundTrip(['| a | b |', '| --- | --- |', '| 1 | 2 |'].join('\n'))
    expect(result).toContain('| a')
    expect(result).toContain('| 1')
  })

  it('keeps escaped pipes inside table cells escaped', () => {
    // A cell losing its pipe escape silently drops the rest of the row on the
    // next parse, so the round-trip has to re-escape on the way out.
    const source = [
      '| Prop | Type |',
      '| --- | --- |',
      '| mode | `a \\| b` |',
      '| sep | x \\| y |',
    ].join('\n')

    const once = roundTrip(source)
    expect(once).toContain('\\|')
    expect(roundTrip(once)).toBe(once)
  })

  it('does not lose cells in a table containing pipes', () => {
    const source = [
      '| a | b | c |',
      '| --- | --- | --- |',
      '| `x \\| y` | keep | tail |',
    ].join('\n')

    // Evaluated first: `editor.commands` binds to the state at property
    // access, and roundTrip() replaces that state.
    const serialized = roundTrip(source)
    editor.commands.setContent(serialized, { emitUpdate: false })

    let cells = 0
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') cells += 1
    })

    expect(cells).toBe(6)
  })
})

describe('emoji', () => {
  it('serializes back to the character, not a CDN image tag', () => {
    const result = roundTrip('hello 🚀 world')
    expect(result).toBe('hello 🚀 world')
    expect(result).not.toContain('<img')
    expect(result).not.toContain('data-type="emoji"')
  })

  it('keeps emoji in headings out of the HTML fallback', () => {
    const result = roundTrip('## 🧪 Tests')
    expect(result).not.toContain('<span')
    expect(result).toContain('Tests')
  })

  it('leaves bare shortcodes as text', () => {
    expect(roundTrip('hello :rocket: world')).toBe('hello :rocket: world')
  })
})

describe('math', () => {
  it('round-trips inline math', () => {
    expect(roundTrip('Energy is $E = mc^2$ exactly.')).toBe('Energy is $E = mc^2$ exactly.')
  })

  it('round-trips block math', () => {
    const source = ['$$', '\\int_0^1 x\\,dx = \\frac{1}{2}', '$$'].join('\n')
    expect(roundTrip(source)).toBe(source)
  })

  it('round-trips single-line block math', () => {
    expect(roundTrip('$$x^2$$')).toBe(['$$', 'x^2', '$$'].join('\n'))
  })

  it('leaves currency alone', () => {
    const source = 'It cost $5 and then $10 more.'
    expect(roundTrip(source)).toBe(source)
    editor.commands.setContent(source, { emitUpdate: false })
    expect(editor.getHTML()).not.toContain('inline-math')
  })

  it('does not treat an unmatched dollar as math', () => {
    expect(roundTrip('Only $one dollar sign here.')).toBe('Only $one dollar sign here.')
  })
})

describe('mermaid', () => {
  it('round-trips a mermaid fence', () => {
    const source = ['```mermaid', 'graph TD', '  A --> B', '```'].join('\n')
    expect(roundTrip(source)).toBe(source)
  })

  it('parses a mermaid fence into a mermaid node, not a code block', () => {
    editor.commands.setContent(['```mermaid', 'graph TD', '  A --> B', '```'].join('\n'), {
      emitUpdate: false,
    })

    let found: string | null = null
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'mermaid') found = node.attrs.code as string
    })

    expect(found).toBe('graph TD\n  A --> B')
  })

  it('leaves non-mermaid fences as code blocks', () => {
    editor.commands.setContent(['```js', 'const a = 1', '```'].join('\n'), { emitUpdate: false })

    const names = new Set<string>()
    editor.state.doc.descendants((node) => {
      names.add(node.type.name)
    })

    expect(names.has('codeBlock')).toBe(true)
    expect(names.has('mermaid')).toBe(false)
  })

  it('serializes a programmatically inserted diagram', () => {
    editor.commands.setContent('', { emitUpdate: false })
    editor.commands.insertMermaid({ code: 'sequenceDiagram\n  A->>B: hi' })
    expect(editor.storage.markdown.getMarkdown()).toContain('```mermaid')
    expect(editor.storage.markdown.getMarkdown()).toContain('A->>B: hi')
  })
})

describe('parser reuse', () => {
  it('does not duplicate math rules across repeated parses', () => {
    roundTrip('$a$')
    roundTrip('$b$')
    const result = roundTrip('inline $c$ here')
    expect(result).toBe('inline $c$ here')
  })
})
