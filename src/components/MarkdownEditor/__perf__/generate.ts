/**
 * Deterministic generators for large markdown documents, used by the
 * performance suite. Seeded so a regression is always reproducible.
 */

export function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    // xorshift32
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return ((state >>> 0) % 1_000_000) / 1_000_000
  }
}

const WORDS =
  'markdown editor document paragraph heading table diagram render parse serialize schema node mark transaction selection extension performance latency throughput'.split(
    ' ',
  )

function sentence(random: () => number, length = 12): string {
  const words: string[] = []
  for (let i = 0; i < length; i += 1) {
    words.push(WORDS[Math.floor(random() * WORDS.length)])
  }
  return `${words.join(' ')}.`
}

export interface DocumentShape {
  /** Number of top-level sections, each with a heading. */
  sections: number
  paragraphsPerSection: number
  listsPerSection: number
  tablesPerSection: number
  codeBlocksPerSection: number
  mermaidPerSection: number
  mathPerSection: number
  imagesPerSection: number
}

export const SHAPES: Record<string, DocumentShape> = {
  /** ~200 blocks — a long blog post. */
  medium: {
    sections: 20,
    paragraphsPerSection: 6,
    listsPerSection: 1,
    tablesPerSection: 0,
    codeBlocksPerSection: 1,
    mermaidPerSection: 0,
    mathPerSection: 1,
    imagesPerSection: 0,
  },
  /** ~1,500 blocks — a book chapter or a big spec. */
  large: {
    sections: 100,
    paragraphsPerSection: 8,
    listsPerSection: 2,
    tablesPerSection: 1,
    codeBlocksPerSection: 1,
    mermaidPerSection: 0,
    mathPerSection: 2,
    imagesPerSection: 0,
  },
  /** ~6,000 blocks / 10k+ lines — deliberately past what anyone should edit. */
  huge: {
    sections: 400,
    paragraphsPerSection: 8,
    listsPerSection: 2,
    tablesPerSection: 1,
    codeBlocksPerSection: 1,
    mermaidPerSection: 0,
    mathPerSection: 2,
    imagesPerSection: 0,
  },
  /** Diagram-dense: the pathological case for the mermaid node. */
  diagrams: {
    sections: 50,
    paragraphsPerSection: 2,
    listsPerSection: 0,
    tablesPerSection: 0,
    codeBlocksPerSection: 0,
    mermaidPerSection: 1,
    mathPerSection: 0,
    imagesPerSection: 0,
  },
  /** Table-dense: many cells, the heaviest node type to parse. */
  tables: {
    sections: 40,
    paragraphsPerSection: 1,
    listsPerSection: 0,
    tablesPerSection: 3,
    codeBlocksPerSection: 0,
    mermaidPerSection: 0,
    mathPerSection: 0,
    imagesPerSection: 0,
  },
}

export function generateMarkdown(shape: DocumentShape, seed = 42): string {
  const random = createRandom(seed)
  const out: string[] = []

  for (let s = 0; s < shape.sections; s += 1) {
    const level = (s % 3) + 1
    out.push(`${'#'.repeat(level)} Section ${s + 1} ${sentence(random, 3).slice(0, -1)}`, '')

    for (let p = 0; p < shape.paragraphsPerSection; p += 1) {
      const base = sentence(random, 20)
      const decorated =
        p % 3 === 0
          ? base.replace(/(\w+) (\w+)/, '**$1** *$2*')
          : p % 3 === 1
            ? base.replace(/(\w+)/, '`$1`')
            : base
      out.push(decorated, '')
    }

    for (let l = 0; l < shape.listsPerSection; l += 1) {
      for (let i = 0; i < 6; i += 1) {
        out.push(`- ${sentence(random, 6)}`)
        if (i % 3 === 0) out.push(`  - ${sentence(random, 5)}`)
      }
      out.push('')
    }

    for (let t = 0; t < shape.tablesPerSection; t += 1) {
      out.push('| Name | Type | Description |', '| --- | --- | --- |')
      for (let r = 0; r < 8; r += 1) {
        out.push(`| field${r} | string | ${sentence(random, 4)} |`)
      }
      out.push('')
    }

    for (let c = 0; c < shape.codeBlocksPerSection; c += 1) {
      out.push('```ts', 'export function handler(input: string): number {', '  return input.length', '}', '```', '')
    }

    for (let m = 0; m < shape.mermaidPerSection; m += 1) {
      out.push('```mermaid', 'graph TD', `  A${m}[Start] --> B${m}{Check}`, `  B${m} -->|yes| C${m}[Done]`, '```', '')
    }

    for (let m = 0; m < shape.mathPerSection; m += 1) {
      out.push(`Inline $x_{${m}}^2 + y^2 = z^2$ within a sentence.`, '')
      if (m === 0) out.push('$$', '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}', '$$', '')
    }

    for (let i = 0; i < shape.imagesPerSection; i += 1) {
      out.push(`![figure ${i}](https://example.com/image-${s}-${i}.png)`, '')
    }
  }

  return out.join('\n').trimEnd()
}

/** A single data-URI image of roughly `kilobytes` size. */
export function dataUriImage(kilobytes: number): string {
  const payload = 'A'.repeat(Math.max(0, kilobytes * 1024))
  return `data:image/png;base64,${payload}`
}
