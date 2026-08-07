import { copyFile, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'

/**
 * `tiptap-markdown` ships no types of its own, so the repo declares them in
 * src/types/tiptap-markdown.d.ts. tsc does not emit declarations for .d.ts
 * inputs, so that file never reaches dist and consumers would hit TS7016 on
 * the `import type { MarkdownStorage } from 'tiptap-markdown'` that survives in
 * the generated types. Copy it in and point the entry at it.
 */
const root = new URL('../', import.meta.url)
const source = new URL('src/types/tiptap-markdown.d.ts', root)
const target = new URL('dist/types/tiptap-markdown.d.ts', root)
const entry = new URL('dist/types/components/MarkdownEditor/index.d.ts', root)

await copyFile(source, target)

const reference = '/// <reference path="../../tiptap-markdown.d.ts" />\n'
const contents = await readFile(entry, 'utf8')

if (!contents.startsWith(reference)) {
  await writeFile(entry, reference + contents)
}

console.log(`finalize-types: bundled ${fileURLToPath(target)}`)
