import { BlockMath, InlineMath } from '@tiptap/extension-mathematics'
import type MarkdownIt from 'markdown-it'
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs'
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import type { MarkdownSerializerState } from 'tiptap-markdown'

const DOLLAR = 0x24
const BACKSLASH = 0x5c

/**
 * `$…$` — rejected when the delimiters hug whitespace so that prose like
 * "it cost $5 and $10" is not swallowed as math.
 */
function mathInline(state: StateInline, silent: boolean): boolean {
  const start = state.pos

  if (state.src.charCodeAt(start) !== DOLLAR) return false
  if (start > 0 && state.src.charCodeAt(start - 1) === BACKSLASH) return false
  if (state.src.charCodeAt(start + 1) === DOLLAR) return false

  let pos = start + 1
  let closing = -1

  while (pos < state.posMax) {
    const code = state.src.charCodeAt(pos)
    if (code === BACKSLASH) {
      pos += 2
      continue
    }
    if (code === DOLLAR) {
      closing = pos
      break
    }
    pos += 1
  }

  if (closing < 0) return false

  const content = state.src.slice(start + 1, closing)
  if (!content.trim()) return false
  if (/^\s|\s$/.test(content)) return false

  if (!silent) {
    const token = state.push('math_inline', 'span', 0)
    token.content = content
    token.markup = '$'
  }

  state.pos = closing + 1
  return true
}

/** `$$` fenced display math, either on one line or spanning several. */
function mathBlock(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  const start = state.bMarks[startLine] + state.tShift[startLine]
  const max = state.eMarks[startLine]

  if (start + 2 > max) return false
  if (state.src.slice(start, start + 2) !== '$$') return false
  if (silent) return true

  const lines: string[] = []
  let found = false

  const firstLine = state.src.slice(start + 2, max).trim()
  if (firstLine.endsWith('$$')) {
    const inner = firstLine.slice(0, -2).trim()
    if (inner) lines.push(inner)
    found = true
  } else if (firstLine) {
    lines.push(firstLine)
  }

  let nextLine = startLine

  while (!found) {
    nextLine += 1
    if (nextLine >= endLine) break

    const lineStart = state.bMarks[nextLine] + state.tShift[nextLine]
    const lineMax = state.eMarks[nextLine]
    const line = state.src.slice(lineStart, lineMax)

    if (line.trim().endsWith('$$')) {
      const inner = line.trim().slice(0, -2).trim()
      if (inner) lines.push(inner)
      found = true
      break
    }

    lines.push(line)
  }

  // An unterminated block still consumes its lines rather than re-parsing them.
  state.line = Math.min(nextLine + 1, endLine)

  const token = state.push('math_block', 'div', 0)
  token.block = true
  token.content = lines.join('\n')
  token.markup = '$$'
  token.map = [startLine, state.line]

  return true
}

const INSTALLED = new WeakSet<MarkdownIt>()

/**
 * Emits the DOM shape that @tiptap/extension-mathematics parses back in.
 *
 * Guarded because tiptap-markdown runs every extension's `parse.setup` against
 * the same markdown-it instance on each parse, and `ruler.after` would happily
 * splice in a second copy of these rules.
 */
export function markdownItMath(md: MarkdownIt): void {
  if (INSTALLED.has(md)) return
  INSTALLED.add(md)

  md.inline.ruler.after('escape', 'math_inline', mathInline)
  md.block.ruler.after('blockquote', 'math_block', mathBlock, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  })

  md.renderer.rules.math_inline = (tokens, idx) =>
    `<span data-type="inline-math" data-latex="${md.utils.escapeHtml(tokens[idx].content)}"></span>`

  md.renderer.rules.math_block = (tokens, idx) =>
    `<div data-type="block-math" data-latex="${md.utils.escapeHtml(tokens[idx].content)}"></div>`
}

type MathNode = { attrs: { latex?: string } }

export const InlineMathMarkdown = InlineMath.extend({
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        serialize(state: MarkdownSerializerState, node: MathNode) {
          state.text(`$${node.attrs.latex ?? ''}$`, false)
        },
        parse: { setup: markdownItMath },
      },
    }
  },
})

export const BlockMathMarkdown = BlockMath.extend({
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        serialize(state: MarkdownSerializerState, node: MathNode) {
          state.write('$$\n')
          state.text(node.attrs.latex ?? '', false)
          state.ensureNewLine()
          state.write('$$')
          state.closeBlock(node)
        },
        parse: { setup: markdownItMath },
      },
    }
  },
})
