<script setup lang="ts">
import type { OutlineEntry } from './types'

defineProps<{ entries: OutlineEntry[]; activeId: string | null }>()
const emit = defineEmits<{ jump: [OutlineEntry] }>()
</script>

<template>
  <aside class="me-outline">
    <div class="me-outline__title">Outline</div>

    <p v-if="!entries.length" class="me-outline__empty">
      Headings you add will show up here.
    </p>

    <nav v-else>
      <button
        v-for="entry in entries"
        :key="entry.id"
        type="button"
        class="me-outline__item"
        :class="{ 'is-active': entry.id === activeId }"
        :style="{ paddingLeft: `${(entry.level - 1) * 12 + 10}px` }"
        :title="entry.text"
        @click="emit('jump', entry)"
      >
        {{ entry.text || 'Untitled' }}
      </button>
    </nav>
  </aside>
</template>
