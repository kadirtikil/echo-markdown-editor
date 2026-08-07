import { Editor } from '@tiptap/core'
import { createEditorExtensions } from '../editorExtensions'

export function createHeadlessEditor(content = ''): Editor {
  return new Editor({
    content,
    extensions: createEditorExtensions({ interactive: false }),
  })
}

export interface Timing {
  label: string
  runs: number
  median: number
  p95: number
  max: number
  total: number
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[index]
}

/** Runs `fn` `runs` times after `warmup` untimed iterations. */
export function measure(label: string, fn: () => void, runs = 20, warmup = 3): Timing {
  for (let i = 0; i < warmup; i += 1) fn()

  const samples: number[] = []
  for (let i = 0; i < runs; i += 1) {
    const start = performance.now()
    fn()
    samples.push(performance.now() - start)
  }

  const sorted = [...samples].sort((a, b) => a - b)
  return {
    label,
    runs,
    median: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1],
    total: samples.reduce((sum, value) => sum + value, 0),
  }
}

export function formatTiming(timing: Timing): string {
  const fixed = (value: number) => `${value.toFixed(1)}ms`.padStart(9)
  return `${timing.label.padEnd(42)} median ${fixed(timing.median)}   p95 ${fixed(
    timing.p95,
  )}   max ${fixed(timing.max)}`
}

/** Reports the timing to stdout and hands it back for assertions. */
export function report(timing: Timing): Timing {
  console.log(formatTiming(timing))
  return timing
}
