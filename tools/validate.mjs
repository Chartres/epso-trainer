// validate-data gate: schema + exactly-one-correct + dedupe over /content/bank.
// Reuses the app's own validators so authoring-time and runtime rules can't drift.
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Load the TS validators through Vite's SSR transform (no separate build step).
const vite = await createServer({ configFile: join(root, 'vite.config.ts'), server: { middlewareMode: true }, logLevel: 'error' })
const { validateItem, validateBank } = await vite.ssrLoadModule('/src/content/validate.ts')

const bankDir = join(root, 'content', 'bank')
const files = readdirSync(bankDir).filter((f) => f.endsWith('.json'))
let allItems = []
let errors = []

for (const f of files) {
  const pack = JSON.parse(readFileSync(join(bankDir, f), 'utf8'))
  if (!pack.pack || !Array.isArray(pack.items)) {
    errors.push({ id: f, problem: 'pack file must have {pack, version, items[]}' })
    continue
  }
  for (const item of pack.items) errors.push(...validateItem(item))
  allItems.push(...pack.items)
}
errors.push(...validateBank(allItems))

await vite.close()

if (errors.length) {
  console.error(`validate-data: ${errors.length} problem(s) in ${files.length} pack(s):`)
  for (const e of errors) console.error(`  ${e.id}: ${e.problem}`)
  process.exit(1)
}
console.log(`validate-data: OK — ${allItems.length} items in ${files.length} pack(s), 0 problems`)
