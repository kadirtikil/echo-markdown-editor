import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    // Performance budgets take about a minute; run them with `npm run test:perf`.
    exclude: ['**/node_modules/**', '**/*.perf.test.ts'],
  },
})
