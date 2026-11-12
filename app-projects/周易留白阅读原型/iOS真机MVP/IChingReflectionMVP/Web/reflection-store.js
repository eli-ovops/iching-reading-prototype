import { castHexagram } from './iching-core.js'

export const REFLECTION_SCHEMA_VERSION = 2
export const MAX_HISTORY_ENTRIES = 500
export const MAX_ARCHIVE_BYTES = 2 * 1024 * 1024

const ARCHIVE_KIND = 'iching-reflection-archive'
const LEGACY_SCHEMA_VERSION = 1
const VALID_TOPICS = new Set(['self', 'relationship', 'work', 'money', 'family', 'change'])
const VALID_LANGUAGES = new Set(['zh', 'en'])
const VALID_CASTING_METHODS = new Set(['manual', 'secure-random'])
const VALID_REVIEW_STATUSES = new Set(['none', 'scheduled', 'revisited'])

export function createReadingRecord(input, now = new Date()) {
  const createdAt = now.toISOString()
  return normalizeRecord({
    id: input.id || createID(),
    createdAt,
    updatedAt: createdAt,
    question: input.question || '',
    topic: input.topic || 'self',
    language: input.language || 'zh',
    castingMethod: input.castingMethod || 'secure-random',
    lineValues: input.lineValues,
    primary: input.primary,
    relating: input.relating,
    movingLines: input.movingLines,
    tags: [],
    review: { status: 'none', scheduledFor: null, note: '', updatedAt: null },
  })
}

export function normalizeRecord(value) {
  assertObject(value, '历史记录')
  const lineValues = requireArray(value.lineValues, '六爻').map((line, index) => requireInteger(line, `第 ${index + 1} 爻`))
  if (lineValues.length !== 6 || lineValues.some(line => ![6, 7, 8, 9].includes(line))) {
    throw new Error('历史记录必须包含 6 条合法爻值。')
  }

  const rawReview = value.review ?? { status: 'none', scheduledFor: null, note: '', updatedAt: null }
  assertObject(rawReview, '回看')
  const reviewStatus = requireEnum(rawReview.status ?? 'none', VALID_REVIEW_STATUSES, '回看状态')
  const topic = requireEnum(value.topic ?? 'self', VALID_TOPICS, '关注方向')
  const language = requireEnum(value.language ?? 'zh', VALID_LANGUAGES, '语言')
  const castingMethod = requireEnum(value.castingMethod ?? 'secure-random', VALID_CASTING_METHODS, '起卦方式')
  const tags = value.tags == null ? [] : requireArray(value.tags, '标签')
  const movingLines = value.movingLines == null ? null : requireArray(value.movingLines, '变爻')
  const canonical = canonicalCast(lineValues)

  // Imported derived fields are never authoritative. They must either match the
  // six source lines exactly, or be absent so a legacy export can be repaired.
  assertOptionalHexagramMatches(value.primary, canonical.primary, '本卦')
  assertOptionalHexagramMatches(value.relating, canonical.relating, '之卦')
  if (movingLines != null) {
    const suppliedMovingLines = movingLines.map((line, index) => requireInteger(line, `第 ${index + 1} 个变爻`))
    if (new Set(suppliedMovingLines).size !== suppliedMovingLines.length || suppliedMovingLines.some(line => line < 1 || line > 6)) {
      throw new Error('变爻必须是不重复的 1 至 6 整数。')
    }
    if (!sameIntegerList(suppliedMovingLines, canonical.movingLines)) throw new Error('变爻与六爻推导结果不一致。')
  }

  return {
    id: requirePlainText(value.id || createID(), 120, '记录 ID'),
    createdAt: normalizeDate(value.createdAt, '创建时间'),
    updatedAt: normalizeDate(value.updatedAt || value.createdAt, '更新时间'),
    question: requirePlainText(value.question ?? '', 500, '问题', true),
    topic,
    language,
    castingMethod,
    lineValues,
    primary: canonical.primary,
    relating: canonical.relating,
    movingLines: canonical.movingLines,
    tags: [...new Set(tags.map((tag, index) => requirePlainText(tag, 32, `第 ${index + 1} 个标签`)).filter(Boolean))].slice(0, 12),
    review: {
      status: reviewStatus,
      scheduledFor: rawReview.scheduledFor ? normalizeDay(rawReview.scheduledFor) : null,
      note: requirePlainText(rawReview.note ?? '', 4000, '回看备注', true),
      updatedAt: rawReview.updatedAt ? normalizeDate(rawReview.updatedAt, '回看更新时间') : null,
    },
  }
}

