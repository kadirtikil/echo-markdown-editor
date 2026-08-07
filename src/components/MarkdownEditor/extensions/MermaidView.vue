<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { Code2, Eye, Trash2, TriangleAlert } from 'lucide-vue-next'

const props = defineProps(nodeViewProps)

const showSource = ref(false)
const svg = shallowRef('')
const error = ref('')
const rendering = ref(false)
const hostEl = ref<HTMLElement | null>(null)
const isDark = ref(false)

const code = computed(() => (props.node.attrs.code as string) ?? '')

/** Mermaid is ~3MB; only pull it in the first time a diagram actually renders. */
let mermaidPromise: Promise<typeof import('mermaid').default> | null = null

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then(({ default: mermaid }) => mermaid)
  }
  return mermaidPromise
}

/**
 * The theme class lives on the editor root, not on <html>, and it can be
 * toggled at any time — so track it and re-render rather than reading it once.
 */
onMounted(() => {
  const root = hostEl.value?.closest('.me-root')
  if (!root) return

  const sync = () => {
    isDark.value = root.classList.contains('dark')
  }

  sync()
  observer = new MutationObserver(sync)
  observer.observe(root, { attributes: true, attributeFilter: ['class'] })
})

let observer: MutationObserver | null = null

onBeforeUnmount(() => observer?.disconnect())

let renderToken = 0
const uid = `mermaid-${Math.random().toString(36).slice(2, 10)}`

async function render() {
  const source = code.value.trim()
  const token = ++renderToken

  if (!source) {
    svg.value = ''
    error.value = ''
    return
  }

  rendering.value = true
  try {
    const mermaid = await loadMermaid()

    // initialize() is global and cheap; calling it per render is what lets the
    // diagram follow the editor's theme toggle.
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      fontFamily: 'inherit',
      theme: isDark.value ? 'dark' : 'default',
    })

    // `parse` throws on invalid syntax without leaving an error <svg> behind.
    await mermaid.parse(source)
    const { svg: rendered } = await mermaid.render(`${uid}-${token}`, source)
    if (token !== renderToken) return
    svg.value = rendered
    error.value = ''
  } catch (e) {
    if (token !== renderToken) return
    svg.value = ''
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    if (token === renderToken) rendering.value = false
  }
}

watch([code, isDark], render, { immediate: true })

function updateCode(event: Event) {
  props.updateAttributes({ code: (event.target as HTMLTextAreaElement).value })
}
</script>

<template>
  <NodeViewWrapper class="me-mermaid" :class="{ 'is-selected': selected }">
    <div ref="hostEl" class="me-mermaid__toolbar" contenteditable="false">
      <span class="me-mermaid__label">mermaid</span>
      <button
        type="button"
        :title="showSource ? 'Show diagram' : 'Edit source'"
        @click="showSource = !showSource"
      >
        <Eye v-if="showSource" :size="14" />
        <Code2 v-else :size="14" />
      </button>
      <button type="button" title="Delete diagram" @click="deleteNode()">
        <Trash2 :size="14" />
      </button>
    </div>

    <textarea
      v-if="showSource"
      class="me-mermaid__source"
      spellcheck="false"
      :value="code"
      rows="8"
      @input="updateCode"
    />

    <div v-else class="me-mermaid__canvas" contenteditable="false">
      <div v-if="error" class="me-mermaid__error">
        <TriangleAlert :size="16" />
        <div>
          <strong>Diagram error</strong>
          <pre>{{ error }}</pre>
        </div>
      </div>
      <div v-else-if="rendering && !svg" class="me-mermaid__loading">Rendering diagram…</div>
      <!-- mermaid runs with securityLevel 'strict', which strips scripts from its output -->
      <div v-else class="me-mermaid__svg" v-html="svg" />
    </div>
  </NodeViewWrapper>
</template>
