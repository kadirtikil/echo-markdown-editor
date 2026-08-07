import type { Editor, Range } from '@tiptap/core'
import {
  AlignCenter,
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Sigma,
  Table as TableIcon,
  Type,
  Workflow,
} from 'lucide-vue-next'
import type { Component } from 'vue'

export interface SlashCommandItem {
  title: string
  description: string
  icon: Component
  group: string
  keywords: string[]
  command: (props: { editor: Editor; range: Range }) => void
}

/** Drops the "/query" text before running the real command. */
function replacing(run: (editor: Editor) => void) {
  return ({ editor, range }: { editor: Editor; range: Range }) => {
    editor.chain().focus().deleteRange(range).run()
    run(editor)
  }
}

export const slashCommands: SlashCommandItem[] = [
  {
    title: 'Text',
    description: 'Plain paragraph',
    icon: Type,
    group: 'Basic',
    keywords: ['paragraph', 'p', 'plain'],
    command: replacing((editor) => editor.chain().focus().setParagraph().run()),
  },
  {
    title: 'Heading 1',
    description: 'Top-level section',
    icon: Heading1,
    group: 'Basic',
    keywords: ['h1', 'title', 'large'],
    command: replacing((editor) => editor.chain().focus().setHeading({ level: 1 }).run()),
  },
  {
    title: 'Heading 2',
    description: 'Section heading',
    icon: Heading2,
    group: 'Basic',
    keywords: ['h2', 'subtitle'],
    command: replacing((editor) => editor.chain().focus().setHeading({ level: 2 }).run()),
  },
  {
    title: 'Heading 3',
    description: 'Sub-section heading',
    icon: Heading3,
    group: 'Basic',
    keywords: ['h3'],
    command: replacing((editor) => editor.chain().focus().setHeading({ level: 3 }).run()),
  },
  {
    title: 'Bullet list',
    description: 'Unordered list',
    icon: List,
    group: 'Lists',
    keywords: ['ul', 'unordered', 'bullet'],
    command: replacing((editor) => editor.chain().focus().toggleBulletList().run()),
  },
  {
    title: 'Numbered list',
    description: 'Ordered list',
    icon: ListOrdered,
    group: 'Lists',
    keywords: ['ol', 'ordered', 'number'],
    command: replacing((editor) => editor.chain().focus().toggleOrderedList().run()),
  },
  {
    title: 'Task list',
    description: 'Checkbox list',
    icon: CheckSquare,
    group: 'Lists',
    keywords: ['todo', 'checkbox', 'check'],
    command: replacing((editor) => editor.chain().focus().toggleTaskList().run()),
  },
  {
    title: 'Quote',
    description: 'Blockquote',
    icon: Quote,
    group: 'Blocks',
    keywords: ['blockquote', 'citation'],
    command: replacing((editor) => editor.chain().focus().toggleBlockquote().run()),
  },
  {
    title: 'Code block',
    description: 'Syntax-highlighted code',
    icon: Code,
    group: 'Blocks',
    keywords: ['pre', 'snippet', 'fence'],
    command: replacing((editor) => editor.chain().focus().toggleCodeBlock().run()),
  },
  {
    title: 'Table',
    description: '3×3 table with header row',
    icon: TableIcon,
    group: 'Blocks',
    keywords: ['grid', 'rows', 'columns'],
    command: replacing((editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    ),
  },
  {
    title: 'Divider',
    description: 'Horizontal rule',
    icon: Minus,
    group: 'Blocks',
    keywords: ['hr', 'separator', 'line'],
    command: replacing((editor) => editor.chain().focus().setHorizontalRule().run()),
  },
  {
    title: 'Image',
    description: 'Embed by URL',
    icon: ImageIcon,
    group: 'Blocks',
    keywords: ['picture', 'photo', 'img'],
    command: replacing((editor) => {
      const src = window.prompt('Image URL')
      if (src) editor.chain().focus().setImage({ src }).run()
    }),
  },
  {
    title: 'Math block',
    description: 'Display LaTeX with KaTeX',
    icon: Sigma,
    group: 'Advanced',
    keywords: ['latex', 'katex', 'formula', 'equation'],
    command: replacing((editor) =>
      editor.chain().focus().insertBlockMath({ latex: 'e^{i\\pi} + 1 = 0' }).run(),
    ),
  },
  {
    title: 'Mermaid diagram',
    description: 'Flowcharts, sequence, gantt…',
    icon: Workflow,
    group: 'Advanced',
    keywords: ['diagram', 'chart', 'flow', 'graph'],
    command: replacing((editor) => editor.chain().focus().insertMermaid().run()),
  },
  {
    title: 'Center text',
    description: 'Align current block',
    icon: AlignCenter,
    group: 'Advanced',
    keywords: ['align', 'middle'],
    command: replacing((editor) => editor.chain().focus().setTextAlign('center').run()),
  },
]
