<script setup lang="ts">
import { computed } from 'vue'
import type { Editor } from '@tiptap/core'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Code2,
  Columns2,
  Eye,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  Moon,
  PanelLeft,
  Quote,
  Redo2,
  Search,
  Sigma,
  Strikethrough,
  Subscript as SubIcon,
  Sun,
  Superscript as SupIcon,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
  Workflow,
} from 'lucide-vue-next'
import type { ViewMode } from './types'

const props = defineProps<{
  editor: Editor
  viewMode: ViewMode
  fullscreen: boolean
  dark: boolean
  outlineOpen: boolean
  /** Bumped by the parent on every editor transaction to re-evaluate `isActive`. */
  revision: number
}>()

const emit = defineEmits<{
  'update:viewMode': [ViewMode]
  'update:fullscreen': [boolean]
  'update:dark': [boolean]
  'update:outlineOpen': [boolean]
  find: []
}>()

const headingLevel = computed<string>(() => {
  void props.revision
  for (const level of [1, 2, 3, 4, 5, 6] as const) {
    if (props.editor.isActive('heading', { level })) return String(level)
  }
  return '0'
})

function setHeading(value: string) {
  const level = Number(value)
  if (level === 0) props.editor.chain().focus().setParagraph().run()
  else props.editor.chain().focus().setHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run()
}

function isActive(name: string, attrs?: Record<string, unknown>) {
  void props.revision
  return props.editor.isActive(name, attrs)
}

/** Attribute-only variant, for marks/attrs that aren't tied to one node type. */
function hasAttrs(attrs: Record<string, unknown>) {
  void props.revision
  return props.editor.isActive(attrs)
}

function setLink() {
  const previous = props.editor.getAttributes('link').href as string | undefined
  const href = window.prompt('Link URL', previous ?? 'https://')
  if (href === null) return
  if (href === '') {
    props.editor.chain().focus().unsetLink().run()
    return
  }
  props.editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
}

function addImage() {
  const src = window.prompt('Image URL')
  if (src) props.editor.chain().focus().setImage({ src }).run()
}
</script>

