import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseZhouyi } from './lib/parse-zhouyi.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = resolve(projectRoot, 'content/classics/library/十三经/01_周易.txt')
const outputPath = resolve(projectRoot, 'content/iching/hexagrams.json')
const checkOnly = process.argv.includes('--check')

const source = await readFile(sourcePath, 'utf8')
const hexagrams = parseZhouyi(source)

if (hexagrams.length !== 64 || hexagrams.some(item => item.lines.length < 6)) {
  throw new Error('《周易》内容解析不完整：必须得到 64 卦且每卦至少 6 爻。')
}

const payload = `${JSON.stringify({
  generatedFrom: '/content/classics/library/十三经/01_周易.txt',
  entryCount: hexagrams.length,
  hexagrams,
}, null, 2)}\n`

if (checkOnly) {
  const current = await readFile(outputPath, 'utf8')
  if (current !== payload) throw new Error('六十四卦内容数据已与当前《周易》原文不同步。')
} else {
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, payload)
  console.log(`已生成 ${hexagrams.length} 卦：${outputPath}`)
}
