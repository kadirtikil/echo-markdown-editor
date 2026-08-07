<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import DOMPurify from 'dompurify'
import {
  Bold,
  Code,
  Copy,
  Download,
  FileCode,
  Italic,
  Link as LinkIcon,
  Printer,
  Strikethrough,
} from 'lucide-vue-next'

import EditorToolbar from './EditorToolbar.vue'
import FindReplaceBar from './FindReplaceBar.vue'
import OutlineSidebar from './OutlineSidebar.vue'
import { createEditorExtensions } from './editorExtensions'
import type { ImageUploader } from './extensions/ImageHandler'
import type { EditorStats, OutlineEntry, ViewMode } from './types'

import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.css'
import './editor.css'

const props = withDefaults(
  defineProps<{
    /** Markdown source. Two-way bound. */
    modelValue?: string
    placeholder?: string
    editable?: boolean
    /** Persist to localStorage under this key; omit to disable autosave. */
    autosaveKey?: string
    autosaveDelay?: number
    /**
     * How long to coalesce edits before serializing and emitting. Serializing
     * is O(document), so this is what keeps typing responsive in long files.
     */
    debounce?: number
    /** Swap in a real endpoint to stop embedding images as data URIs. */
    onUpload?: ImageUploader
    maxImageSize?: number
    initialViewMode?: ViewMode
    /** Starting theme. The toolbar toggle takes over from here. */
    defaultDark?: boolean
    showToolbar?: boolean
    showStatusBar?: boolean
  }>(),
  {
    modelValue: '',
    placeholder: 'Write something, or press "/" for blocks…',
    editable: true,
    autosaveKey: undefined,
    autosaveDelay: 800,
    debounce: 200,
    onUpload: undefined,
    maxImageSize: 10 * 1024 * 1024,
    initialViewMode: 'wysiwyg',
    defaultDark: true,
    showToolbar: true,
    showStatusBar: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [string]
  change: [{ markdown: string; html: string }]
  save: [string]
  error: [Error]
}>()

const editor = shallowRef<Editor | undefined>()
const root = ref<HTMLElement | null>(null)
const sourceEl = ref<HTMLTextAreaElement | null>(null)

const viewMode = ref<ViewMode>(props.initialViewMode)
const fullscreen = ref(false)
const dark = ref(props.defaultDark)
const outlineOpen = ref(false)
const findOpen = ref(false)
/** Bumped on every transaction — drives selection-sensitive UI (toolbar). */
const revision = ref(0)
/**
 * Bumped only when the document actually changed. Scanning the doc for the
 * outline and the word count costs real time on long files, and a cursor move
 * cannot invalidate either.
 */
const docRevision = ref(0)
const sourceText = ref(props.modelValue)
const splitRatio = ref(0.5)
const saveState = ref<'idle' | 'saving' | 'saved'>('idle')

/** Guards the v-model round-trip so our own emits don't re-parse the document. */
let applyingExternal = false
let autosaveTimer: ReturnType<typeof setTimeout> | undefined
let emitTimer: ReturnType<typeof setTimeout> | undefined

/**
 * The last markdown we handed out. Serializing a large document is expensive
 * (~100ms at 6k lines, over a second at 24k), so the incoming-prop watcher
 * compares against this instead of re-serializing to decide whether a change
 * originated here.
 */
let lastEmitted = props.modelValue

function markdown(): string {
  const storage = editor.value?.storage.markdown as { getMarkdown(): string } | undefined
  return storage?.getMarkdown() ?? ''
}

/**
 * Serializing on every keystroke makes large documents unusable, so emits are
 * coalesced. `flush()` forces one out when a caller needs the value now.
 */
function scheduleEmit() {
  clearTimeout(emitTimer)
  emitTimer = setTimeout(flush, props.debounce)
}

function flush() {
  clearTimeout(emitTimer)
  emitTimer = undefined

  const instance = editor.value
  if (!instance) return

  const md = markdown()
  lastEmitted = md

  // Only the source pane reads this, and re-rendering a megabyte of text into
  // a hidden textarea is not free.
  if (viewMode.value !== 'wysiwyg') sourceText.value = md

  emit('update:modelValue', md)
  emit('change', {
    markdown: md,
    // Lazy: consumers that only want markdown never pay for HTML rendering.
    get html() {
      return instance.getHTML()
    },
  })
  scheduleAutosave(md)
}

onMounted(() => {
  const restored = props.autosaveKey ? localStorage.getItem(props.autosaveKey) : null
  const initial = props.modelValue || restored || ''

  editor.value = new Editor({
    editable: props.editable,
    content: initial,
    extensions: createEditorExtensions({
      placeholder: props.placeholder,
      upload: props.onUpload,
      maxImageSize: props.maxImageSize,
      onError: (error) => emit('error', error),
    }),
    editorProps: {
      attributes: {
        class: 'me-prose',
        spellcheck: 'true',
      },
    },
    onUpdate: () => {
      if (applyingExternal) return
      scheduleEmit()
    },
    // Fires for every state change, including selection moves — this is what
    // drives the toolbar's active states.
    onTransaction: ({ transaction }) => {
      revision.value += 1
      if (transaction.docChanged) docRevision.value += 1
    },
  })

  sourceText.value = markdown()
  lastEmitted = sourceText.value

  if (restored && !props.modelValue) emit('update:modelValue', lastEmitted)

  document.addEventListener('keydown', onGlobalKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onGlobalKeydown)
  clearTimeout(emitTimer)
  clearTimeout(autosaveTimer)
  editor.value?.destroy()
})

watch(
  () => props.modelValue,
  (value) => {
    if (!editor.value) return
    // Cheap identity check against what we last emitted — re-serializing here
    // would cost as much as the reparse we're trying to avoid.
    if (value === lastEmitted) return

    applyingExternal = true
    editor.value.commands.setContent(value, { emitUpdate: false })
    lastEmitted = value
    sourceText.value = value
    applyingExternal = false
  },
)

/** Keeps the source pane current when it becomes visible. */
watch(viewMode, (mode) => {
  if (mode !== 'wysiwyg') sourceText.value = markdown()
})

watch(
  () => props.editable,
  (value) => editor.value?.setEditable(value),
)

function scheduleAutosave(md: string) {
  if (!props.autosaveKey) return

  saveState.value = 'saving'
  clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => {
    try {
      localStorage.setItem(props.autosaveKey as string, md)
      saveState.value = 'saved'
      emit('save', md)
    } catch (error) {
      saveState.value = 'idle'
      emit('error', error instanceof Error ? error : new Error(String(error)))
    }
  }, props.autosaveDelay)
}

