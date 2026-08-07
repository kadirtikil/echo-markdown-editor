import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.perf.test.ts'],
    // Timing is meaningless when suites share a worker with other work.
    fileParallelism: false,
    testTimeout: 300_000,
  },
})
