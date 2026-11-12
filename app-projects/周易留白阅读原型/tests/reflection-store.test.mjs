import test from 'node:test'
import assert from 'node:assert/strict'

import {
  MAX_ARCHIVE_BYTES,
  REFLECTION_SCHEMA_VERSION,
  ReflectionRepository,
  createReadingRecord,
  normalizeArchive,
} from '../reflection-store.js'

class MemoryStorage {
  values = new Map()
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { this.values.set(key, value) }
}

function sampleRecord(overrides = {}) {
  return createReadingRecord({
    id: 'sample-1',
    question: '这段关系中我尚未看见什么？',
    topic: 'relationship',
    language: 'zh',
    castingMethod: 'secure-random',
    lineValues: [7, 9, 8, 8, 7, 7],
    movingLines: [2],
    primary: { number: 61, name: '中孚', symbol: '䷼' },
    relating: { number: 42, name: '益', symbol: '䷩' },
    ...overrides,
  }, new Date('2026-08-07T08:00:00.000Z'))
}

function archive(records, overrides = {}) {
  return {
    kind: 'iching-reflection-archive',
    schemaVersion: REFLECTION_SCHEMA_VERSION,
    exportedAt: '2026-08-07T09:00:00.000Z',
    records,
    ...overrides,
  }
}

test('阅读完成后形成不要求当场书写的 v2 记录', () => {
  const record = sampleRecord()
  assert.equal(REFLECTION_SCHEMA_VERSION, 2)
  assert.equal(record.review.status, 'none')
  assert.equal(record.review.note, '')
  assert.equal(record.lineValues.length, 6)
})

test('v1 归档迁移到 v2 且不丢记录', () => {
  const migrated = normalizeArchive({ schemaVersion: 1, exportedAt: '2026-08-07T09:00:00.000Z', records: [{ ...sampleRecord(), castingMethod: 'random' }] })
  assert.equal(migrated.kind, 'iching-reflection-archive')
  assert.equal(migrated.schemaVersion, 2)
  assert.equal(migrated.records.length, 1)
  assert.equal(migrated.records[0].castingMethod, 'secure-random')
})

test('导入拒绝未知版本、错误归档类型、非法爻值和过量记录', () => {
  assert.throws(() => normalizeArchive({ schemaVersion: 99, records: [] }), /不支持/)
  assert.throws(() => normalizeArchive({ schemaVersion: 2, kind: 'other', records: [] }), /类型/)
  assert.throws(() => normalizeArchive(archive([{ ...sampleRecord(), lineValues: [7] }])), /6 条/)
  assert.throws(() => normalizeArchive(archive(Array(501).fill(sampleRecord()))), /最多导入/)
})

test('导入拒绝类型混淆、非法枚举、HTML 和重复 ID', () => {
  assert.throws(() => normalizeArchive(archive([{ ...sampleRecord(), question: 42 }])), /必须是文本/)
  assert.throws(() => normalizeArchive(archive([{ ...sampleRecord(), topic: 'fortune' }])), /关注方向无效/)
  assert.throws(() => normalizeArchive(archive([{ ...sampleRecord(), review: { ...sampleRecord().review, status: 'done' } }])), /回看状态无效/)
  assert.throws(() => normalizeArchive(archive([{ ...sampleRecord(), question: '<img src=x onerror=alert(1)>' }])), /HTML/)
  assert.throws(() => normalizeArchive(archive([sampleRecord(), sampleRecord()])), /重复记录 ID/)
})

test('导入拒绝不存在的回看日期', () => {
  assert.throws(() => normalizeArchive(archive([{ ...sampleRecord(), review: { ...sampleRecord().review, scheduledFor: '2026-02-30' } }])), /日期不存在/)
})

test('导入只在全量校验后按 id 合并，不清空现有历史', () => {
  const repository = new ReflectionRepository(new MemoryStorage())
  repository.add(sampleRecord())
  const second = sampleRecord({ id: 'sample-2' })
  const result = repository.importArchive(archive([second]))

  assert.deepEqual(result, { imported: 1, total: 2, pruned: 0 })
  assert.deepEqual(repository.list().map(item => item.id).sort(), ['sample-1', 'sample-2'])
})

test('导入由六爻唯一推导卦象，拒绝混合污染与越界变爻', () => {
  const record = sampleRecord()
  assert.throws(() => normalizeArchive(archive([{ ...record, movingLines: [99] }])), /变爻/)
  assert.throws(() => normalizeArchive(archive([{ ...record, primary: { number: 64, name: '乾', symbol: '䷿' } }])), /本卦与六爻/)
  assert.throws(() => normalizeArchive(archive([{ ...record, relating: { number: 1, name: '乾', symbol: '䷀' } }])), /之卦与六爻/)
})

test('缺失派生字段的旧记录由六爻重建为规范结果', () => {
  const imported = normalizeArchive(archive([{ ...sampleRecord(), primary: undefined, relating: undefined, movingLines: undefined }]))
  assert.deepEqual(imported.records[0].primary, { number: 61, name: '中孚', symbol: '䷼' })
  assert.deepEqual(imported.records[0].relating, { number: 42, name: '益', symbol: '䷩' })
  assert.deepEqual(imported.records[0].movingLines, [2])
})

test('坏的本机 JSON 进入隔离区且不被当成空白有效数据', () => {
  const storage = new MemoryStorage()
  storage.setItem('iching-reflection-history-v2', '{bad json')
  const repository = new ReflectionRepository(storage)

  assert.deepEqual(repository.list(), [])
  assert.match(repository.lastWarning, /隔离/)
  assert.match(storage.getItem('iching-reflection-history-quarantine-v1'), /bad json/)
})

test('保存按 500 条和 2 MiB 双上限裁掉最旧记录', () => {
  const repository = new ReflectionRepository(new MemoryStorage())
  const records = Array.from({ length: 500 }, (_, index) => ({
    ...sampleRecord({ id: `record-${index}`, question: `记录 ${index}` }),
    review: { status: 'revisited', scheduledFor: null, note: '甲'.repeat(4000), updatedAt: '2026-08-07T10:00:00.000Z' },
  }))
  const result = repository.save(records)
  const bytes = new TextEncoder().encode(JSON.stringify(repository.exportArchive())).byteLength

  assert.ok(result.pruned > 0)
  assert.ok(result.total <= 500)
  assert.ok(bytes <= MAX_ARCHIVE_BYTES + 300)
})

test('导出明确标注未加密明文隐私风险', () => {
  const repository = new ReflectionRepository(new MemoryStorage())
  repository.add(sampleRecord())
  const exported = repository.exportArchive()
  assert.equal(exported.kind, 'iching-reflection-archive')
  assert.match(exported.privacy, /plaintext/)
})

test('删除只影响指定记录', () => {
  const repository = new ReflectionRepository(new MemoryStorage())
  repository.add(sampleRecord())
  repository.add(sampleRecord({ id: 'sample-2' }))

  assert.equal(repository.remove('sample-1'), true)
  assert.deepEqual(repository.list().map(item => item.id), ['sample-2'])
})