function onGlobalKeydown(event: KeyboardEvent) {
  if (!root.value?.contains(document.activeElement) && !findOpen.value) return

  const mod = event.metaKey || event.ctrlKey

  if (mod && event.key.toLowerCase() === 'f') {
    event.preventDefault()
    findOpen.value = true
  }
  if (event.key === 'Escape') {
    if (findOpen.value) findOpen.value = false
    else if (fullscreen.value) fullscreen.value = false
  }
}

/* ---------- derived state ---------- */

const stats = computed<EditorStats>(() => {
  void docRevision.value
  const storage = editor.value?.storage.characterCount as
    | { words(): number; characters(): number }
    | undefined
  const words = storage?.words() ?? 0
  return {
    words,
    characters: storage?.characters() ?? 0,
    readingMinutes: Math.max(1, Math.ceil(words / 200)),
  }
})

const outline = computed<OutlineEntry[]>(() => {
  void docRevision.value
  const instance = editor.value
  if (!instance) return []

  const entries: OutlineEntry[] = []
  instance.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return
    entries.push({
      level: node.attrs.level as number,
      text: node.textContent,
      pos,
      id: `${pos}`,
    })
  })
  return entries
})

const activeHeadingId = computed<string | null>(() => {
  void revision.value
  const instance = editor.value
  if (!instance) return null

  const from = instance.state.selection.from
  let active: OutlineEntry | null = null
  for (const entry of outline.value) {
    if (entry.pos <= from) active = entry
    else break
  }
  return active?.id ?? null
})

