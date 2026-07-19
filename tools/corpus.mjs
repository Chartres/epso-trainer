// Corpus fetch + chunk (PRD §6.1 steps 1-2): pull the EU legal texts from
// EUR-Lex, strip to plain text, split per article into content/corpus/chunks/
// so generation agents can read exactly the article an item must be grounded in.
// Usage: node tools/corpus.mjs [fetch|chunk|all]
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rawDir = join(root, 'content/corpus/raw')
const chunkDir = join(root, 'content/corpus/chunks')

export const INSTRUMENTS = [
  { slug: 'ai_act', celex: '32024R1689', title: 'Reg. (EU) 2024/1689 (AI Act)' },
  { slug: 'gdpr', celex: '32016R0679', title: 'Reg. (EU) 2016/679 (GDPR)' },
  { slug: 'data_act', celex: '32023R2854', title: 'Reg. (EU) 2023/2854 (Data Act)' },
  { slug: 'dga', celex: '32022R0868', title: 'Reg. (EU) 2022/868 (DGA)' },
  { slug: 'open_data', celex: '32019L1024', title: 'Dir. (EU) 2019/1024 (Open Data)' },
]

function fetchAll() {
  mkdirSync(rawDir, { recursive: true })
  for (const ins of INSTRUMENTS) {
    const out = join(rawDir, `${ins.slug}.html`)
    if (existsSync(out)) {
      console.log(`cached  ${ins.slug}`)
      continue
    }
    const url = `https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:${ins.celex}`
    execFileSync('curl', ['-sSL', '--fail', '-o', out, url], { stdio: 'inherit' })
    console.log(`fetched ${ins.slug} (${(readFileSync(out).length / 1e6).toFixed(1)} MB)`)
  }
}

function htmlToText(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;|&\w+;/g, ' ')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{2,}/g, '\n')
}

function chunkAll() {
  for (const ins of INSTRUMENTS) {
    const raw = join(rawDir, `${ins.slug}.html`)
    if (!existsSync(raw)) {
      console.error(`missing ${raw} — run fetch first`)
      process.exitCode = 1
      continue
    }
    const text = htmlToText(readFileSync(raw, 'utf8'))
    // EUR-Lex renders each article heading as a lone "Article N" line.
    const parts = text.split(/\n(?=Article \d+\n)/)
    const outDir = join(chunkDir, ins.slug)
    mkdirSync(outDir, { recursive: true })
    let count = 0
    for (const part of parts) {
      const m = part.match(/^Article (\d+)\n/)
      if (!m) continue
      const n = Number(m[1])
      // Everything after the last article (final provisions run to EOF) is fine;
      // annex text after the article block stays attached to the last article.
      writeFileSync(join(outDir, `art${String(n).padStart(3, '0')}.txt`), `${ins.title} — ${part.trim()}\n`)
      count++
    }
    console.log(`chunked ${ins.slug}: ${count} articles`)
  }
}

const mode = process.argv[2] ?? 'all'
if (mode === 'fetch' || mode === 'all') fetchAll()
if (mode === 'chunk' || mode === 'all') chunkAll()
