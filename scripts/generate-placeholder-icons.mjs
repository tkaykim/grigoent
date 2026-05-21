#!/usr/bin/env node
/**
 * Generate placeholder PWA icons (black on white, GRIGO ENT wordmark)
 * for public/icon-192.png and public/icon-512.png.
 *
 * Replace with the real logo later by running scripts/generate-pwa-icons.mjs
 * after saving the source logo as public/source-logo.png.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PUBLIC_DIR = path.join(ROOT, 'public')
const APP_DIR = path.join(ROOT, 'src', 'app')

function svg(size) {
  // 18% padding so it survives Android maskable safe-zone crop.
  const pad = Math.round(size * 0.18)
  const inner = size - pad * 2
  // Symbol row + wordmark row inside inner box.
  const symbolH = Math.round(inner * 0.5)
  const wordH = Math.round(inner * 0.22)
  const gap = Math.round(inner * 0.08)
  const totalH = symbolH + gap + wordH
  const topY = pad + Math.round((inner - totalH) / 2)
  const cx = size / 2
  // Stroke width scales with size.
  const sw = Math.max(2, Math.round(size * 0.03))
  // Symbol: three glyphs roughly ㄱ ㄹ ㄱ on a baseline.
  const symbolY = topY
  const symbolW = Math.round(inner * 0.72)
  const glyphW = Math.round(symbolW / 3.2)
  const glyphGap = Math.round((symbolW - glyphW * 3) / 2)
  const symbolX = Math.round(cx - symbolW / 2)
  // glyph 1: ㄱ (top + right down)
  const g1x = symbolX
  // glyph 2: ㄹ (zigzag)
  const g2x = g1x + glyphW + glyphGap
  // glyph 3: ㄱ with dot (top + right down + dot)
  const g3x = g2x + glyphW + glyphGap
  const dotR = Math.round(sw * 0.9)

  // Build glyph paths.
  const g1 = `M ${g1x} ${symbolY} H ${g1x + glyphW} V ${symbolY + symbolH}`
  // ㄹ: top bar, right down halfway, middle bar to left, left down halfway, bottom bar to right
  const halfH = symbolY + Math.round(symbolH / 2)
  const g2 =
    `M ${g2x} ${symbolY} H ${g2x + glyphW} ` +
    `M ${g2x + glyphW} ${symbolY} V ${halfH} ` +
    `M ${g2x + glyphW} ${halfH} H ${g2x} ` +
    `M ${g2x} ${halfH} V ${symbolY + symbolH} ` +
    `M ${g2x} ${symbolY + symbolH} H ${g2x + glyphW}`
  const g3 = `M ${g3x} ${symbolY} H ${g3x + glyphW} V ${symbolY + symbolH}`
  const dotCx = g3x + glyphW + Math.round(dotR * 2.2)
  const dotCy = symbolY + symbolH - dotR

  const fontSize = wordH
  const wordY = symbolY + symbolH + gap + Math.round(wordH * 0.8)

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#ffffff"/>
  <g fill="none" stroke="#000000" stroke-width="${sw}" stroke-linecap="square" stroke-linejoin="miter">
    <path d="${g1}"/>
    <path d="${g2}"/>
    <path d="${g3}"/>
  </g>
  <circle cx="${dotCx}" cy="${dotCy}" r="${dotR}" fill="#000000"/>
  <text x="${cx}" y="${wordY}" text-anchor="middle"
    font-family="Helvetica, Arial, sans-serif" font-weight="700"
    font-size="${fontSize}" fill="#000000" letter-spacing="${Math.round(fontSize * 0.05)}">GRIGO ENT</text>
</svg>`
}

async function main() {
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    console.error('sharp is not installed. Run: npm i -D sharp')
    process.exit(1)
  }

  await fs.mkdir(PUBLIC_DIR, { recursive: true })
  await fs.mkdir(APP_DIR, { recursive: true })

  const targets = [
    { out: path.join(PUBLIC_DIR, 'icon-192.png'), size: 192 },
    { out: path.join(PUBLIC_DIR, 'icon-512.png'), size: 512 },
    { out: path.join(APP_DIR, 'icon.png'), size: 512 },
    { out: path.join(APP_DIR, 'apple-icon.png'), size: 180 },
  ]

  for (const t of targets) {
    const buf = Buffer.from(svg(t.size))
    await sharp(buf, { density: 384 }).resize(t.size, t.size).png().toFile(t.out)
    console.log('  ✓', path.relative(ROOT, t.out))
  }

  console.log('\nPlaceholder icons generated. Replace later with real branded artwork via scripts/generate-pwa-icons.mjs.')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
