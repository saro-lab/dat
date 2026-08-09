import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, copyFileSync, rmSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CI = dirname(fileURLToPath(import.meta.url))
const PUBLIC = resolve(CI, '../../docs/public')

const png = (src, out, width) => {
    const svg = readFileSync(resolve(CI, src), 'utf8')
    const buf = new Resvg(svg, {
        fitTo: { mode: 'width', value: width },
        font: { loadSystemFonts: true },
    }).render().asPng()
    writeFileSync(resolve(PUBLIC, out), buf)
    console.log(`  ${out.padEnd(24)} ${width}px  ${(buf.length / 1024).toFixed(1)} KB`)
}

const svg = (src, out) => {
    copyFileSync(resolve(CI, src), resolve(PUBLIC, out))
    console.log(`  ${out}`)
}

console.log('PNG')
png('og.svg', 'og.png', 1200)
png('mark-small.svg', 'favicon-16.png', 16)
png('mark-small.svg', 'favicon-32.png', 32)
png('mark-small.svg', 'favicon-48.png', 48)
png('mark-square.svg', 'apple-touch-icon.png', 180)
png('mark-square.svg', 'icon-192.png', 192)
png('mark-square.svg', 'icon-512.png', 512)

console.log('SVG')
svg('mark.svg', 'dat.svg')
svg('mark.svg', 'favicon.svg')
svg('logo-lockup.svg', 'dat-logo.svg')
svg('site.webmanifest', 'site.webmanifest')

for (const name of ['og.svg', 'dat-mark.svg']) {
    const stale = resolve(PUBLIC, name)
    if (existsSync(stale)) {
        rmSync(stale)
        console.log(`removed  ${name}`)
    }
}
