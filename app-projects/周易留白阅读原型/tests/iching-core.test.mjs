import test from 'node:test'
import assert from 'node:assert/strict'

import {
  castHexagram,
  coinFacesToLineValue,
  lineLabel,
  secureRandomUnit,
  tossCoinFaces,
} from '../iching-core.js'

test('六次投币从初爻到上爻生成中孚九二之益', () => {
  const result = castHexagram([7, 9, 8, 8, 7, 7])

  assert.equal(result.primary.number, 61)
  assert.equal(result.primary.name, '中孚')
  assert.deepEqual(result.movingLines, [2])
  assert.equal(result.relating.number, 42)
  assert.equal(result.relating.name, '益')
})

test('六条老阳的本卦为乾，之卦为坤', () => {
  const result = castHexagram([9, 9, 9, 9, 9, 9])

  assert.equal(result.primary.number, 1)
  assert.equal(result.relating.number, 2)
  assert.deepEqual(result.movingLines, [1, 2, 3, 4, 5, 6])
})

test('完成态可从实际六爻取得对应卦符，不固定显示乾卦', () => {
  const result = castHexagram([6, 8, 9, 7, 8, 7])

  assert.equal(result.primary.number, 56)
  assert.equal(result.primary.name, '旅')
  assert.equal(result.primary.symbol, '䷷')
  assert.notEqual(result.primary.symbol, '䷀')
})

test('三枚硬币按正面三、反面二记数', () => {
  assert.equal(coinFacesToLineValue(['heads', 'heads', 'heads']), 9)
  assert.equal(coinFacesToLineValue(['tails', 'tails', 'tails']), 6)
  assert.equal(coinFacesToLineValue(['heads', 'tails', 'heads']), 8)
})

test('爻名依阴阳和爻位生成', () => {
  assert.equal(lineLabel(9, 1), '初九')
  assert.equal(lineLabel(8, 4), '六四')
  assert.equal(lineLabel(7, 6), '上九')
})

test('投币可注入可重现的随机源', () => {
  const values = [0.1, 0.9, 0.49]
  const faces = tossCoinFaces(() => values.shift())

  assert.deepEqual(faces, ['tails', 'heads', 'tails'])
})

test('默认投币始终只产生三枚合法字背', () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const faces = tossCoinFaces()
    assert.equal(faces.length, 3)
    assert.equal(faces.every(face => face === 'heads' || face === 'tails'), true)
  }
})

test('安全随机源不可用时 fail-closed，不回退 Math.random', { concurrency: false }, () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined })
  try {
    assert.throws(() => secureRandomUnit(), /已阻断/)
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor)
    else delete globalThis.crypto
  }
})

test('随机源越界时阻断，不产生偏置结果', () => {
  assert.throws(() => tossCoinFaces(() => 1), /\[0, 1\)/)
  assert.throws(() => tossCoinFaces(() => Number.NaN), /\[0, 1\)/)
})

test('三钱法四种爻值理论概率为 1:3:3:1', () => {
  const outcomes = []
  for (const a of ['heads', 'tails']) for (const b of ['heads', 'tails']) for (const c of ['heads', 'tails']) {
    outcomes.push(coinFacesToLineValue([a, b, c]))
  }
  assert.deepEqual(outcomes.reduce((counts, value) => ({ ...counts, [value]: (counts[value] || 0) + 1 }), {}), { 6: 1, 7: 3, 8: 3, 9: 1 })
})
