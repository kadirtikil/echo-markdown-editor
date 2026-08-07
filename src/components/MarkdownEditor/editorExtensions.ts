import type { AnyExtension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Typography from '@tiptap/extension-typography'
import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { Markdown } from 'tiptap-markdown'
import { createLowlight, common } from 'lowlight'

import { Mermaid } from './extensions/Mermaid'
import { BlockMathMarkdown, InlineMathMarkdown } from './extensions/math'
import { SearchAndReplace } from './extensions/SearchAndReplace'
import { ImageHandler, type ImageUploader } from './extensions/ImageHandler'
import { SlashCommand } from './extensions/SlashCommand'
import { TightTaskList } from './extensions/tightTaskList'
import { MarkdownTable } from './extensions/markdownTable'
import { MarkdownEmoji } from './extensions/markdownEmoji'
import { gitHubEmojis } from '@tiptap/extension-emoji'
import './types'

export interface EditorExtensionOptions {
  placeholder?: string
  upload?: ImageUploader
  maxImageSize?: number
  onError?: (error: Error) => void
  /**
   * Menus need a live DOM and a mounted editor; the performance and
   * round-trip suites run headless, so they opt out.
   */
  interactive?: boolean
}

/**
 * The component's extension stack, in one place so tests exercise exactly what
 * ships rather than a copy that can drift.
 */
export function createEditorExtensions(options: EditorExtensionOptions = {}): AnyExtension[] {
  const {
    placeholder = 'Write something, or press "/" for blocks…',
    upload,
    maxImageSize = 10 * 1024 * 1024,
    onError = (error) => console.error('[MarkdownEditor]', error),
    interactive = true,
  } = options

  const lowlight = createLowlight(common)

  const extensions: AnyExtension[] = [
    StarterKit.configure({
      codeBlock: false,
      link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } },
    }),
    CodeBlockLowlight.configure({ lowlight, defaultLanguage: null }),
    TaskList,
    TaskItem.configure({ nested: true }),
    // Individual table extensions rather than TableKit, so the `table` node can
    // be replaced with one that escapes pipes when serializing.
    MarkdownTable.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Image.configure({ inline: false, allowBase64: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Highlight.configure({ multicolor: true }),
    Subscript,
    Superscript,
    Typography,
    CharacterCount,
    Placeholder.configure({ placeholder }),
    MarkdownEmoji.configure({ emojis: gitHubEmojis, enableEmoticons: true }),
    // Registered directly rather than via the `Mathematics` umbrella, which
    // would add its own copies of these two nodes.
    InlineMathMarkdown,
    BlockMathMarkdown,
    Mermaid,
    TightTaskList,
    SearchAndReplace,
    ImageHandler.configure({
      ...(upload ? { upload } : {}),
      maxFileSize: maxImageSize,
      onError,
    }),
    Markdown.configure({
      html: true,
      linkify: true,
      breaks: false,
      transformPastedText: true,
      transformCopiedText: true,
    }),
  ]

  if (interactive) extensions.push(SlashCommand)

  return extensions
}
