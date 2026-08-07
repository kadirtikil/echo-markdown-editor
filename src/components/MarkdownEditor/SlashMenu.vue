<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Editor, Range } from '@tiptap/core'
import type { SlashCommandItem } from './commands'

const props = defineProps<{
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
  editor: Editor
  range: Range
}>()

const selected = ref(0)
const listEl = ref<HTMLElement | null>(null)

/** Flat list plus the index at which each group starts, for the headers. */
const grouped = computed(() => {
  const groups: { name: string; items: { item: SlashCommandItem; index: number }[] }[] = []

  props.items.forEach((item, index) => {
    const last = groups[groups.length - 1]
    if (last && last.name === item.group) last.items.push({ item, index })
    else groups.push({ name: item.group, items: [{ item, index }] })
  })

  return groups
})

watch(
  () => props.items,
  () => {
    selected.value = 0
  },
)

function select(index: number) {
  const item = props.items[index]
  if (item) props.command(item)
}

function move(delta: number) {
  const total = props.items.length
  if (!total) return
  selected.value = (selected.value + delta + total) % total

  requestAnimationFrame(() => {
    listEl.value
      ?.querySelector(`[data-index="${selected.value}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  })
}

function onKeyDown({ event }: { event: KeyboardEvent }): boolean {
  if (event.key === 'ArrowDown') {
    move(1)
    return true
  }
  if (event.key === 'ArrowUp') {
    move(-1)
    return true
  }
  if (event.key === 'Enter' || event.key === 'Tab') {
    select(selected.value)
    return true
  }
  return false
}

defineExpose({ onKeyDown })
</script>

<template>
  <div ref="listEl" class="me-slash">
    <div v-if="!items.length" class="me-slash__empty">No matching blocks</div>

    <template v-for="group in grouped" :key="group.name">
      <div class="me-slash__group">{{ group.name }}</div>
      <button
        v-for="entry in group.items"
        :key="entry.item.title"
        type="button"
        class="me-slash__item"
        :class="{ 'is-active': entry.index === selected }"
        :data-index="entry.index"
        @click="select(entry.index)"
        @mouseenter="selected = entry.index"
      >
        <span class="me-slash__icon"><component :is="entry.item.icon" :size="16" /></span>
        <span class="me-slash__text">
          <strong>{{ entry.item.title }}</strong>
          <small>{{ entry.item.description }}</small>
        </span>
      </button>
    </template>
  </div>
</template>