const splitStyle = computed(() => ({
  gridTemplateColumns: `${splitRatio.value}fr 6px ${1 - splitRatio.value}fr`,
}))

/* ---------- source pane ---------- */

let sourceDebounce: ReturnType<typeof setTimeout> | undefined

function onSourceInput(event: Event) {
  const value = (event.target as HTMLTextAreaElement).value
  sourceText.value = value

  clearTimeout(sourceDebounce)
  sourceDebounce = setTimeout(() => {
    if (!editor.value || value === lastEmitted) return
    applyingExternal = true
    editor.value.commands.setContent(value, { emitUpdate: false })
    applyingExternal = false
    lastEmitted = value
    emit('update:modelValue', value)
    scheduleAutosave(value)
  }, 400)
}

/** Keeps the source pane roughly aligned with the editor while scrolling. */
function syncScroll(from: HTMLElement, to: HTMLElement) {
  const scrollable = from.scrollHeight - from.clientHeight
  if (scrollable <= 0) return
  const ratio = from.scrollTop / scrollable
  to.scrollTop = ratio * (to.scrollHeight - to.clientHeight)
}

let syncing = false

function onEditorScroll(event: Event) {
  if (viewMode.value !== 'split' || syncing || !sourceEl.value) return
  syncing = true
  syncScroll(event.target as HTMLElement, sourceEl.value)
  requestAnimationFrame(() => (syncing = false))
}

function onSourceScroll(event: Event) {
  const pane = root.value?.querySelector<HTMLElement>('.me-pane--editor')
  if (viewMode.value !== 'split' || syncing || !pane) return
  syncing = true
  syncScroll(event.target as HTMLElement, pane)
  requestAnimationFrame(() => (syncing = false))
}

function startResize(event: PointerEvent) {
  const container = root.value?.querySelector<HTMLElement>('.me-panes')
  if (!container) return

  const move = (moveEvent: PointerEvent) => {
    const bounds = container.getBoundingClientRect()
    const ratio = (moveEvent.clientX - bounds.left) / bounds.width
    splitRatio.value = Math.min(0.85, Math.max(0.15, ratio))
  }

  const stop = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', stop)
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', stop)
  event.preventDefault()
}

/* ---------- exports ---------- */

function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function exportMarkdown() {
  download(markdown(), 'document.md', 'text/markdown;charset=utf-8')
}

function exportHtml() {
  const body = DOMPurify.sanitize(editor.value?.getHTML() ?? '')
  const page = `<!doctype html>
<html><head><meta charset="utf-8"><title>Document</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/katex.min.css">
<style>body{max-width:44rem;margin:3rem auto;padding:0 1.5rem;font:16px/1.7 system-ui,sans-serif}
pre{background:#f6f8fa;padding:1rem;border-radius:8px;overflow:auto}
table{border-collapse:collapse}td,th{border:1px solid #d0d7de;padding:.4rem .6rem}</style>
</head><body>${body}</body></html>`
  download(page, 'document.html', 'text/html;charset=utf-8')
}

async function copyMarkdown() {
  await navigator.clipboard.writeText(markdown())
}

async function copyRichText() {
  const html = DOMPurify.sanitize(editor.value?.getHTML() ?? '')
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([markdown()], { type: 'text/plain' }),
      }),
    ])
  } catch (error) {
    // Safari rejects ClipboardItem outside a direct user gesture chain.
    emit('error', error instanceof Error ? error : new Error(String(error)))
  }
}

function printDocument() {
  window.print()
}

function promptForLink() {
  const href = window.prompt('Link URL', 'https://')
  if (!href) return
  editor.value?.chain().focus().extendMarkRange('link').setLink({ href }).run()
}

function jumpToHeading(entry: OutlineEntry) {
  editor.value?.chain().focus().setTextSelection(entry.pos + 1).scrollIntoView().run()
}

