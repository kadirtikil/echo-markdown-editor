# 📝 MarkdownEditor

A WYSIWYG editor built on Tiptap v3 whose source of truth is a **markdown string**.
You type on a rendered surface; `v-model` gives you markdown.

> 👋 If you are reading this in the editor itself, that is the demo: this file is
> loaded as the starting document. Edit it freely — **Reset** restores the
> original, and your changes are kept in `localStorage` until you do.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { MarkdownEditor } from '@/components/MarkdownEditor'

const content = ref('# Hello\n\nStart writing…')
</script>

<template>
  <MarkdownEditor v-model="content" autosave-key="my-doc" />
</template>
```

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
[Typography](https://tiptap.dev/api/extensions/typography) smart replacements.

🧱 **Blocks** — bullet / ordered / task lists (nested), resizable tables with
header rows, images, syntax-highlighted code blocks via lowlight, KaTeX inline
and display math, Mermaid diagrams.

🎛️ **Interaction** — `/` slash-command palette, selection bubble menu, find &
replace with regex / case / whole-word (`⌘F`), live outline sidebar, image paste
and drag-drop, split view with a scroll-synced markdown pane, zen mode (`Esc` to
exit), 🌙 dark theme by default, word / character / reading-time counts.

📤 **Output** — copy as markdown, copy as rich text, download `.md`, download a
standalone `.html`, print to PDF (a print stylesheet strips the chrome).

## 🔄 Markdown round-trip

Everything is stored as portable markdown:

| In the editor | On disk                     |
| ------------- | --------------------------- |
| Inline math   | `$E = mc^2$`                |
| Display math  | `$$ … $$`                   |
| Mermaid       | ` ```mermaid ` fenced block |
| Task list     | `- [x] done`                |
| Table cell    | pipes escaped as `\|`       |

`markdown.test.ts` covers the round-trip, including that `It cost $5 and $10` is
*not* parsed as math, and that a pipe inside a table cell survives — without
re-escaping on the way out, a cell containing `a \| b` silently swallows the rest
of its row.

## 🧪 Tests

| Command              | What it runs                                    |
| -------------------- | ----------------------------------------------- |
| `pnpm test`          | Round-trip correctness (~1s)                    |
| `pnpm run test:perf` | Performance budgets on 292KB / 1.1MB docs (~45s) |
| `pnpm run test:all`  | Both                                            |

Perf tests live in `*.perf.test.ts` and are excluded from the default run.
`__perf__/generate.ts` builds seeded documents so a failure is reproducible.

`readme.test.ts` round-trips this file, because the demo renders it — if a doc
edit here breaks the parser, the test fails before the demo does. 🙂

## 🚀 Deploying the demo

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every
push to `main`. It type-checks and tests first, so a broken build never ships.

GitHub Pages is free for public repositories. Two things to set:

1. Repository → Settings → Pages → Source: **GitHub Actions**.
2. `REPO_URL` in `src/App.vue`, which is the GitHub link in the header.

Project sites are served from `https://<user>.github.io/<repo>/`, so the
workflow passes `BASE_PATH=/<repo>/` to the build. Without it every asset URL
points at the domain root and the page loads blank — the usual way a Pages
deploy of a Vite app fails. For a user site (`<user>.github.io`), drop that env
var.

## 🧩 Custom extensions

Written for this component, all re-exported from `index.ts`:

- `Mermaid` — atomic node + lazy-loading Vue node view; serializes to a fence
- `InlineMathMarkdown` / `BlockMathMarkdown` — Tiptap's math nodes plus a
  markdown-it plugin and serializers for `$…$` / `$$…$$`
- `SearchAndReplace` — decoration-based find & replace with regex support
- `ImageHandler` — paste/drop with a pluggable uploader
- `SlashCommand` — `@tiptap/suggestion` wired to a floating Vue menu
- `TightTaskList` — supplies the `tight` attribute tiptap-markdown omits for
  task lists, which otherwise serialize with blank lines between items
- `MarkdownTable` — escapes pipes when serializing cells, which tiptap-markdown
  does not

## ⚡ Performance

Measured in jsdom on an M-series Mac with `pnpm run test:perf`. Treat the
absolute numbers as relative indicators — a real browser is faster — but the
scaling behaviour is real.

| Document             | Parse   | Serialize | Keystroke (p95) |
| -------------------- | ------- | --------- | --------------- |
| 700 lines / 32KB     | 53ms    | 1ms       | <1ms            |
| 6,100 lines / 292KB  | 780ms   | 79ms      | 4.1ms           |
| 24,400 lines / 1.1MB | 3,400ms | 1,380ms   | 7.7ms           |

Two things make this work:

⏱️ **Edits are debounced before serializing.** `getMarkdown()` is O(document) —
79ms on a 292KB file. Serializing on every keystroke made per-key cost 189ms on
that document; coalescing edits behind `debounce` (200ms) brings it to 3ms, and
a 30-keystroke burst produces exactly one emit. The incoming-`modelValue`
watcher compares against the last emitted string rather than re-serializing, for
the same reason. `performance.perf.test.ts` guards this: reintroducing the eager
version fails the budget by 47x.

🎯 **Doc-derived state is separated from selection state.** The word count and
outline scan are recomputed on a `docRevision` counter that only advances when
the document actually changed, so moving the cursor in a long file costs
nothing. The toolbar's active states still track every transaction, which they
must.

Known upstream characteristics:

- ✅ **Parsing is linear** (~2.1x per doubling) and dominates opening a document.
- ⚠️ **Serializing is mildly superlinear** (~n^1.6) inside prosemirror-markdown.
  It is affordable only because it is debounced; past roughly 500KB it becomes
  noticeable, and a document that large wants an incremental serializer.
- 💤 Mermaid nodes are parsed but never rendered until visible, so 50 diagrams
  parse in ~31ms.

## 📦 Bundle notes

Mermaid (~600 kB) is dynamically imported the first time a diagram renders, so
documents without diagrams never pay for it. KaTeX and the lowlight language
pack are the next largest pieces; trim `common` to a narrower language set in
`editorExtensions.ts` if the initial bundle matters more than coverage.
