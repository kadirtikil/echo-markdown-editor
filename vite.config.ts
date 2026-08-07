import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * GitHub Pages serves project sites from https://<user>.github.io/<repo>/, so
 * assets have to be requested from that subpath rather than the domain root.
 * The deploy workflow sets BASE_PATH=/<repo>/; local dev and previews keep "/".
 *
 * A user/organisation site (<user>.github.io) is served from the root, so leave
 * BASE_PATH unset in that case.
 */
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [vue()],
  build: {
    // "dist" belongs to the published package (see vite.lib.config.ts); the
    // demo site builds alongside it rather than overwriting it.
    outDir: 'demo-dist',
    // The editor stack is inherently large; the informative warning fires on
    // every build otherwise. Mermaid is already split into lazy chunks.
    chunkSizeWarningLimit: 1200,
  },
})
