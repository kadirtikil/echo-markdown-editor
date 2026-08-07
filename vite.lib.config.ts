import { createRequire } from 'node:module'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const require = createRequire(import.meta.url)
const pkg = require('./package.json') as {
  dependencies: Record<string, string>
  peerDependencies: Record<string, string>
}

/**
 * Every runtime dependency is externalised rather than bundled. Tiptap sits on
 * ProseMirror, and two copies of ProseMirror in one page throw on keyed plugins
 * and silently disagree about the schema — so the consumer's resolver has to be
 * the one that dedupes. They are declared as `dependencies`, so installing this
 * package still installs them; nothing extra is asked of the consumer.
 */
const externalPackages = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
]

/**
 * This deliberately covers stylesheets too, so `katex/dist/katex.min.css` and
 * `highlight.js/styles/github.css` stay as import statements in the output.
 *
 * Bundling them instead would drag KaTeX's 60 font files into our stylesheet as
 * base64 — library mode inlines CSS assets regardless of `assetsInlineLimit`,
 * because a standalone .css file has no reliable base path to resolve against —
 * which took the emitted CSS from ~25 kB to 1.5 MB. Left external, the
 * consumer's bundler resolves both the CSS and its fonts out of node_modules
 * the normal way, and no extra import is asked of them.
 *
 * Our own `./editor.css` is relative, matches no package name, and is bundled
 * into the emitted stylesheet as intended.
 */
function isExternal(id: string): boolean {
  return externalPackages.some((name) => id === name || id.startsWith(`${name}/`))
}

export default defineConfig({
  plugins: [vue()],
  // "public" holds the demo site's favicon and sprite sheet; the package has no
  // use for them.
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Nothing in editor.css references a binary asset; keep any that appears
    // later a real file rather than a base64 blob.
    assetsInlineLimit: 0,
    // Library consumers ship their own browser targets; leave the output
    // readable and let their bundler decide how far down to compile.
    minify: false,
    lib: {
      entry: fileURLToPath(new URL('./src/components/MarkdownEditor/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'markdown-editor.js',
      // Consumers import this explicitly as "@kdrdev/echo-markdown-editor/style.css".
      cssFileName: 'style',
    },
    rollupOptions: {
      external: isExternal,
    },
  },
})
