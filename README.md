# 📝 @kdrdev/echo-markdown-editor

A WYSIWYG markdown editor component for **Vue 3**, built on [Tiptap](https://tiptap.dev) v3.
You type on a rendered surface; `v-model` gives you markdown.

**[▶ Live demo](https://kadirtikil.github.io/echo-markdown-editor/)** — the demo document is this component's own documentation, so you can edit the docs to try the editor.

> ⚠️ **Beta.** This is `0.1.0`. The API is settling and minor versions may
> contain breaking changes until `1.0.0`.

## 📦 Install

```bash
npm install @kdrdev/echo-markdown-editor
# pnpm add @kdrdev/echo-markdown-editor
```

Vue 3.5+ is a peer dependency; everything else installs automatically.

## 🚀 Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownEditor } from '@kdrdev/echo-markdown-editor'
import '@kdrdev/echo-markdown-editor/style.css'

const content = ref('# Hello\n\nStart writing…')
</script>

<template>
  <MarkdownEditor v-model="content" autosave-key="my-doc" />
</template>
```

That one import carries the whole editor — toolbar, slash menu, find & replace,
outline, tables, math, and diagrams. There is nothing else to wire up.

The stylesheet import is required. KaTeX and highlight.js bring their own CSS
along automatically through the component.

## ⚙️ Props

| Prop              | Type                               | Default     | Notes                                                 |
| ----------------- | ---------------------------------- | ----------- | ----------------------------------------------------- |
| `modelValue`      | `string`                           | `''`        | Markdown source, two-way bound                        |
| `placeholder`     | `string`                           | see source  | Shown on an empty document                            |
| `editable`        | `boolean`                          | `true`      | Toggles read-only mode                                |
| `autosaveKey`     | `string \| undefined`              | `undefined` | localStorage key; omit to disable autosave            |
| `autosaveDelay`   | `number`                           | `800`       | Debounce in ms                                        |
| `debounce`        | `number`                           | `200`       | Coalesces edits before serializing — see Performance  |
| `onUpload`        | `(file: File) => Promise<string>`  | data URI    | Return a URL to stop embedding images in the document |
| `maxImageSize`    | `number`                           | `10485760`  | Bytes; larger files emit `error`                      |
| `initialViewMode` | `'wysiwyg' \| 'split' \| 'source'` | `'wysiwyg'` | Starting layout                                       |
| `defaultDark`     | `boolean`                          | `true`      | Starting theme; the toolbar toggle takes over         |
| `showToolbar`     | `boolean`                          | `true`      |                                                       |
| `showStatusBar`   | `boolean`                          | `true`      |                                                       |

## 📡 Events

- `update:modelValue(markdown: string)`
- `change({ markdown, html })` — `html` is a lazy getter, so it costs nothing unless read
- `save(markdown)` — after an autosave write
- `error(Error)` — upload failures, oversized images, clipboard rejections

## 🔧 Exposed methods

`editor` (the Tiptap instance), `flush()`, `getMarkdown()`, `getHTML()`,
`exportMarkdown()`, `exportHtml()`, `focus()`.

⚠️ `flush()` emits any pending debounced change immediately — call it before
submitting a form, since up to `debounce` ms of typing may not have reached
`v-model` yet.

## ✨ What's in it

✍️ **Writing** — bold, italic, underline, strike, inline code, highlight, sub/sup,
links, six heading levels, blockquotes, horizontal rules, text alignment,
typography smart replacements.

🧱 **Blocks** — bullet / ordered / task lists (nested), resizable tables with
header rows, images, syntax-highlighted code blocks, KaTeX inline and display
math, Mermaid diagrams.

🎛️ **Interaction** — `/` slash-command palette, selection bubble menu, find &
replace with regex (`⌘F`), live outline sidebar, image paste and drag-drop,
split view with a scroll-synced markdown pane, zen mode, 🌙 dark theme by
default, word / character / reading-time counts.

📤 **Output** — copy as markdown, copy as rich text, download `.md`, download a
standalone `.html`, print to PDF.

## 🎨 Theming

Colours are CSS custom properties on `.me-root`, overridden by `.me-root.dark`.
Restyle without forking:

```css
.me-root {
  --me-accent: #7c3aed;
  --me-radius: 4px;
}
```

Available tokens: `--me-bg`, `--me-bg-subtle`, `--me-bg-inset`, `--me-border`,
`--me-text`, `--me-text-muted`, `--me-accent`, `--me-accent-soft`,
`--me-danger`, `--me-highlight`, `--me-radius`, `--me-mono`.

## 🔄 Markdown round-trip

Everything is stored as portable markdown:

| In the editor | On disk                     |
| ------------- | --------------------------- |
| Inline math   | `$E = mc^2$`                |
| Display math  | `$$ … $$`                   |
| Mermaid       | ` ```mermaid ` fenced block |
| Task list     | `- [x] done`                |
| Table cell    | pipes escaped as `\|`       |

## ⚡ Bundle notes

The component itself is small (~19 kB gzipped); its dependencies are not.
Mermaid (~600 kB) is dynamically imported the first time a diagram renders, so
documents without diagrams never pay for it. KaTeX and the lowlight language
pack are the next largest pieces.

If initial bundle size matters more than coverage, build your own extension
list with `createEditorExtensions()` and narrow lowlight's `common` language set.

## 🌐 Browser only

The editor touches `localStorage`, the clipboard, and the DOM on mount. Under
SSR (Nuxt, `vite-ssr`), render it client-side only.

## 🧩 Also exported

`createEditorExtensions()` plus the custom Tiptap extensions written for this
component — `Mermaid`, `InlineMathMarkdown`, `BlockMathMarkdown`,
`SearchAndReplace`, `ImageHandler`, `SlashCommand`, `TightTaskList`,
`MarkdownTable`, `MarkdownEmoji` — for building a different editor on the same
pieces. Unused exports tree-shake away.

## 🛠️ Development

```bash
pnpm install
pnpm dev              # demo app
pnpm test             # round-trip correctness (~1s)
pnpm run test:perf    # performance budgets (~45s)
pnpm run build:package # build the publishable library
```

See [`src/components/MarkdownEditor/README.md`](src/components/MarkdownEditor/README.md)
for architecture, performance measurements, and notes on each custom extension.

## 📄 License

MIT
