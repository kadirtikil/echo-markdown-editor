import type { MarkdownStorage } from 'tiptap-markdown'

/**
 * tiptap-markdown ships no types, so its storage slot is declared here. This
 * has to live in a module (not the ambient .d.ts) to augment rather than
 * shadow @tiptap/core.
 */
declare module '@tiptap/core' {
  interface Storage {
    markdown: MarkdownStorage
  }
}

export type ViewMode = 'wysiwyg' | 'split' | 'source'

export interface OutlineEntry {
  level: number
  text: string
  pos: number
  id: string
}

export interface EditorStats {
  words: number
  characters: number
  /** Rough estimate at 200 wpm. */
  readingMinutes: number
}
