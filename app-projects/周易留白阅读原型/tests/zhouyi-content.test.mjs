import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { parseZhouyi } from '../scripts/lib/parse-zhouyi.mjs'

test('用户提供的《周易》原文可分成完整的六十四卦', async () => {
  const source = await readFile(new URL('../content/classics/library/十三经/01_周易.txt', import.meta.url), 'utf8')
  const hexagrams = parseZhouyi(source)

  assert.equal(hexagrams.length, 64)
  assert.equal(hexagrams[0].name, '乾')
  assert.equal(hexagrams[60].name, '中孚')
  assert.match(hexagrams[60].judgment, /豚魚/)
  assert.equal(hexagrams[60].lines[1].label, '九二')
  assert.match(hexagrams[60].lines[1].text, /鳴鶴在陰/)
  assert.match(hexagrams[60].lines[1].image, /中心願/)
})