export function normalizeArchive(payload) {
  assertObject(payload, '导入文件')
  const migrated = migrateArchive(payload)
  if (migrated.kind !== ARCHIVE_KIND) throw new Error('导入文件类型无效。')
  const records = requireArray(migrated.records, 'records')
  if (records.length > MAX_HISTORY_ENTRIES) throw new Error(`单次最多导入 ${MAX_HISTORY_ENTRIES} 条记录。`)
  const normalizedRecords = records.map(normalizeRecord)
  if (new Set(normalizedRecords.map(record => record.id)).size !== normalizedRecords.length) {
    throw new Error('导入文件含重复记录 ID。')
  }
  return {
    kind: ARCHIVE_KIND,
    schemaVersion: REFLECTION_SCHEMA_VERSION,
    exportedAt: normalizeDate(migrated.exportedAt || new Date().toISOString(), '导出时间'),
    records: normalizedRecords,
  }
}

export class ReflectionRepository {
  constructor(storage, key = 'iching-reflection-history-v2') {
    this.storage = storage
    this.key = key
    this.legacyKey = 'iching-reflection-history-v1'
    this.quarantineKey = 'iching-reflection-history-quarantine-v1'
    this.lastWarning = ''
  }

  list() {
    const currentRaw = this.storage?.getItem(this.key)
    const legacyRaw = currentRaw ? null : this.storage?.getItem(this.legacyKey)
    const raw = currentRaw || legacyRaw
    if (!raw) return []
    try {
      const archive = normalizeArchive(JSON.parse(raw))
      if (legacyRaw) this.save(archive.records)
      this.lastWarning = ''
      return archive.records.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    } catch (error) {
      this.quarantine(raw, error)
      return []
    }
  }

  add(record) {
    const normalized = normalizeRecord(record)
    const records = [normalized, ...this.list().filter(item => item.id !== normalized.id)]
    const result = this.save(records)
    if (result.pruned) this.lastWarning = `本机容量上限已移除最旧的 ${result.pruned} 条记录。`
    return normalized
  }

  update(id, changes) {
    const records = this.list()
    const index = records.findIndex(item => item.id === id)
    if (index < 0) throw new Error('找不到要更新的历史记录。')
    records[index] = normalizeRecord({ ...records[index], ...changes, id, updatedAt: new Date().toISOString() })
    this.save(records)
    return records[index]
  }

  remove(id) {
    const records = this.list()
    const next = records.filter(item => item.id !== id)
    if (next.length === records.length) return false
    this.save(next)
    return true
  }

  exportArchive() {
    return {
      kind: ARCHIVE_KIND,
      schemaVersion: REFLECTION_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      privacy: 'User-initiated plaintext local export. May contain private questions and notes.',
      records: this.list(),
    }
  }