defineExpose({
  editor,
  /** Emits any pending debounced change immediately. */
  flush,
  getMarkdown: () => markdown(),
  getHTML: () => editor.value?.getHTML() ?? '',
  exportMarkdown,
  exportHtml,
  focus: () => editor.value?.commands.focus(),
})
</script>

<template>
  <div
    ref="root"
    class="me-root"
    :class="{ 'is-fullscreen': fullscreen, dark }"
  >
    <EditorToolbar
      v-if="editor && showToolbar"
      v-model:view-mode="viewMode"
      v-model:fullscreen="fullscreen"
      v-model:dark="dark"
      v-model:outline-open="outlineOpen"
      :editor="editor"
      :revision="revision"
      @find="findOpen = true"
    />

    <FindReplaceBar
      v-if="editor"
      :editor="editor"
      :open="findOpen"
      :revision="revision"
      @close="findOpen = false"
    />

    <div class="me-body">
      <OutlineSidebar
        v-if="outlineOpen"
        :entries="outline"
        :active-id="activeHeadingId"
        @jump="jumpToHeading"
      />

      <div
        class="me-panes"
        :class="`me-panes--${viewMode}`"
        :style="viewMode === 'split' ? splitStyle : undefined"
      >
        <div
          v-show="viewMode !== 'source'"
          class="me-pane me-pane--editor"
          @scroll="onEditorScroll"
        >
          <BubbleMenu
            v-if="editor"
            :editor="editor"
            :options="{ placement: 'top' }"
            class="me-bubble"
          >
            <button
              type="button"
              :class="{ 'is-active': editor.isActive('bold') }"
              @click="editor.chain().focus().toggleBold().run()"
            >
              <Bold :size="14" />
            </button>
            <button
              type="button"
              :class="{ 'is-active': editor.isActive('italic') }"
              @click="editor.chain().focus().toggleItalic().run()"
            >
              <Italic :size="14" />
            </button>
            <button
              type="button"
              :class="{ 'is-active': editor.isActive('strike') }"
              @click="editor.chain().focus().toggleStrike().run()"
            >
              <Strikethrough :size="14" />
            </button>
            <button
              type="button"
              :class="{ 'is-active': editor.isActive('code') }"
              @click="editor.chain().focus().toggleCode().run()"
            >
              <Code :size="14" />
            </button>
            <button
              type="button"
              :class="{ 'is-active': editor.isActive('link') }"
              @click="promptForLink"
            >
              <LinkIcon :size="14" />
            </button>
          </BubbleMenu>

          <EditorContent :editor="editor" />
        </div>

        <div
          v-if="viewMode === 'split'"
          class="me-resizer"
          role="separator"
          aria-orientation="vertical"
          @pointerdown="startResize"
        />

        <div v-show="viewMode !== 'wysiwyg'" class="me-pane me-pane--source">
          <textarea
            ref="sourceEl"
            class="me-source"
            spellcheck="false"
            :value="sourceText"
            :readonly="!editable"
            @input="onSourceInput"
            @scroll="onSourceScroll"
          />
        </div>
      </div>
    </div>

    <div v-if="showStatusBar" class="me-status">
      <span>{{ stats.words }} words</span>
      <span>{{ stats.characters }} characters</span>
      <span>~{{ stats.readingMinutes }} min read</span>

      <span v-if="autosaveKey" class="me-status__save">
        <template v-if="saveState === 'saving'">saving…</template>
        <template v-else-if="saveState === 'saved'">saved</template>
      </span>

      <span class="me-status__spacer" />

      <button type="button" title="Copy markdown" @click="copyMarkdown">
        <Copy :size="14" /> Markdown
      </button>
      <button type="button" title="Copy as rich text" @click="copyRichText">
        <Copy :size="14" /> Rich text
      </button>
      <button type="button" title="Download .md" @click="exportMarkdown">
        <Download :size="14" /> .md
      </button>
      <button type="button" title="Download .html" @click="exportHtml">
        <FileCode :size="14" /> .html
      </button>
      <button type="button" title="Print / Save as PDF" @click="printDocument">
        <Printer :size="14" /> PDF
      </button>
    </div>
  </div>
</template>
