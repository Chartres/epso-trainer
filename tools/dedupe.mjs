// Embedding-similarity dedupe (PRD §6.1 step 4): local MiniLM embeddings via
// transformers.js (no API, model cached after first run). Authoring-time tool —
// CI's validate-data keeps the cheaper token-Jaccard check; this one catches
// paraphrase-level duplicates Jaccard misses.
// Usage: node tools/dedupe.mjs [threshold=0.9]   (exit 1 if duplicates found)
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from '@huggingface/transformers'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const threshold = Number(process.argv[2] ?? 0.9)

const bankDir = join(root, 'content', 'bank')
const items = readdirSync(bankDir)
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(readFileSync(join(bankDir, f), 'utf8')).items.map((it) => ({ ...it, pack: f })))

console.log(`embedding ${items.length} stems (Xenova/all-MiniLM-L6-v2, local)…`)
const fe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8' })
const vecs = (await fe(items.map((i) => i.stem), { pooling: 'mean', normalize: true })).tolist()

const dups = []
for (let i = 0; i < items.length; i++) {
  for (let j = i + 1; j < items.length; j++) {
    const cos = vecs[i].reduce((s, v, k) => s + v * vecs[j][k], 0)
    if (cos >= threshold) dups.push({ a: items[i].id, b: items[j].id, cos: cos.toFixed(3) })
  }
}

if (dups.length) {
  console.error(`${dups.length} near-duplicate pair(s) at cosine ≥ ${threshold}:`)
  for (const d of dups) console.error(`  ${d.a} ~ ${d.b} (${d.cos})`)
  process.exit(1)
}
console.log(`dedupe: OK — no pairs at cosine ≥ ${threshold}`)
