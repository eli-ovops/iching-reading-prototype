import test from 'node:test'
import assert from 'node:assert/strict'

import { buildReflectionQuestions, reflectionCoverage } from '../reflection-prompts.js'
import { HEXAGRAMS } from '../iching-core.js'

test('六十四卦和六个爻位都有开放式问题覆盖', () => {
  assert.deepEqual(reflectionCoverage(), { hexagrams: 64, topics: 6, linePositions: 6 })
  for (const hexagram of HEXAGRAMS) {
    const questions = buildReflectionQuestions({
      hexagramNumber: hexagram.number,
      hexagramName: hexagram.name,
      movingLines: [],
      topic: 'self',
    })
    assert.equal(questions.length, 3)
    assert.ok(questions.every(item => item.label && item.text.endsWith('？')))
  }
})

test('不同本卦产生不同的卦象问题', () => {
  const qian = buildReflectionQuestions({ hexagramNumber: 1, hexagramName: '乾', movingLines: [1], topic: 'relationship' })
  const kun = buildReflectionQuestions({ hexagramNumber: 2, hexagramName: '坤', movingLines: [1], topic: 'relationship' })

  assert.notEqual(qian[0].text, kun[0].text)
  assert.notEqual(qian[2].text, kun[2].text)
})

test('变爻位置改变第二条问题，关注方向改变第三条问题', () => {
  const base = { hexagramNumber: 61, hexagramName: '中孚', relatingName: '益' }
  const lineTwo = buildReflectionQuestions({ ...base, movingLines: [2], topic: 'relationship' })
  const lineFive = buildReflectionQuestions({ ...base, movingLines: [5], topic: 'relationship' })
  const work = buildReflectionQuestions({ ...base, movingLines: [2], topic: 'work' })

  assert.notEqual(lineTwo[1].text, lineFive[1].text)
  assert.notEqual(lineTwo[2].text, work[2].text)
})

test('同一卦象输入可复现且英语输出完整', () => {
  const input = { hexagramNumber: 24, hexagramName: 'Return', relatingName: 'Kun', movingLines: [1, 6], topic: 'change', language: 'en' }
  const first = buildReflectionQuestions(input)
  const second = buildReflectionQuestions(input)

  assert.deepEqual(first, second)
  assert.equal(first.length, 3)
  assert.ok(first.every(item => /[?]$/.test(item.text)))
})
