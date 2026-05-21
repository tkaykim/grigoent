#!/usr/bin/env node
/**
 * Generate PWA icons from a source logo.
 *
 * Manifest / sw.js (master) references these exact paths:
 *   /icon-192.png  (any + maskable, 192x192)
 *   /icon-512.png  (any + maskable, 512x512)
 *
 * Usage:
 *   1. Save the brand logo as `public/source-logo.png` (or .jpg/.webp/.svg)
 *      Recommended source: transparent/white background, >= 1024px on the longest edge.
 *   2. Run: `node scripts/generate-pwa-icons.mjs`
 *
 * Outputs (white square background, ~18% padding to satisfy maskable safe zone):
 *   public/icon-192.png
 *   public/icon-512.png
 *   src/app/icon.png         (Next.js auto favicon; 512x512)
 *   src/app/apple-icon.png   (Next.js auto apple-touch-icon; 180x180)
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PUBLIC_DIR = path.join(ROOT, 'public')
const APP_DIR = path.join(ROOT, 'src', 'app')

async function findSource() {
  const candidates = [
    'source-logo.png',
    'source-logo.jpg',
    'source-logo.jpeg',
    'source-logo.webp',
    'source-logo.svg',
  ]
  for (const name of candidates) {
    const p = path.join(PUBLIC_DIR, name)
    try {
      await fs.access(p)
      return p
    } catch {}
  }
  throw new Error(
    `No source logo found. Save your logo as one of:\n` +
      candidates.map((c) => `  public/${c}`).join('\n')
  )
}

async function main() {
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    console.error('sharp is not installed. Run: npm i -D sharp')
    process.exit(1)
  }

  const source = await findSource()
  const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }

  // pad=0.18 -> logo fills 64% of side (safe for Android adaptive maskable mask)
  async function render(outPath, size, pad) {
    const inner = Math.round(size * (1 - pad * 2))
    const logo = await sharp(source)
      .resize(inner, inner, { fit: 'contain', background: WHITE })
      .png()
      .toBuffer()
    const offset = Math.round((size - inner) / 2)
    await sharp({
      create: { width: size, height: size, channels: 4, background: WHITE },
    })
      .composite([{ input: logo, left: offset, top: offset }])
      .png()
      .toFile(outPath)
    console.log('  ✓', path.relative(ROOT, outPath))
  }

  console.log('Generating PWA icons from', path.relative(ROOT, source))

  await render(path.join(PUBLIC_DIR, 'icon-192.png'), 192, 0.18)
  await render(path.join(PUBLIC_DIR, 'icon-512.png'), 512, 0.18)

  await fs.mkdir(APP_DIR, { recursive: true })
  await render(path.join(APP_DIR, 'icon.png'), 512, 0.12)
  await render(path.join(APP_DIR, 'apple-icon.png'), 180, 0.1)

  console.log('\nDone. Commit the generated PNGs.')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
