// Rasterize public/favicon.svg → PWA icons (192/512/maskable). Run once after
// changing the icon: node scripts/gen-icons.mjs
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'public/favicon.svg'), 'utf8')
mkdirSync(join(root, 'public/icons'), { recursive: true })

// The pinned @playwright/test may not match the pre-installed browser build;
// /opt/pw-browsers/chromium is a stable symlink in the remote environment.
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)
const browser = await chromium.launch(executablePath ? { executablePath } : {})
const page = await browser.newPage()

async function shot(size, file, pad = 0) {
  await page.setViewportSize({ width: size, height: size })
  const inner = size - 2 * pad
  await page.setContent(
    `<body style="margin:0;background:#0e1a33;display:grid;place-items:center;width:${size}px;height:${size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg style="width:100%;height:100%" ')}</div></body>`,
  )
  await page.screenshot({ path: join(root, 'public/icons', file) })
  console.log(`public/icons/${file}`)
}

await shot(192, 'icon-192.png')
await shot(512, 'icon-512.png')
await shot(180, 'apple-touch-icon.png')
// Maskable: safe zone = inner 80%.
await shot(512, 'maskable-512.png', 52)

await browser.close()
