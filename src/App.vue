<script setup lang="ts">
import { ref } from 'vue'
import { Github, RotateCcw } from 'lucide-vue-next'
import { MarkdownEditor } from './components/MarkdownEditor'
import README from './components/MarkdownEditor/README.md?raw'

/** The only place the GitHub link is defined. */
const REPO_URL = 'https://github.com/kadirtikil/echo-markdown-editor'

const AUTOSAVE_KEY = 'markdown-editor-demo'

/**
 * The component's own README is the demo document: visitors read the docs by
 * editing them. `readme.test.ts` asserts it survives the round-trip, so the
 * rendered version matches the source on disk.
 */
const content = ref(localStorage.getItem(AUTOSAVE_KEY) ?? README)
const errors = ref<string[]>([])

function onError(error: Error) {
  errors.value = [error.message, ...errors.value].slice(0, 3)
}

function resetToReadme() {
  localStorage.removeItem(AUTOSAVE_KEY)
  content.value = README
}
</script>

<template>
  <div class="demo">
    <header class="demo__header">
      <div class="demo__actions">
        <button type="button" class="demo__btn" title="Reset to the README" @click="resetToReadme">
          <RotateCcw :size="15" />
          Reset
        </button>
        <a
          class="demo__btn"
          :href="REPO_URL"
          target="_blank"
          rel="noopener noreferrer"
          title="View source on GitHub"
        >
          <Github :size="15" />
            GitHub
        </a>
      </div>
    </header>

    <div class="demo__editor">
      <MarkdownEditor v-model="content" :autosave-key="AUTOSAVE_KEY" @error="onError" />
    </div>

    <p v-for="error in errors" :key="error" class="demo__error">{{ error }}</p>
  </div>
</template>

<style>
/* The editor defaults to its dark theme, so the page around it matches. */
:root {
  color-scheme: dark;
}

body {
  margin: 0;
  background: #010409;
  color: #e6edf3;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100vh;
  padding: 16px 20px 20px;
  box-sizing: border-box;
}

.demo__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.demo__title h1 {
  margin: 0;
  font-size: 18px;
}

.demo__title p {
  margin: 4px 0 0;
  max-width: 60ch;
  font-size: 13px;
  line-height: 1.5;
  opacity: 0.65;
}

.demo__title code,
.demo__title kbd {
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(127, 127, 127, 0.18);
  font-size: 12px;
}

.demo__actions {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
}

.demo__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid rgba(127, 127, 127, 0.35);
  border-radius: 7px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
  text-decoration: none;
  cursor: pointer;
}

.demo__btn:hover {
  border-color: currentColor;
  background: rgba(127, 127, 127, 0.1);
}

.demo__editor {
  flex: 1 1 auto;
  min-height: 0;
}

.demo__error {
  margin: 0;
  font-size: 13px;
  color: #f85149;
}
</style>
