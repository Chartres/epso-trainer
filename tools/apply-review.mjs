// Apply exported spot-check verdicts to the committed bank packs (PRD §6.1
// step 5): approved → reviewed:true (Mock-eligible everywhere), rejected →
// item removed from the pack (regenerate the cell next authoring run).
// Usage: node tools/apply-review.mjs <telemetry-export.json>
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const exportPath = process.argv[2]
if (!exportPath) {
  console.error('usage: node tools/apply-review.mjs <telemetry-export.json>')
  process.exit(1)
}

const dump = JSON.parse(readFileSync(exportPath, 'utf8'))
const flags = dump.reviewFlags ?? []
const approved = new Set(flags.filter((f) => f.verdict === 'approved').map((f) => f.itemId))
const rejected = new Set(flags.filter((f) => f.verdict === 'rejected').map((f) => f.itemId))
if (approved.size + rejected.size === 0) {
  console.log('no reviewFlags in export — nothing to apply')
  process.exit(0)
}

const bankDir = join(root, 'content', 'bank')
let flipped = 0
let removed = 0
for (const f of readdirSync(bankDir).filter((f) => f.endsWith('.json'))) {
  const path = join(bankDir, f)
  const pack = JSON.parse(readFileSync(path, 'utf8'))
  const before = pack.items.length
  pack.items = pack.items.filter((it) => !rejected.has(it.id))
  removed += before - pack.items.length
  for (const it of pack.items) {
    if (approved.has(it.id) && !it.provenance.reviewed) {
      it.provenance.reviewed = true
      flipped++
    }
  }
  writeFileSync(path, JSON.stringify(pack, null, 2) + '\n')
}
console.log(`applied: ${flipped} approved (reviewed:true), ${removed} rejected (removed)`)
console.log('run validate-data + tests, then commit the pack changes')
