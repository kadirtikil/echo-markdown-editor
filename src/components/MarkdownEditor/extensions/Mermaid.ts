import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type MarkdownIt from 'markdown-it'
import type { MarkdownSerializerState } from 'tiptap-markdown'
import MermaidView from './MermaidView.vue'

export interface MermaidOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      /** Insert a mermaid diagram block, optionally seeded with source. */
      insertMermaid: (options?: { code?: string }) => ReturnType
    }
  }
}

const DEFAULT_DIAGRAM = `graph TD
  A[Start] --> B{Works?}
  B -->|Yes| C[Ship it]
  B -->|No| D[Fix it]
  D --> B`

/**
 * A mermaid diagram as an atomic block node. The source lives in the `code`
 * attribute rather than as node content so ProseMirror never tries to apply
 * marks or input rules to diagram syntax.
 *
 * Round-trips to a ```mermaid fenced block, which is what GitHub and most
 * other renderers already understand.
 */
export const Mermaid = Node.create<MermaidOptions>({
  name: 'mermaid',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return { HTMLAttributes: {} }
  },

  addAttributes() {
    return {
      code: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-code') ?? '',
        renderHTML: (attributes) => ({ 'data-code': attributes.code }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mermaid"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ 'data-type': 'mermaid' }, this.options.HTMLAttributes, HTMLAttributes),
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(MermaidView)
  },

  addCommands() {
    return {
      insertMermaid:
        (options = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { code: options.code ?? DEFAULT_DIAGRAM },
          }),
    }
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerState, node: { attrs: { code: string } }) {
          state.write('```mermaid\n')
          state.text(node.attrs.code ?? '', false)
          state.ensureNewLine()
          state.write('```')
          state.closeBlock(node)
        },
        parse: {
          setup(markdownit: MarkdownIt) {
            const defaultFence = markdownit.renderer.rules.fence

            markdownit.renderer.rules.fence = (tokens, idx, options, env, self) => {
              const token = tokens[idx]
              const language = (token.info || '').trim().split(/\s+/)[0].toLowerCase()

              if (language === 'mermaid') {
                const code = markdownit.utils.escapeHtml(token.content.replace(/\n$/, ''))
                return `<div data-type="mermaid" data-code="${code}"></div>`
              }

              return defaultFence
                ? defaultFence(tokens, idx, options, env, self)
                : self.renderToken(tokens, idx, options)
            }
          },
        },
      },
    }
  },
})

export default Mermaid
