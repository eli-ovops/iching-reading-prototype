import test from 'node:test'
import assert from 'node:assert/strict'

import { soundscapeSpec } from '../soundscape.js'

test('声音系统默认静音且不依赖外部音频素材', () => {
  const spec = soundscapeSpec()
  assert.equal(spec.startsMuted, true)
  assert.equal(spec.externalAssets, false)
  assert.equal(spec.coinSound, 'three-layer-metallic-strike')
  assert.equal(spec.notes.length, 6)
  assert.ok(spec.notes.every((frequency, index, notes) => frequency > 0 && (index === 0 || frequency > notes[index - 1])))
})
