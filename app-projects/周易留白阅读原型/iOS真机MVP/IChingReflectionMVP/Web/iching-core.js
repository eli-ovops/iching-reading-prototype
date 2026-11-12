const HEXAGRAM_ROWS = [
  ['111111', '乾', 'qian', 'qian'], ['000000', '坤', 'kun', 'kun'],
  ['100010', '屯', 'kan', 'zhen'], ['010001', '蒙', 'gen', 'kan'],
  ['111010', '需', 'kan', 'qian'], ['010111', '讼', 'qian', 'kan'],
  ['010000', '师', 'kun', 'kan'], ['000010', '比', 'kan', 'kun'],
  ['111011', '小畜', 'xun', 'qian'], ['110111', '履', 'qian', 'dui'],
  ['111000', '泰', 'kun', 'qian'], ['000111', '否', 'qian', 'kun'],
  ['101111', '同人', 'qian', 'li'], ['111101', '大有', 'li', 'qian'],
  ['001000', '谦', 'kun', 'gen'], ['000100', '豫', 'zhen', 'kun'],
  ['100110', '随', 'dui', 'zhen'], ['011001', '蛊', 'gen', 'xun'],
  ['110000', '临', 'kun', 'dui'], ['000011', '观', 'xun', 'kun'],
  ['100101', '噬嗑', 'li', 'zhen'], ['101001', '贲', 'gen', 'li'],
  ['000001', '剥', 'gen', 'kun'], ['100000', '复', 'kun', 'zhen'],
  ['100111', '无妄', 'qian', 'zhen'], ['111001', '大畜', 'gen', 'qian'],
  ['100001', '颐', 'gen', 'zhen'], ['011110', '大过', 'dui', 'xun'],
  ['010010', '坎', 'kan', 'kan'], ['101101', '离', 'li', 'li'],
  ['001110', '咸', 'dui', 'gen'], ['011100', '恒', 'zhen', 'xun'],
  ['001111', '遁', 'qian', 'gen'], ['111100', '大壮', 'zhen', 'qian'],
  ['000101', '晋', 'li', 'kun'], ['101000', '明夷', 'kun', 'li'],
  ['101011', '家人', 'xun', 'li'], ['110101', '睽', 'li', 'dui'],
  ['001010', '蹇', 'kan', 'gen'], ['010100', '解', 'zhen', 'kan'],
  ['110001', '损', 'gen', 'dui'], ['100011', '益', 'xun', 'zhen'],
  ['111110', '夬', 'dui', 'qian'], ['011111', '姤', 'qian', 'xun'],
  ['000110', '萃', 'dui', 'kun'], ['011000', '升', 'kun', 'xun'],
  ['010110', '困', 'dui', 'kan'], ['011010', '井', 'kan', 'xun'],
  ['101110', '革', 'dui', 'li'], ['011101', '鼎', 'li', 'xun'],
  ['100100', '震', 'zhen', 'zhen'], ['001001', '艮', 'gen', 'gen'],
  ['001011', '渐', 'xun', 'gen'], ['110100', '归妹', 'zhen', 'dui'],
  ['101100', '丰', 'zhen', 'li'], ['001101', '旅', 'li', 'gen'],
  ['011011', '巽', 'xun', 'xun'], ['110110', '兑', 'dui', 'dui'],
  ['010011', '涣', 'xun', 'kan'], ['110010', '节', 'kan', 'dui'],
  ['110011', '中孚', 'xun', 'dui'], ['001100', '小过', 'zhen', 'gen'],
  ['101010', '既济', 'kan', 'li'], ['010101', '未济', 'li', 'kan'],
]

export const HEXAGRAMS = HEXAGRAM_ROWS.map(([pattern, name, upper, lower], index) => ({
  number: index + 1,
  name,
  symbol: String.fromCodePoint(0x4dc0 + index),
  pattern,
  upper,
  lower,
}))

const HEXAGRAM_BY_PATTERN = new Map(HEXAGRAMS.map(hexagram => [hexagram.pattern, hexagram]))

export function coinFacesToLineValue(faces) {
  if (!Array.isArray(faces) || faces.length !== 3 || faces.some(face => face !== 'heads' && face !== 'tails')) {
    throw new TypeError('需要三枚已标记正反面的硬币。')
  }
  return faces.reduce((sum, face) => sum + (face === 'heads' ? 3 : 2), 0)
}

export function secureRandomUnit() {
  const cryptography = globalThis.crypto
  if (!cryptography?.getRandomValues) {
    throw new Error('设备安全随机源不可用，数字起卦已阻断。请改用自掷录入。')
  }
  const value = new Uint32Array(1)
  cryptography.getRandomValues(value)
  return value[0] / 0x100000000
}

export function tossCoinFaces(random = secureRandomUnit) {
  return Array.from({ length: 3 }, () => {
    const value = random()
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('随机源必须返回 [0, 1) 区间内的数值。')
    return value < 0.5 ? 'tails' : 'heads'
  })
}

export function lineLabel(value, lineNumber) {
  if (![6, 7, 8, 9].includes(value) || !Number.isInteger(lineNumber) || lineNumber < 1 || lineNumber > 6) {
    throw new RangeError('爻值必须为 6、7、8、9，爻位必须为 1 至 6。')
  }
  const yinYang = value % 2 === 0 ? '六' : '九'
  if (lineNumber === 1) return `初${yinYang}`
  if (lineNumber === 6) return `上${yinYang}`
  return `${yinYang}${['', '', '二', '三', '四', '五'][lineNumber]}`
}

export function castHexagram(lineValues) {
  if (!Array.isArray(lineValues) || lineValues.length !== 6 || lineValues.some(value => ![6, 7, 8, 9].includes(value))) {
    throw new TypeError('起卦需要按初爻到上爻排列的六个爻值（6、7、8、9）。')
  }

  const primaryPattern = lineValues.map(value => value % 2 === 0 ? '0' : '1').join('')
  const relatingPattern = lineValues.map(value => {
    if (value === 6) return '1'
    if (value === 9) return '0'
    return value % 2 === 0 ? '0' : '1'
  }).join('')
  const movingLines = lineValues.flatMap((value, index) => value === 6 || value === 9 ? [index + 1] : [])
  const primary = HEXAGRAM_BY_PATTERN.get(primaryPattern)
  const relating = HEXAGRAM_BY_PATTERN.get(relatingPattern)

  if (!primary || !relating) throw new Error('六十四卦映射不完整。')

  return {
    lineValues: [...lineValues],
    movingLines,
    primary: { ...primary },
    relating: { ...relating },
  }
}