  importArchive(payload) {
    const incoming = normalizeArchive(payload).records
    const byID = new Map(this.list().map(record => [record.id, record]))
    incoming.forEach(record => byID.set(record.id, record))
    const merged = [...byID.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const result = this.save(merged)
    return { imported: incoming.length, total: result.total, pruned: result.pruned }
  }

  save(records) {
    let normalized = records.map(normalizeRecord).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const initialCount = normalized.length
    normalized = normalized.slice(0, MAX_HISTORY_ENTRIES)
    let payload = archiveFor(normalized)
    while (normalized.length && byteLength(JSON.stringify(payload)) > MAX_ARCHIVE_BYTES) {
      normalized.pop()
      payload = archiveFor(normalized)
    }
    if (byteLength(JSON.stringify(payload)) > MAX_ARCHIVE_BYTES) throw new Error('历史存储超过本机容量上限。')
    this.storage?.setItem(this.key, JSON.stringify(payload))
    return { total: normalized.length, pruned: initialCount - normalized.length }
  }

  quarantine(raw, error) {
    this.lastWarning = '检测到无法读取的历史数据，已隔离且未导入。可通过 JSON 备份恢复有效记录。'
    const record = {
      quarantinedAt: new Date().toISOString(),
      reason: String(error?.message || 'Invalid local history').slice(0, 300),
      raw: String(raw).slice(0, MAX_ARCHIVE_BYTES),
    }
    try {
      this.storage?.setItem(this.quarantineKey, JSON.stringify(record))
    } catch {
      this.lastWarning = '检测到无法读取的历史数据；本机隔离区容量不足，原数据仍未被导入。'
    }
  }
}

function migrateArchive(payload) {
  const version = requireInteger(payload.schemaVersion, '数据版本')
  if (version === LEGACY_SCHEMA_VERSION) {
    return {
      ...payload,
      kind: ARCHIVE_KIND,
      schemaVersion: REFLECTION_SCHEMA_VERSION,
      records: requireArray(payload.records, 'records').map(record => ({
        ...record,
        castingMethod: record?.castingMethod === 'random' ? 'secure-random' : record?.castingMethod,
      })),
    }
  }
  if (version !== REFLECTION_SCHEMA_VERSION) throw new Error(`不支持的数据版本：${payload.schemaVersion ?? '未标注'}。`)
  return payload
}

function archiveFor(records) {
  return { kind: ARCHIVE_KIND, schemaVersion: REFLECTION_SCHEMA_VERSION, exportedAt: new Date().toISOString(), records }
}

function normalizeHexagram(value, label) {
  assertObject(value, label)
  const number = requireInteger(value.number, `${label}编号`)
  if (number < 1 || number > 64) throw new Error(`${label}编号无效。`)
  return {
    number,
    name: requirePlainText(value.name, 24, `${label}名称`),
    symbol: requirePlainText(value.symbol, 8, `${label}卦符`),
  }
}

function canonicalCast(lineValues) {
  const cast = castHexagram(lineValues)
  return {
    primary: { number: cast.primary.number, name: cast.primary.name, symbol: cast.primary.symbol },
    relating: { number: cast.relating.number, name: cast.relating.name, symbol: cast.relating.symbol },
    movingLines: cast.movingLines,
  }
}

function assertOptionalHexagramMatches(value, canonical, label) {
  if (value == null) return
  const supplied = normalizeHexagram(value, label)
  if (supplied.number !== canonical.number || supplied.name !== canonical.name || supplied.symbol !== canonical.symbol) {
    throw new Error(`${label}与六爻推导结果不一致。`)
  }
}

function sameIntegerList(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function normalizeDate(value, label) {
  if (typeof value !== 'string') throw new Error(`${label}必须是 ISO 日期字符串。`)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`${label}无效。`)
  return date.toISOString()
}

function normalizeDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('回看日期格式无效。')
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error('回看日期不存在。')
  return value
}

function requirePlainText(value, maxLength, label, allowEmpty = false) {
  if (typeof value !== 'string') throw new Error(`${label}必须是文本。`)
  if (/[<>]/.test(value)) throw new Error(`${label}不得包含 HTML 标记。`)
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) throw new Error(`${label}包含非法控制字符。`)
  const cleaned = value.trim()
  if (!allowEmpty && !cleaned) throw new Error(`${label}不得为空。`)
  if ([...cleaned].length > maxLength) throw new Error(`${label}超过 ${maxLength} 字符。`)
  return cleaned
}

function requireEnum(value, allowed, label) {
  if (typeof value !== 'string' || !allowed.has(value)) throw new Error(`${label}无效。`)
  return value
}

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label}必须是列表。`)
  return value
}

function requireInteger(value, label) {
  if (typeof value !== 'number' || !Number.isInteger(value)) throw new Error(`${label}必须是整数。`)
  return value
}

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}必须是对象。`)
}

function byteLength(value) {
  return new TextEncoder().encode(value).byteLength
}

function createID() {
  if (!globalThis.crypto?.randomUUID) throw new Error('设备安全随机源不可用，无法创建历史记录。')
  return globalThis.crypto.randomUUID()
}
