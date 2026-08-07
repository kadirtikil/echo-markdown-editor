<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { Editor } from '@tiptap/core'
import { ArrowDown, ArrowUp, CaseSensitive, Regex, WholeWord, X } from 'lucide-vue-next'
import type { SearchAndReplaceStorage } from './extensions/SearchAndReplace'

const props = defineProps<{ editor: Editor; open: boolean; revision: number }>()
const emit = defineEmits<{ close: [] }>()

const search = ref('')
const replace = ref('')
const caseSensitive = ref(false)
const wholeWord = ref(false)
const regex = ref(false)
const inputEl = ref<HTMLInputElement | null>(null)

/**
 * The extension keeps match state on plain (non-reactive) storage, so the
 * parent's transaction counter is what pulls fresh numbers into the template.
 */
const matches = computed(() => {
  void props.revision
  void search.value
  const storage = props.editor.storage.searchAndReplace as SearchAndReplaceStorage
  return { total: storage.matches.length, current: storage.currentIndex + 1 }
})

watch(
  () => props.open,
  async (open) => {
    if (open) {
      await nextTick()
      inputEl.value?.focus()
      inputEl.value?.select()
    } else {
      props.editor.commands.clearSearch()
    }
  },
)

watch(search, (value) => props.editor.commands.setSearchTerm(value))
watch(replace, (value) => props.editor.commands.setReplaceTerm(value))
watch([caseSensitive, wholeWord, regex], () =>
  props.editor.commands.setSearchOptions({
    caseSensitive: caseSensitive.value,
    wholeWord: wholeWord.value,
    regex: regex.value,
  }),
)

function onEnter(event: KeyboardEvent) {
  if (event.shiftKey) props.editor.commands.previousMatch()
  else props.editor.commands.nextMatch()
}
</script>

<template>
  <div v-if="open" class="me-find">
    <div class="me-find__row">
      <input
        ref="inputEl"
        v-model="search"
        class="me-find__input"
        type="text"
        placeholder="Find"
        @keydown.enter.prevent="onEnter"
        @keydown.esc.prevent="emit('close')"
      />

      <span class="me-find__count">
        <template v-if="matches.total > 0">{{ matches.current }} / {{ matches.total }}</template>
        <template v-else-if="search">no results</template>
      </span>

      <button
        type="button"
        title="Match case"
        :class="{ 'is-active': caseSensitive }"
        @click="caseSensitive = !caseSensitive"
      >
        <CaseSensitive :size="15" />
      </button>
      <button
        type="button"
        title="Whole word"
        :class="{ 'is-active': wholeWord }"
        @click="wholeWord = !wholeWord"
      >
        <WholeWord :size="15" />
      </button>
      <button
        type="button"
        title="Regular expression"
        :class="{ 'is-active': regex }"
        @click="regex = !regex"
      >
        <Regex :size="15" />
      </button>

      <button type="button" title="Previous (⇧⏎)" @click="editor.commands.previousMatch()">
        <ArrowUp :size="15" />
      </button>
      <button type="button" title="Next (⏎)" @click="editor.commands.nextMatch()">
        <ArrowDown :size="15" />
      </button>
      <button type="button" title="Close (Esc)" @click="emit('close')">
        <X :size="15" />
      </button>
    </div>

    <div class="me-find__row">
      <input
        v-model="replace"
        class="me-find__input"
        type="text"
        placeholder="Replace with"
        @keydown.esc.prevent="emit('close')"
      />
      <button type="button" class="me-find__text-btn" @click="editor.commands.replaceCurrent()">
        Replace
      </button>
      <button type="button" class="me-find__text-btn" @click="editor.commands.replaceAll()">
        Replace all
      </button>
    </div>
  </div>
</template>
