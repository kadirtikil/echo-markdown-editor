declare module 'tiptap-markdown' {
  import type { Extension } from '@tiptap/core'
  import type MarkdownIt from 'markdown-it'

  export interface MarkdownOptions {
    html?: boolean
    tightLists?: boolean
    tightListClass?: string
    bulletListMarker?: string
    linkify?: boolean
    breaks?: boolean
    transformPastedText?: boolean
    transformCopiedText?: boolean
  }

  export const Markdown: Extension<MarkdownOptions>
  export default Markdown

  /** Shape of `editor.storage.markdown` once the extension is registered. */
  export interface MarkdownStorage {
    getMarkdown(): string
  }

  /**
   * Minimal surface of prosemirror-markdown's serializer state that node
   * `addStorage().markdown.serialize` implementations receive.
   */
  export interface MarkdownSerializerState {
    write(content?: string): void
    ensureNewLine(): void
    closeBlock(node: unknown): void
    text(text: string, escape?: boolean): void
    renderContent(node: unknown): void
    renderInline(node: unknown): void
    wrapBlock(delim: string, firstDelim: string | null, node: unknown, fn: () => void): void
  }

  export type MarkdownItSetup = (md: MarkdownIt) => void
}
