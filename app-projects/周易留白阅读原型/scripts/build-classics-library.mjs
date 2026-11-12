import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const archivePath = resolve(projectRoot, 'vendor-input/Chinese-Classics-TXT.zip')
const libraryRoot = resolve(projectRoot, 'content/classics/library')
const manifestPath = resolve(libraryRoot, 'manifest.json')
const checkOnly = process.argv.includes('--check')

const internalSourceWarnings = new Set(['仪礼', '春秋公羊传', '尔雅'])

function listArchiveEntries() {
  return execFileSync('bsdtar', ['-tf', archivePath], { encoding: 'utf8' })
    .split('\n')
    .map(value => value.trim())
    .filter(value => value.endsWith('.txt'))
}

function safeRelativePath(entry) {
  const prefix = 'Chinese-Classics-TXT/'
  if (!entry.startsWith(prefix)) throw new Error(`Unexpected archive root: ${entry}`)
  const relative = entry.slice(prefix.length)
  const parts = relative.split('/')
  if (parts.some(part => !part || part === '.' || part === '..')) throw new Error(`Unsafe archive entry: ${entry}`)
  const outputPath = resolve(libraryRoot, relative)
  if (!outputPath.startsWith(`${libraryRoot}${sep}`)) throw new Error(`Archive entry escapes library root: ${entry}`)
  return { relative, outputPath }
}

function titleFrom(relative) {
  return basename(relative, '.txt').replace(/^\d+_/, '')
}

function collectionFrom(relative) {
  return relative.split('/')[0]
}

function sourceStatus(title, collection) {
  if (title === '乐经_失传说明') return '说明文件，不是传世原文'
  if (internalSourceWarnings.has(title)) return '文本内标注来源待确认'
  if (collection === '四书' && ['论语', '孟子'].includes(title)) return '与十三经同名文件内容完全相同'
  return '古典原文；汇编来源与版本待复核'
}

function bufferFor(entry) {
  return execFileSync('bsdtar', ['-xOf', archivePath, entry], { encoding: 'buffer', maxBuffer: 4 * 1024 * 1024 })
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function lineCount(buffer) {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '')
  if (!text) return 0
  const count = text.split(/\r?\n/).length
  return /\r?\n$/.test(text) ? count - 1 : count
}

async function build() {
  const entries = []
  const firstByHash = new Map()

  for (const archiveEntry of listArchiveEntries()) {
    const { relative, outputPath } = safeRelativePath(archiveEntry)
    const buffer = bufferFor(archiveEntry)
    const hash = sha256(buffer)
    const title = titleFrom(relative)
    const collection = collectionFrom(relative)
    const duplicateOf = firstByHash.get(hash) || null
    if (!duplicateOf) firstByHash.set(hash, relative)

    if (!checkOnly) {
      await mkdir(dirname(outputPath), { recursive: true })
      await writeFile(outputPath, buffer)
    }

    entries.push({
      id: relative.replace(/\.txt$/, '').replaceAll('/', '--'),
      collection,
      title,
      path: `/content/classics/library/${relative}`,
      bytes: buffer.byteLength,
      lines: lineCount(buffer),
      sha256: hash,
      duplicateOf,
      sourceStatus: sourceStatus(title, collection),
    })
  }

  const manifest = {
    schemaVersion: 1,
    archive: 'Chinese-Classics-TXT.zip',
    archiveSha256: sha256(await readFile(archivePath)),
    usage: '内部原型；汇编来源与授权说明确认前不得公开分发',
    entryCount: entries.length,
    uniqueContentCount: new Set(entries.map(entry => entry.sha256)).size,
    entries,
  }

  if (checkOnly) {
    const current = JSON.parse(await readFile(manifestPath, 'utf8'))
    if (JSON.stringify(current) !== JSON.stringify(manifest)) throw new Error('Classics manifest is stale. Run pnpm build:classics.')
    for (const entry of entries) {
      const local = await readFile(resolve(projectRoot, entry.path.slice(1)))
      if (sha256(local) !== entry.sha256) throw new Error(`Classics file hash mismatch: ${entry.path}`)
    }
    console.log(`Classics library verified: ${entries.length} archive entries, ${manifest.uniqueContentCount} unique files.`)
    return
  }

  await mkdir(libraryRoot, { recursive: true })
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(`Classics library built: ${entries.length} archive entries, ${manifest.uniqueContentCount} unique files.`)
}

await build()
