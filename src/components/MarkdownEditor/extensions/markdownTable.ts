import { Table } from '@tiptap/extension-table'
import type { Node as PMNode } from '@tiptap/pm/model'
import type { MarkdownSerializerState } from 'tiptap-markdown'

/**
 * GFM requires a literal `|` inside a table cell to be written as `\|`,
 * including inside code spans — the table parser splits on pipes before inline
 * content is parsed.
 *
 * tiptap-markdown's table serializer renders cell content straight into the
 * output without escaping, so a cell containing a pipe (a TypeScript union, a
 * shell pipeline, a regex alternation) silently splits into extra cells the
 * next time the document is parsed, losing the trailing cell of the row.
 *
 * This overrides the `table` node's serializer to escape pipes in whatever the
 * inline renderer produced for each cell.
 */

/** Escapes pipes that aren't already escaped. */
export function escapeCellPipes(text: string): string {
  let result = ''

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]

    if (char === '\\' && i + 1 < text.length) {
      result += char + text[i + 1]
      i += 1
      continue
    }

    result += char === '|' ? '\\|' : char
  }

  return result
}

interface TableSerializerState extends MarkdownSerializerState {
  out: string
  inTable?: boolean
}

export const MarkdownTable = Table.extend({
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        serialize(state: TableSerializerState, node: PMNode) {
          state.inTable = true

          node.forEach((row, _rowOffset, rowIndex) => {
            state.write('| ')

            row.forEach((cell, _cellOffset, cellIndex) => {
              if (cellIndex) state.write(' | ')

              const content = cell.firstChild
              if (!content?.textContent.trim()) return

              // renderInline writes straight into `state.out`; capture just
              // this cell's slice and escape it in place.
              const start = state.out.length
              state.renderInline(content)
              const rendered = state.out.slice(start)
              state.out = state.out.slice(0, start) + escapeCellPipes(rendered)
            })

            state.write(' |')
            state.ensureNewLine()

            if (rowIndex === 0) {
              const delimiter = Array.from({ length: row.childCount })
                .map(() => '---')
                .join(' | ')
              state.write(`| ${delimiter} |`)
              state.ensureNewLine()
            }
          })

          state.closeBlock(node)
          state.inTable = false
        },
        parse: {
          // handled by markdown-it
        },
      },
    }
  },
})

export default MarkdownTable