<template>
  <div class="me-toolbar">
    <div class="me-toolbar__group">
      <button
        type="button"
        title="Undo (⌘Z)"
        :disabled="!editor.can().undo()"
        @click="editor.chain().focus().undo().run()"
      >
        <Undo2 :size="16" />
      </button>
      <button
        type="button"
        title="Redo (⌘⇧Z)"
        :disabled="!editor.can().redo()"
        @click="editor.chain().focus().redo().run()"
      >
        <Redo2 :size="16" />
      </button>
    </div>

    <div class="me-toolbar__group">
      <select
        class="me-toolbar__select"
        :value="headingLevel"
        title="Block type"
        @change="setHeading(($event.target as HTMLSelectElement).value)"
      >
        <option value="0">Paragraph</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
        <option value="4">Heading 4</option>
        <option value="5">Heading 5</option>
        <option value="6">Heading 6</option>
      </select>
    </div>

    <div class="me-toolbar__group">
      <button
        type="button"
        title="Bold (⌘B)"
        :class="{ 'is-active': isActive('bold') }"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <Bold :size="16" />
      </button>
      <button
        type="button"
        title="Italic (⌘I)"
        :class="{ 'is-active': isActive('italic') }"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <Italic :size="16" />
      </button>
      <button
        type="button"
        title="Underline (⌘U)"
        :class="{ 'is-active': isActive('underline') }"
        @click="editor.chain().focus().toggleUnderline().run()"
      >
        <UnderlineIcon :size="16" />
      </button>
      <button
        type="button"
        title="Strikethrough"
        :class="{ 'is-active': isActive('strike') }"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        <Strikethrough :size="16" />
      </button>
      <button
        type="button"
        title="Highlight"
        :class="{ 'is-active': isActive('highlight') }"
        @click="editor.chain().focus().toggleHighlight().run()"
      >
        <Highlighter :size="16" />
      </button>
      <button
        type="button"
        title="Inline code"
        :class="{ 'is-active': isActive('code') }"
        @click="editor.chain().focus().toggleCode().run()"
      >
        <Code :size="16" />
      </button>
      <button
        type="button"
        title="Subscript"
        :class="{ 'is-active': isActive('subscript') }"
        @click="editor.chain().focus().toggleSubscript().run()"
      >
        <SubIcon :size="16" />
      </button>
      <button
        type="button"
        title="Superscript"
        :class="{ 'is-active': isActive('superscript') }"
        @click="editor.chain().focus().toggleSuperscript().run()"
      >
        <SupIcon :size="16" />
      </button>
    </div>

    <div class="me-toolbar__group">
      <button
        type="button"
        title="Bullet list"
        :class="{ 'is-active': isActive('bulletList') }"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <List :size="16" />
      </button>
      <button
        type="button"
        title="Numbered list"
        :class="{ 'is-active': isActive('orderedList') }"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        <ListOrdered :size="16" />
      </button>
      <button
        type="button"
        title="Task list"
        :class="{ 'is-active': isActive('taskList') }"
        @click="editor.chain().focus().toggleTaskList().run()"
      >
        <ListChecks :size="16" />
      </button>
      <button
        type="button"
        title="Blockquote"
        :class="{ 'is-active': isActive('blockquote') }"
        @click="editor.chain().focus().toggleBlockquote().run()"
      >
        <Quote :size="16" />
      </button>
      <button
        type="button"
        title="Code block"
        :class="{ 'is-active': isActive('codeBlock') }"
        @click="editor.chain().focus().toggleCodeBlock().run()"
      >
        <Code2 :size="16" />
      </button>
    </div>

    <div class="me-toolbar__group">
      <button
        type="button"
        title="Align left"
        :class="{ 'is-active': hasAttrs({ textAlign: 'left' }) }"
        @click="editor.chain().focus().setTextAlign('left').run()"
      >
        <AlignLeft :size="16" />
      </button>
      <button
        type="button"
        title="Align center"
        :class="{ 'is-active': hasAttrs({ textAlign: 'center' }) }"
        @click="editor.chain().focus().setTextAlign('center').run()"
      >
        <AlignCenter :size="16" />
      </button>
      <button
        type="button"
        title="Align right"
        :class="{ 'is-active': hasAttrs({ textAlign: 'right' }) }"
        @click="editor.chain().focus().setTextAlign('right').run()"
      >
        <AlignRight :size="16" />
      </button>
    </div>

    <div class="me-toolbar__group">
      <button type="button" title="Link (⌘K)" :class="{ 'is-active': isActive('link') }" @click="setLink">
        <LinkIcon :size="16" />
      </button>
      <button
        type="button"
        title="Remove link"
        :disabled="!isActive('link')"
        @click="editor.chain().focus().unsetLink().run()"
      >
        <Unlink :size="16" />
      </button>
      <button type="button" title="Image" @click="addImage">
        <ImageIcon :size="16" />
      </button>
      <button
        type="button"
        title="Table"
        @click="editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"
      >
        <TableIcon :size="16" />
      </button>
      <button
        type="button"
        title="Divider"
        @click="editor.chain().focus().setHorizontalRule().run()"
      >
        <Minus :size="16" />
      </button>
      <button
        type="button"
        title="Math block"
        @click="editor.chain().focus().insertBlockMath({ latex: 'e^{i\\pi} + 1 = 0' }).run()"
      >
        <Sigma :size="16" />
      </button>
      <button type="button" title="Mermaid diagram" @click="editor.chain().focus().insertMermaid().run()">
        <Workflow :size="16" />
      </button>
    </div>

    <div class="me-toolbar__spacer" />

    <div class="me-toolbar__group">
      <button type="button" title="Find & replace (⌘F)" @click="emit('find')">
        <Search :size="16" />
      </button>
      <button
        type="button"
        title="Outline"
        :class="{ 'is-active': outlineOpen }"
        @click="emit('update:outlineOpen', !outlineOpen)"
      >
        <PanelLeft :size="16" />
      </button>
      <button
        type="button"
        title="Editor only"
        :class="{ 'is-active': viewMode === 'wysiwyg' }"
        @click="emit('update:viewMode', 'wysiwyg')"
      >
        <Eye :size="16" />
      </button>
      <button
        type="button"
        title="Split with markdown source"
        :class="{ 'is-active': viewMode === 'split' }"
        @click="emit('update:viewMode', 'split')"
      >
        <Columns2 :size="16" />
      </button>
      <button
        type="button"
        title="Markdown source only"
        :class="{ 'is-active': viewMode === 'source' }"
        @click="emit('update:viewMode', 'source')"
      >
        <Code2 :size="16" />
      </button>
      <button type="button" :title="dark ? 'Light theme' : 'Dark theme'" @click="emit('update:dark', !dark)">
        <Sun v-if="dark" :size="16" />
        <Moon v-else :size="16" />
      </button>
      <button
        type="button"
        :title="fullscreen ? 'Exit zen mode' : 'Zen mode'"
        @click="emit('update:fullscreen', !fullscreen)"
      >
        <Minimize2 v-if="fullscreen" :size="16" />
        <Maximize2 v-else :size="16" />
      </button>
    </div>
  </div>
</template>
