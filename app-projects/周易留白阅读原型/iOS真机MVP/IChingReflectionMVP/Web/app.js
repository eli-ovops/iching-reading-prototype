import { castHexagram, coinFacesToLineValue, lineLabel, tossCoinFaces } from './iching-core.js'
import { buildReflectionQuestions } from './reflection-prompts.js'
import { ReflectionRepository, createReadingRecord } from './reflection-store.js'
import { playCoinChime, playPassageChime, startSoundscape, stopSoundscape } from './soundscape.js'

// PROTOTYPE — 四种结果体验，可通过 ?variant=A|B|C|D 切换。
// 验证问题：不要求用户写下理解，阅读本身能否引发思考？

const variants = {
  A: '典藏',
  B: '回声',
  C: '门槛',
  D: '余响',
}

const topics = {
  relationship: {
    label: '感情与关系',
    placeholder: '这段关系里，有什么是我尚未看清的？',
  },
  work: {
    label: '事业与创造',
    placeholder: '关于工作或创造，我尚未看清什么？',
  },
  money: {
    label: '金钱与资源',
    placeholder: '关于资源与取舍，我尚未看清什么？',
  },
  family: {
    label: '家庭与亲情',
    placeholder: '在家人与亲情之间，我尚未看清什么？',
  },
  change: {
    label: '选择与变化',
    placeholder: '面对这个变化，我尚未看清什么？',
  },
  self: {
    label: '自我与内心',
    placeholder: '关于自己，我尚未看清什么？',
  },
}

const topicDisplayOrder = ['relationship', 'work', 'money', 'family', 'change', 'self']

const classicResonances = {
  relationship: {
    original: '己所不欲，勿施於人。',
    source: '《論語》· 顏淵篇第十二',
    path: '/content/classics/library/十三经/10_论语.txt',
  },
  work: {
    original: '功崇惟志，業廣惟勤。',
    source: '《尚書》· 周官',
    path: '/content/classics/library/十三经/02_尚书.txt',
  },
  money: {
    original: '言悖而出者，亦悖而入；貨悖而入者，亦悖而出。',
    source: '《大學》',
    path: '/content/classics/library/四书/大学.txt',
  },
  family: {
    original: '夫孝，德之本也，教之所由生也。',
    source: '《孝經》· 開宗明義章',
    path: '/content/classics/library/十三经/11_孝经.txt',
  },
  change: {
    original: '窮則變，變則通，通則久。',
    source: '《周易》· 繫辭下',
    path: '/content/classics/library/十三经/01_周易.txt',
  },
  self: {
    original: '莫見乎隱，莫顯乎微。故君子慎其獨也。',
    source: '《中庸》',
    path: '/content/classics/library/四书/中庸.txt',
  },
}

// Removed legacy flow constants; no birth-based feature is part of this product.
const trigrams = {
  qian: { symbol: '☰', name: '乾', image: '天', lines: ['yang', 'yang', 'yang'] },
  xun: { symbol: '☴', name: '巽', image: '风', lines: ['yang', 'yang', 'broken'] },
  kan: { symbol: '☵', name: '坎', image: '水', lines: ['broken', 'yang', 'broken'] },
  gen: { symbol: '☶', name: '艮', image: '山', lines: ['yang', 'broken', 'broken'] },
  kun: { symbol: '☷', name: '坤', image: '地', lines: ['broken', 'broken', 'broken'] },
  zhen: { symbol: '☳', name: '震', image: '雷', lines: ['broken', 'broken', 'yang'] },
  li: { symbol: '☲', name: '离', image: '火', lines: ['yang', 'broken', 'yang'] },
  dui: { symbol: '☱', name: '兑', image: '泽', lines: ['broken', 'yang', 'yang'] },
}

const englishTrigrams = {
  乾: 'Qian · Heaven', 巽: 'Xun · Wind', 坎: 'Kan · Water', 艮: 'Gen · Mountain',
  坤: 'Kun · Earth', 震: 'Zhen · Thunder', 离: 'Li · Fire', 兑: 'Dui · Lake',
}

const englishImages = {
  天: 'Heaven', 风: 'Wind', 水: 'Water', 山: 'Mountain',
  地: 'Earth', 雷: 'Thunder', 火: 'Fire', 泽: 'Lake',
}

const englishHexagramNames = new Map([
  ['乾', 'Qian · The Creative'], ['坤', 'Kun · The Receptive'], ['屯', 'Zhun · Difficulty at the Beginning'],
  ['蒙', 'Meng · Youthful Folly'], ['需', 'Xu · Waiting'], ['讼', 'Song · Conflict'], ['師', 'Shi · The Army'], ['师', 'Shi · The Army'],
  ['比', 'Bi · Holding Together'], ['小畜', 'Xiao Chu · Small Taming'], ['履', 'Lu · Treading'], ['泰', 'Tai · Peace'],
  ['否', 'Pi · Standstill'], ['同人', 'Tong Ren · Fellowship'], ['大有', 'Da You · Great Possession'], ['谦', 'Qian · Modesty'],
  ['謙', 'Qian · Modesty'], ['豫', 'Yu · Enthusiasm'], ['随', 'Sui · Following'], ['隨', 'Sui · Following'], ['蛊', 'Gu · Work on Decay'],
  ['蠱', 'Gu · Work on Decay'], ['临', 'Lin · Approach'], ['臨', 'Lin · Approach'], ['观', 'Guan · Contemplation'], ['觀', 'Guan · Contemplation'],
  ['噬嗑', 'Shi He · Biting Through'], ['贲', 'Bi · Grace'], ['賁', 'Bi · Grace'], ['剥', 'Bo · Splitting Apart'], ['剝', 'Bo · Splitting Apart'],
  ['复', 'Fu · Return'], ['復', 'Fu · Return'], ['无妄', 'Wu Wang · Innocence'], ['無妄', 'Wu Wang · Innocence'],
  ['大畜', 'Da Chu · Great Taming'], ['颐', 'Yi · Nourishment'], ['頤', 'Yi · Nourishment'], ['大过', 'Da Guo · Great Exceeding'],
  ['大過', 'Da Guo · Great Exceeding'], ['坎', 'Kan · The Abysmal Water'], ['离', 'Li · Clinging Fire'], ['離', 'Li · Clinging Fire'],
  ['咸', 'Xian · Influence'], ['恒', 'Heng · Duration'], ['恆', 'Heng · Duration'], ['遁', 'Dun · Retreat'],
  ['大壮', 'Da Zhuang · Great Power'], ['大壯', 'Da Zhuang · Great Power'], ['晋', 'Jin · Progress'], ['晉', 'Jin · Progress'],
  ['明夷', 'Ming Yi · Darkening of the Light'], ['家人', 'Jia Ren · The Family'], ['睽', 'Kui · Opposition'],
  ['蹇', 'Jian · Obstruction'], ['解', 'Xie · Deliverance'], ['损', 'Sun · Decrease'], ['損', 'Sun · Decrease'],
  ['益', 'Yi · Increase'], ['夬', 'Guai · Breakthrough'], ['姤', 'Gou · Coming to Meet'], ['萃', 'Cui · Gathering'],
  ['升', 'Sheng · Pushing Upward'], ['困', 'Kun · Oppression'], ['井', 'Jing · The Well'], ['革', 'Ge · Revolution'],
  ['鼎', 'Ding · The Cauldron'], ['震', 'Zhen · Arousing Thunder'], ['艮', 'Gen · Keeping Still'], ['渐', 'Jian · Development'],
  ['漸', 'Jian · Development'], ['归妹', 'Gui Mei · The Marrying Maiden'], ['歸妹', 'Gui Mei · The Marrying Maiden'],
  ['丰', 'Feng · Abundance'], ['豐', 'Feng · Abundance'], ['旅', 'Lu · The Wanderer'], ['巽', 'Xun · Gentle Wind'],
  ['兑', 'Dui · Joyous Lake'], ['兌', 'Dui · Joyous Lake'], ['涣', 'Huan · Dispersion'], ['渙', 'Huan · Dispersion'],
  ['节', 'Jie · Limitation'], ['節', 'Jie · Limitation'], ['中孚', 'Zhong Fu · Inner Truth'],
  ['小过', 'Xiao Guo · Small Exceeding'], ['小過', 'Xiao Guo · Small Exceeding'], ['既济', 'Ji Ji · After Completion'],
  ['既濟', 'Ji Ji · After Completion'], ['未济', 'Wei Ji · Before Completion'], ['未濟', 'Wei Ji · Before Completion'],
])

const earlierHeavenOrder = ['qian', 'xun', 'kan', 'gen', 'kun', 'zhen', 'li', 'dui']

let reading = {
  number: '61',
  name: '中孚',
  plainName: '内在的真实',
  upper: 'xun',
  lower: 'dui',
  movingLine: 2,
  line: '九二',
  source: '《周易》· 中孚第六十一 · 九二',
  judgment: '中孚：豚魚，吉。利涉大川，利貞。',
  judgmentPlain: '以诚信相感，即使微小如豚鱼也可获吉；有利于渡过大川，也有利于守持正固。',
  image: '澤上有風，中孚。君子以議獄緩死。',
  imagePlain: '风行泽上，内外相感。君子由此审慎议狱，延缓死刑。',
  original: '鳴鶴在陰，其子和之。\n我有好爵，吾與爾靡之。',
  plainTranslation: '鹤在树荫下鸣叫，它的幼鹤随声相和。\n我有一杯好酒，愿与你一同分享。',
  lineImage: '象曰：其子和之，中心願也。',
  lineImagePlain: '之所以彼此应和，是因为内心真正愿意回应。',
  resulting: {
    number: '42',
    name: '益',
    plainName: '增益',
    upper: 'xun',
    lower: 'zhen',
    judgment: '益：利有攸往，利涉大川。',
    judgmentPlain: '有所前往是有利的，也适宜渡过大川。',
  },
  note: '现代中文译意，用于辅助理解原文。',
}

const initialParams = new URLSearchParams(window.location.search)

const englishTranslations = new Map([
  ['一念既起 · 六爻未成', 'A thought stirs · six lines await'],
  ['所问之事，先藏于心。', 'Keep your question within, for now.'],
  ['所问之事，', 'Keep your question'],
  ['先藏于心。', 'within, for now.'],
  ['从哪里进入这段阅读？', 'Choose how you want to begin.'],
  ['择一处起念。三钱六掷，自下而上，待一卦显形。', 'Choose where the thought begins. Cast three cash coins six times, and let the hexagram take shape from below.'],
  ['问一件事', 'Ask a question'],
  ['此念落在何处', 'Where does this thought rest?'],
  ['上下拖动', 'Drag vertically'],
  ['上下拖动或滑动选择关注方向', 'Drag or swipe vertically to choose a direction'],
  ['感情与关系', 'Love & relationships'],
  ['事业与创造', 'Work & creativity'],
  ['金钱与资源', 'Money & resources'],
  ['家庭与亲情', 'Family'],
  ['选择与变化', 'Choice & change'],
  ['自我与内心', 'Self & inner life'],
  ['若愿，可留一言', 'Leave a few words, if you wish'],
  ['也可不写', 'Or leave it unwritten'],
  ['起这一卦', 'Cast this hexagram'],
  ['← 回到问题', '← Back to the question'],
  ['起卦 · 由下而上', 'Casting · bottom to top'],
  ['三钱一掷，六掷成卦。', 'Three coins per throw. Six throws form a hexagram.'],
  ['三枚铜钱同时抛出一次，得到一爻；共抛六次，由初爻至上爻。', 'Toss three cash coins together to form one line. Repeat six times, from the first line at the bottom to the top line.'],
  ['六爻自下而上生成', 'Six lines formed from bottom to top'],
  ['起卦方式', 'Casting method'],
  ['自掷录入', 'Record your own toss'],
  ['三钱投掷', 'Three-coin toss'],
  ['你在现实中抛出三枚铜钱，再照实际字背逐枚录入；App 不代替你随机。', 'Toss three real cash coins, then record each inscribed or plain side here; the app does not randomize this method for you.'],
  ['数字投掷由设备安全随机生成，不随所问或方向改变。点击铜钱，落定后自动记下这一爻。', 'The digital toss uses the device’s secure random source; your question and chosen topic do not alter it. Tap the coins to form and record this line.'],
  ['铜钱正在落定……', 'The coins are settling…'],
  ['铜钱正在落定', 'The coins are settling'],
  ['落定中', 'Settling'],
  ['卦象正在显形', 'The hexagram is taking shape'],
  ['六爻已成。', 'The six lines are complete.'],
  ['六条爻线已经填满。现在展开本卦、变爻与之卦。', 'All six lines are complete. Now reveal the primary hexagram, moving lines, and relating hexagram.'],
  ['展开这一卦', 'Reveal this hexagram'],
  ['本次三枚铜钱', 'The three cash coins for this throw'],
  ['字面', 'Inscribed'],
  ['背面', 'Plain'],
  ['待定', 'Unset'],
  ['点击翻面', 'Tap to turn'],
  ['点击', 'Tap'],
  ['待投', 'Waiting'],
  ['初爻', 'First line'],
  ['上爻', 'Top line'],
  ['撤回上一爻', 'Undo last line'],
  ['重新起卦', 'Start over'],
  ['六爻皆静', 'No moving lines'],
  ['六爻皆静，本次没有之卦。', 'All six lines are still; this reading has no relating hexagram.'],
  ['典籍库', 'Classics library'],
  ['十三经 · 四书 · 原文按需阅读', 'Thirteen Classics · Four Books · original texts'],
  ['← 离开余响', '← Leave the reading'],
  ['先看见它的结构。', 'First, notice its structure.'],
  ['六爻自下而上，上巽☴、下兑☱；金点标出第二爻九二。', 'Six lines rise from the bottom: Xun ☴ above, Dui ☱ below. The gold point marks the moving second line.'],
  ['上卦', 'Upper trigram'],
  ['下卦', 'Lower trigram'],
  ['风行泽上', 'Wind over the lake'],
  ['卦辞', 'Judgment'],
  ['大象', 'Image'],
  ['爻辞', 'Line text'],
  ['小象', 'Line image'],
  ['之卦', 'Relating hexagram'],
  ['结构', 'Structure'],
  ['内容仍在展开。', 'The reading is still unfolding.'],
  ['听见下一段', 'Reveal the next passage'],
  ['回看上一段', 'Return to the previous passage'],
  ['让它保持未解', 'Leave it unresolved'],
  ['本次变爻对应的另一卦象，不代表确定未来。', 'The moving line points to another hexagram; it does not determine the future.'],
  ['它们随本卦、变爻与所问而来，不替你作答。', 'They arise from the hexagram, its moving lines, and your question—without answering for you.'],
  ['同题旁证 · 不是卦辞', 'A related classic · not part of the hexagram'],
  ['在典籍库中查看原文', 'Read the source in the classics library'],
  ['现代中文译意', 'Modern interpretation'],
  ['这里不作结论。', 'No conclusion is imposed here.'],
  ['让它停在这里', 'Let it rest here'],
  ['← 回到门外', '← Return to the threshold'],
  ['卦序', 'Number'],
  ['卦名', 'Name'],
  ['所见之爻', 'Moving line'],
  ['一段文字浮现', 'A passage appears'],
  ['← 回到阅读之前', '← Return to before the reading'],
  ['阅读进度', 'Reading progress'],
  ['继续', 'Continue'],
  ['文字到这里结束', 'The words end here'],
  ['余意仍未结束。', 'What they leave behind does not.'],
  ['有一种呼唤，', 'A call arrives,'],
  ['来自尚不可见之处。', 'from what cannot yet be seen.'],
  ['鹤在树荫下鸣叫。', 'A crane calls from the shade.'],
  ['它的幼鹤随声相和。', 'Its young answers in harmony.'],
  ['我有一杯好酒。', 'I have a cup of fine wine.'],
  ['愿与你一同分享。', 'I would share it with you.'],
  ['鹤在树荫下鸣叫，它的幼鹤随声相和。', 'A crane calls from the shade; its young answers in harmony.'],
  ['我有一杯好酒，愿与你一同分享。', 'I have a cup of fine wine, and I would share it with you.'],
  ['以诚信相感，即使微小如豚鱼也可获吉；有利于渡过大川，也有利于守持正固。', 'Sincerity creates response, even in humble things. It favors crossing the great river and remaining steadfast.'],
  ['风行泽上，内外相感。君子由此审慎议狱，延缓死刑。', 'Wind moves over the lake and inner and outer answer one another. The noble person judges with care and delays the final sentence.'],
  ['之所以彼此应和，是因为内心真正愿意回应。', 'They answer one another because the willingness is genuine.'],
  ['有所前往是有利的，也适宜渡过大川。', 'It is favorable to have somewhere to go, and favorable to cross the great river.'],
  ['← 回到阅读', '← Back to the reading'],
  ['← 返回典籍目录', '← Back to the library'],
  ['原始文本 · 按需读取', 'Original texts · loaded on demand'],
  ['按书名或分类筛选', 'Filter by title or collection'],
  ['正在核对典籍清单……', 'Checking the library…'],
  ['正在展开原文……', 'Opening the original text…'],
  ['没有符合筛选条件的典籍。', 'No classics match this filter.'],
  ['重复条目', 'Duplicate entry'],
  ['内部原型使用。汇编来源与授权说明确认前，不作为可公开分发内容库。', 'For internal prototyping only. This collection is not for public distribution until its sources and permissions are confirmed.'],
  ['太极八卦图，先天八卦方位', 'Taiji and Earlier-Heaven Bagua'],
  ['典藏', 'Archive'], ['回声', 'Echoes'], ['门槛', 'Threshold'], ['余响', 'Resonance'],
  ['中文', 'Chinese'], ['英文', 'English'],
  ['内在的真实', 'Inner truth'], ['九二', 'Nine at the second'],
  ['《周易》· 中孚第六十一 · 九二', 'Zhouyi · Hexagram 61, Zhong Fu · Nine at the second'],
  ['现代中文译意，用于辅助理解原文。', 'Modern Chinese interpretation supplied only as a reading aid.'],
  ['← 离开这间静室', '← Leave this quiet room'], ['什么也不带走', 'Leave without taking anything'],
  ['回到问题', 'Back to the question'],
  ['完整保留压缩包的 18 个条目；其中 16 份内容不重复。原文不会在首页一次性加载。', 'All 18 archive entries are preserved; 16 contain unique text. Original texts load only when opened.'],
  ['古典原文；汇编来源与版本待复核', 'Classical source text; compilation source and edition require verification'],
  ['文本内标注来源待确认', 'The source file itself marks its provenance as unconfirmed'],
  ['说明文件，不是传世原文', 'Explanatory file; not a transmitted classical text'],
  ['十三经', 'Thirteen Classics'], ['四书', 'Four Books'], ['六经', 'Six Classics'],
  ['周易', 'Zhouyi · Book of Changes'], ['尚书', 'Shangshu · Book of Documents'], ['诗经', 'Shijing · Book of Odes'],
  ['周礼', 'Zhouli · Rites of Zhou'], ['仪礼', 'Yili · Book of Etiquette and Ceremonial'], ['礼记', 'Liji · Book of Rites'],
  ['春秋左传', 'Zuo Commentary'], ['春秋公羊传', 'Gongyang Commentary'], ['春秋谷梁传', 'Guliang Commentary'],
  ['论语', 'Analects'], ['孝经', 'Classic of Filial Piety'], ['尔雅', 'Erya'], ['孟子', 'Mencius'],
  ['大学', 'Great Learning'], ['中庸', 'Doctrine of the Mean'], ['乐经_失传说明', 'Classic of Music · loss notice'],
])

const englishPlaceholders = new Map([
  ['有什么是我尚未看清的？', 'What might I not yet be seeing?'],
  ['这段关系里，有什么是我尚未看清的？', 'What might I not yet be seeing in this relationship?'],
  ['关于工作或创造，我尚未看清什么？', 'What might I not yet be seeing about my work or creative life?'],
  ['关于资源与取舍，我尚未看清什么？', 'What might I not yet be seeing about resources and trade-offs?'],
  ['在家人与亲情之间，我尚未看清什么？', 'What might I not yet be seeing within my family?'],
  ['面对这个变化，我尚未看清什么？', 'What might I not yet be seeing about this change?'],
  ['关于自己，我尚未看清什么？', 'What might I not yet be seeing about myself?'],
  ['例如：周易、四书、春秋', 'Try: Zhouyi, Four Books, Spring and Autumn'],
])

const savedPreferences = (() => {
  try { return JSON.parse(window.localStorage.getItem('iching.preferences.v1') || '{}') } catch { return {} }
})()

const state = {
  language: initialParams.get('lang') === 'en' ? 'en' : savedPreferences.language === 'en' ? 'en' : 'zh',
  soundEnabled: savedPreferences.soundEnabled === true,
  stage: initialParams.get('view') === 'reading' ? 'reading' : 'opening',
  topic: 'relationship',
  topicScrollTop: 0,
  question: '',
  castingMode: 'random',
  coinFaces: [null, null, null],
  castLines: [],
  lastCastFaces: [],
  pendingTossFaces: [],
  isTossing: false,
  tossToken: 0,
  ichingContent: null,
  ichingContentError: '',
  formError: '',
  thresholdStep: Math.min(Math.max(Number(initialParams.get('step') || 0), 0), 5),
  libraryReturnStage: 'opening',
  classicManifest: null,
  classicSearch: '',
  selectedClassicPath: '',
  classicText: '',
  classicLoading: false,
  classicError: '',
  historySearch: '',
  historyTagFilter: '',
  historyPeriodFilter: 'all',
  historyScrollTop: 0,
  selectedHistoryID: '',
  pendingDeleteID: '',
  pendingExportFormat: '',
  importMessage: '',
  settingsOpen: false,
  settingsReturnFocusSelector: '',
  entitlementLevel: 'free',
  exportReturnFocusSelector: '',
}

function persistPreferences() {
  try {
    window.localStorage.setItem('iching.preferences.v1', JSON.stringify({
      language: state.language,
      soundEnabled: state.soundEnabled,
    }))
  } catch {
    // Preferences remain usable for this session when local storage is unavailable.
  }
}

const app = document.querySelector('#app')
const historyRepository = new ReflectionRepository(window.localStorage)
let lastRenderedStage = state.stage
let castingReturnFocusSelector = '[data-action="enter"]'

const FREE_RECENT_HISTORY_LIMIT = 5
const premiumFeatures = new Set(['fullHistory', 'backupExport'])

function canAccess(feature) {
  if (!premiumFeatures.has(feature)) return true
  return state.entitlementLevel === 'lifetime' || state.entitlementLevel === 'subscription'
}

function setEntitlementLevel(level) {
  state.entitlementLevel = ['free', 'lifetime', 'subscription'].includes(level) ? level : 'free'
  render()
  return state.entitlementLevel
}

// The native shell invokes this after verified entitlement refreshes. Browser
// callers cannot create a StoreKit entitlement: they only exercise the same UI
// state for local accessibility and regression testing.
window.__ichingSetEntitlementLevel = setEntitlementLevel

function focusSelectorFor(element) {
  if (!(element instanceof HTMLElement) || !element.dataset.action) return ''
  const parts = [`[data-action="${CSS.escape(element.dataset.action)}"]`]
  for (const key of ['value', 'index', 'path']) {
    if (element.dataset[key] != null) parts.push(`[data-${key}="${CSS.escape(element.dataset[key])}"]`)
  }
  return parts.join('')
}

function focusAfterRender(previousStage, previousFocusSelector) {
  requestAnimationFrame(() => {
    if (state.stage === 'casting') {
      const dialog = app.querySelector('.casting-dialog')
      if (!dialog) return
      const preferred = previousStage === 'casting' && previousFocusSelector
        ? dialog.querySelector(previousFocusSelector)
        : dialog.querySelector('.casting-close')
      const fallback = dialog.querySelector('button:not([disabled])')
      ;(preferred instanceof HTMLElement && !preferred.hasAttribute('disabled') ? preferred : fallback)?.focus()
      return
    }

    if (previousStage === 'casting') {
      const target = state.stage === 'opening'
        ? app.querySelector(castingReturnFocusSelector)
        : app.querySelector('[data-action="continue"]') || app.querySelector('[data-action="leave"]')
      if (target instanceof HTMLElement) target.focus()
    }
  })
}

function currentVariant() {
  const value = new URLSearchParams(window.location.search).get('variant')?.toUpperCase()
  return variants[value] ? value : 'D'
}

function currentVisualStyle() {
  const value = new URLSearchParams(window.location.search).get('style')?.toLowerCase()
  return ['ink', 'archive', 'bronze'].includes(value) ? value : 'bronze'
}

function setVariant(key) {
  const url = new URL(window.location.href)
  url.searchParams.set('variant', key)
  window.history.replaceState({}, '', url)
  render()
}

function cycleVariant(direction) {
  const keys = Object.keys(variants)
  const currentIndex = keys.indexOf(currentVariant())
  setVariant(keys[(currentIndex + direction + keys.length) % keys.length])
}

function lineMarkup(type, isMoving = false, lineNumber = null) {
  const movingClass = isMoving ? ' is-moving' : ''
  const ariaLabel = lineNumber ? ` aria-label="自下而上第${lineNumber}爻${isMoving ? '，变爻' : ''}"` : ''
  const motionAttrs = lineNumber
    ? ` data-line="${lineNumber}" style="--cast-delay: ${80 + (lineNumber - 1) * 90}ms; --change-delay: ${120 + (lineNumber - 1) * 70}ms"`
    : ''
  return type === 'yang'
    ? `<span class="hex-line yang${movingClass}"${ariaLabel}${motionAttrs}></span>`
    : `<span class="hex-line broken${movingClass}"${ariaLabel}${motionAttrs}><i></i><i></i></span>`
}

function trigramLinesMarkup(key, position, movingLines = []) {
  const trigram = trigrams[key]
  return `
    <div class="trigram-lines ${position}" aria-label="${position === 'upper' ? '上卦' : '下卦'}${trigram.name}，象为${trigram.image}">
      ${trigram.lines.map((line, index) => {
        const lineNumber = position === 'upper' ? 6 - index : 3 - index
        return lineMarkup(line, movingLines.includes(lineNumber), lineNumber)
      }).join('')}
    </div>
  `
}

function hexagramMarkup(hexagram = reading) {
  const movingLines = hexagram.movingLines || (hexagram.movingLine ? [hexagram.movingLine] : [])
  return `
    <div class="hexagram" aria-label="第${hexagram.number}卦，${hexagram.name}，上${trigrams[hexagram.upper].name}下${trigrams[hexagram.lower].name}">
      ${trigramLinesMarkup(hexagram.upper, 'upper', movingLines)}
      <span class="trigram-separator" aria-hidden="true"></span>
      ${trigramLinesMarkup(hexagram.lower, 'lower', movingLines)}
    </div>
  `
}

function trigramCardsMarkup() {
  const upper = trigrams[reading.upper]
  const lower = trigrams[reading.lower]
  return `
    <div class="trigram-cards" aria-label="${reading.name}的上下卦结构">
      <div><span>上卦</span><b>${upper.symbol}</b><strong>${upper.name}</strong><small>${upper.image}</small></div>
      <i>${upper.image}在${lower.image}上</i>
      <div><span>下卦</span><b>${lower.symbol}</b><strong>${lower.name}</strong><small>${lower.image}</small></div>
    </div>
  `
}

function baguaLegendMarkup() {
  return `
    <div class="bagua-legend" aria-label="先天八卦：乾天、巽风、坎水、艮山、坤地、震雷、离火、兑泽">
      ${earlierHeavenOrder.map(key => {
        const trigram = trigrams[key]
        return `<span><b aria-hidden="true">${trigram.symbol}</b><small>${trigram.name} · ${trigram.image}</small></span>`
      }).join('')}
    </div>
  `
}

function openingMarkup(variant) {
  return `
    <section class="opening opening-${variant.toLowerCase()} opening-question">
      <div class="opening-intro">
        <div class="opening-mark"><img src="assets/taiji-bagua.svg" alt="太极八卦图，先天八卦方位" /></div>
        ${baguaLegendMarkup()}
        <p class="eyebrow">一念既起 · 六爻未成</p>
        <h1>所问之事，<br />先藏于心。</h1>
        <p class="opening-copy">择一处起念。三钱六掷，自下而上，待一卦显形。</p>
      </div>
      <div class="opening-actions">
        ${questionEntryMarkup()}
      </div>
    </section>
  `
}

function questionEntryMarkup() {
  return `
    <div class="entry-panel">
      <fieldset class="topic-fieldset">
        <legend>此念落在何处</legend>
        <span class="topic-drag-hint" aria-hidden="true">上下拖动</span>
        <div class="topic-scroll-shell">
          <div class="topic-grid" aria-label="上下拖动或滑动选择关注方向">
            ${topicDisplayOrder.map(key => [key, topics[key]]).map(([key, topic]) => `
              <button type="button" data-action="set-topic" data-value="${key}" aria-pressed="${state.topic === key}">${topic.label}</button>
            `).join('')}
          </div>
        </div>
      </fieldset>
      <label class="question-field">
        <span>若愿，可留一言 <em>也可不写</em></span>
        <input id="question" type="text" value="${escapeHtml(state.question)}" placeholder="${topics[state.topic].placeholder}" autocomplete="off" />
      </label>
      <button class="primary-action" data-action="enter">起这一卦</button>
    </div>
  `
}

function castingLineLabel(lineNumber) {
  if (lineNumber === 1) return localized('初爻', 'First line from bottom')
  if (lineNumber === 6) return localized('上爻', 'Top line')
  return localized(`第${lineNumber}爻`, `Line ${lineNumber} from bottom`)
}

function castingValueLabel(value) {
  return {
    6: localized('老阴·变', 'Old yin · moving'),
    7: localized('少阳', 'Young yang'),
    8: localized('少阴', 'Young yin'),
    9: localized('老阳·变', 'Old yang · moving'),
  }[value] || localized('待投', 'Waiting')
}

function coinAccessibilityLabel(face, index) {
  const side = face === 'heads'
    ? localized('字面，记三', 'inscribed side, counts as three')
    : face === 'tails'
      ? localized('背面，记二', 'plain side, counts as two')
      : localized('未标记', 'not marked')
  return localized(`第${index + 1}枚铜钱，${side}`, `Cash coin ${index + 1}, ${side}`)
}

function castingLineStackMarkup() {
  return `
    <div class="casting-lines" aria-label="${localized('六爻自下而上生成', 'Six lines formed from bottom to top')}">
      ${[6, 5, 4, 3, 2, 1].map(lineNumber => {
        const value = state.castLines[lineNumber - 1]
        return `
          <div class="casting-line ${value ? 'is-filled' : ''}">
            <small>${castingLineLabel(lineNumber)}</small>
            ${value ? lineMarkup(value % 2 === 0 ? 'broken' : 'yang', value === 6 || value === 9) : '<span class="line-waiting"></span>'}
            <span>${value ? `${value} · ${castingValueLabel(value)}` : localized('待投', 'Waiting')}</span>
          </div>
        `
      }).join('')}
    </div>
  `
}

function coinFaceMarkup(face) {
  const faceLabel = face === 'heads' ? localized('字面', 'Inscribed') : face === 'tails' ? localized('背面', 'Plain') : localized('待定', 'Unset')
  const valueLabel = face === 'heads' ? '3' : face === 'tails' ? '2' : localized('点击翻面', 'Tap to turn')
  return `
    <span aria-hidden="true">
      <span class="coin-disc"><span class="coin-inner-rim"></span>${face !== 'tails' ? `<i class="coin-character coin-character-top">乾</i><i class="coin-character coin-character-right">通</i><i class="coin-character coin-character-bottom">隆</i><i class="coin-character coin-character-left">寶</i>` : `<span class="coin-reverse-mark"></span><i class="coin-mint coin-mint-left">ᠪᠣᠣ</i><i class="coin-mint coin-mint-right">ᠴᡳᠣᠸᠠᠨ</i>`}<span class="coin-hole"></span></span>
      <span class="coin-reading"><b>${faceLabel}</b><small>${valueLabel}</small></span>
    </span>
  `
}

function castingMarkup() {
  const nextLine = state.castLines.length + 1
  const isComplete = state.castLines.length === 6
  const completedCast = isComplete ? castHexagram(state.castLines) : null
  const manualReady = state.coinFaces.every(Boolean)
  const visibleRandomFaces = state.isTossing
    ? state.pendingTossFaces
    : (state.lastCastFaces.length ? state.lastCastFaces : [null, null, null])
  const nextLineLabel = castingLineLabel(nextLine)
  return `
    <div class="casting-modal-layer">
      <div class="casting-modal-scrim" aria-hidden="true"></div>
      <section class="casting-dialog" role="dialog" aria-modal="true" aria-labelledby="casting-title">
        <header class="casting-dialog-header">
          <div>
            <p class="eyebrow">${localized('起卦 · 由下而上', 'Casting · bottom to top')}</p>
            <h1 id="casting-title">${isComplete ? localized('六爻已成。', 'The six lines are complete.') : localized(`正在形成${nextLineLabel}。`, `Forming ${nextLineLabel}.`)}</h1>
          </div>
          <div class="casting-header-actions"><button class="casting-settings" data-action="open-settings" aria-label="${localized('设置', 'Settings')}">⚙</button><button class="casting-close" data-action="cancel-casting" aria-label="${localized('回到问题', 'Back to the question')}" ${state.isTossing ? 'disabled' : ''}>×</button></div>
        </header>
        <div class="casting-dialog-body">
          <div class="hexagram-progress">
            <p>${localized('卦象正在显形', 'The hexagram is taking shape')}</p>
            ${castingLineStackMarkup()}
          </div>
          <div class="casting-controls ${isComplete ? 'is-complete' : ''}">
          ${isComplete ? '' : `
            <div class="casting-mode" role="group" aria-label="${localized('起卦方式', 'Casting method')}">
              <button data-action="set-casting-mode" data-value="random" aria-pressed="${state.castingMode === 'random'}" ${state.isTossing ? 'disabled' : ''}>${localized('三钱投掷', 'Three-coin toss')}</button>
              <button data-action="set-casting-mode" data-value="manual" aria-pressed="${state.castingMode === 'manual'}" ${state.isTossing ? 'disabled' : ''}>${localized('自掷录入', 'Record your own toss')}</button>
            </div>
          `}
          ${isComplete ? `
            <div class="casting-complete-mark" role="img" aria-label="${localized(`第${completedCast.primary.number}卦，${completedCast.primary.name}`, `Hexagram ${completedCast.primary.number}, ${englishHexagramNames.get(completedCast.primary.name) || 'English name pending editorial review'}`)}">${completedCast.primary.symbol}</div>
            <p class="casting-complete-copy">${localized('六条爻线已经填满。现在展开本卦、变爻与之卦。', 'All six lines are complete. Now reveal the primary hexagram, moving lines, and relating hexagram.')}</p>
            <button class="primary-action" data-action="finish-casting">${localized('展开这一卦', 'Reveal this hexagram')}</button>
          ` : state.castingMode === 'manual' ? `
            <p class="casting-instruction">${localized('你在现实中抛出三枚铜钱，再照实际字背逐枚录入；App 不代替你随机。', 'Toss three real cash coins, then record each inscribed or plain side here; the app does not randomize this method for you.')}</p>
            <div class="coins" aria-label="${localized('本次三枚铜钱', 'The three cash coins for this throw')}">
              ${state.coinFaces.map((face, index) => `
                <button class="coin ${face ? `is-${face}` : 'is-unset'}" data-action="toggle-coin" data-index="${index}" aria-label="${coinAccessibilityLabel(face, index)}">
                  ${coinFaceMarkup(face)}
                </button>
              `).join('')}
            </div>
            <button class="primary-action" data-action="record-line" ${manualReady ? '' : 'disabled'}>${localized(`记下${nextLineLabel}`, `Record ${nextLineLabel}`)}</button>
          ` : `
            <p class="casting-instruction">${state.isTossing ? localized('铜钱正在落定……', 'The coins are settling…') : localized('数字投掷由设备安全随机生成，不随所问或方向改变。点击铜钱，落定后自动记下这一爻。', 'The digital toss uses the device’s secure random source; your question and chosen topic do not alter it. Tap the coins to form and record this line.')}</p>
            <button class="coins coin-cast-trigger is-random ${state.isTossing ? 'is-tossing' : ''}" data-action="random-line" aria-label="${state.isTossing ? localized('铜钱正在落定', 'The coins are settling') : localized(`点击抛出${nextLineLabel}`, `Tap to toss ${nextLineLabel}`)}" aria-live="polite" ${state.isTossing ? 'disabled' : ''}>
              ${visibleRandomFaces.map((face, index) => `
                <span class="coin ${face ? `is-${face}` : 'is-unset'}" style="--coin-index:${index}">${coinFaceMarkup(face)}</span>
              `).join('')}
            </button>
            <p class="coin-cast-caption">${state.isTossing ? localized('落定中', 'Settling') : localized(`点击铜钱 · 投出${nextLineLabel}`, `Tap the coins · toss ${nextLineLabel}`)}</p>
          `}
          <div class="casting-secondary">
            <button class="text-action" data-action="undo-line" ${state.castLines.length && !state.isTossing ? '' : 'disabled'}>${localized('撤回上一爻', 'Undo last line')}</button>
            <button class="text-action" data-action="restart-casting" ${state.isTossing ? 'disabled' : ''}>${localized('重新起卦', 'Start over')}</button>
          </div>
          ${state.ichingContentError ? `<p class="casting-error" role="alert">${escapeHtml(state.ichingContentError)}</p>` : ''}
          </div>
        </div>
      </section>
    </div>
  `
}

// Removed legacy flow rendering and calculations.
function topicLensMarkup() {
  const prompts = buildReflectionQuestions({
    hexagramNumber: Number(reading.number),
    hexagramName: reading.name,
    relatingName: reading.hasRelating ? reading.resulting.name : '',
    movingLines: reading.movingLines || (reading.movingLine ? [reading.movingLine] : []),
    topic: state.topic,
    language: state.language,
  })
  return `
    <aside class="topic-lens" aria-label="${state.language === 'en' ? 'Questions from this reading' : '本次卦象留下的问题'}">
      <div class="topic-lens-questions">
        ${prompts.map(prompt => `
          <article>
            <small>${prompt.label}</small>
            <p>${prompt.text}</p>
          </article>
        `).join('')}
      </div>
      <span>${state.language === 'en' ? 'They arise from the hexagram, its moving lines, and your question—without answering for you.' : '它们随本卦、变爻与所问而来，不替你作答。'}</span>
    </aside>
    ${classicResonanceMarkup()}
  `
}

function classicResonanceMarkup() {
  const resonance = classicResonances[state.topic]
  return `
    <aside class="classic-resonance">
      <small>同题旁证 · 不是卦辞</small>
      <blockquote lang="zh-Hant">${resonance.original}</blockquote>
      <p>${resonance.source}</p>
      <button class="text-action" data-action="open-classic" data-path="${resonance.path}">在典籍库中查看原文</button>
    </aside>
  `
}

function archiveMarkup() {
  return `
    <section class="reading archive">
      <aside class="archive-index">
        <button class="text-action" data-action="leave">← 回到门外</button>
        <div class="index-block">
          <span>卦序</span><strong>${reading.number}</strong>
        </div>
        ${hexagramMarkup()}
        <div class="index-block">
          <span>卦名</span><strong>${reading.name}</strong><small>${reading.plainName}</small>
        </div>
        <div class="index-block">
          <span>所见之爻</span><strong>${reading.line}</strong>
        </div>
      </aside>
      <article class="archive-text">
        ${questionEcho()}
        <p class="eyebrow">一段文字浮现</p>
        <blockquote lang="zh-CN">${withBreaks(reading.original)}</blockquote>
        <p class="source">${reading.source}</p>
        ${reading.hasTranslation === false ? '' : `
          <div class="translation-rule"></div>
          <p class="translation-label">现代中文译意</p>
          <p class="translation">${withBreaks(reading.plainTranslation)}</p>
        `}
        <p class="editorial-note">${reading.note}</p>
        <div class="archive-ending">
          <span>这里不作结论。</span>
          <button class="quiet-action" data-action="leave">让它停在这里</button>
        </div>
      </article>
    </section>
  `
}

function echoesMarkup() {
  return `
    <section class="reading echoes">
      <button class="text-action echoes-back" data-action="leave">← 离开这间静室</button>
      ${questionEcho()}
      <div class="echo-sigil">${hexagramMarkup()}<span>${reading.number}</span></div>
      <div class="echo-fragment fragment-one">
        <small>卦辞</small>
        <p lang="zh-CN">${withBreaks(reading.judgment)}</p>
      </div>
      <div class="echo-fragment fragment-two">
        <small>大象</small>
        <p lang="zh-CN">${withBreaks(reading.image)}</p>
      </div>
      <div class="echo-fragment fragment-three">
        <small>${reading.line}</small>
        <p lang="zh-CN">${withBreaks(reading.original)}</p>
      </div>
      <footer class="echo-footer">
        <span>${reading.source}</span>
        <span>现代中文译意</span>
        <button class="quiet-action" data-action="leave">什么也不带走</button>
      </footer>
    </section>
  `
}

function thresholdMarkup() {
  const steps = [
    `<p class="threshold-symbol" aria-hidden="true">${reading.symbol || String.fromCodePoint(0x4dc0 + Number(reading.number) - 1)}</p><p class="threshold-kicker">第 ${reading.number} 卦 · ${reading.name}</p><h2>先看见它的结构。</h2>`,
    `<p class="threshold-kicker">卦辞</p><p class="threshold-original" lang="zh-CN">${withBreaks(reading.judgment)}</p>`,
    `<p class="threshold-kicker">${reading.line}</p><p class="threshold-original" lang="zh-CN">${withBreaks(reading.original)}</p>`,
    `<p class="threshold-kicker">文字到这里结束</p><h2>余意仍未结束。</h2><p class="threshold-source">${reading.source}</p>`,
  ]
  const safeStep = Math.min(state.thresholdStep, steps.length - 1)
  const finalStep = safeStep === steps.length - 1

  return `
    <section class="reading threshold">
      <button class="text-action threshold-back" data-action="leave">← 回到阅读之前</button>
      ${questionEcho()}
      <div class="threshold-stage" aria-live="polite">${steps[safeStep]}</div>
      <div class="threshold-progress" aria-label="阅读进度">
        ${steps.map((_, index) => `<span class="${index <= safeStep ? 'is-lit' : ''}"></span>`).join('')}
      </div>
      ${
        finalStep
          ? `<button class="quiet-action" data-action="leave">让它保持未解</button>`
          : `<button class="primary-action" data-action="continue">继续</button>`
      }
    </section>
  `
}

function resonanceMarkup() {
  const fragments = [
    { label: '卦辞', original: reading.judgment, plain: reading.judgmentPlain },
    { label: '大象', original: reading.image, plain: reading.imagePlain },
    { label: `${reading.line} · 爻辞`, original: reading.original, plain: reading.plainTranslation },
    { label: `${reading.line} · 小象`, original: reading.lineImage, plain: reading.lineImagePlain },
    {
      label: reading.hasRelating ? `${reading.line}变 · 之卦` : '六爻皆静',
      original: reading.hasRelating ? `${reading.resulting.number} · ${reading.resulting.name}` : '六爻皆静，本次没有之卦。',
      plain: reading.hasRelating ? `${reading.resulting.judgment}${reading.resulting.judgmentPlain ? `\n${reading.resulting.judgmentPlain}` : ''}` : '',
      change: true,
    },
  ]
  const finalStep = state.thresholdStep === fragments.length

  return `
    <section class="reading resonance ${state.thresholdStep === 0 ? 'is-structure-step' : ''} ${finalStep ? 'is-final-step' : ''}">
      <header class="resonance-nav">
        <button class="text-action resonance-back" data-action="leave">← 离开余响</button>
        ${questionEcho()}
      </header>
      <div class="resonance-stage">
        <div class="resonance-sigil" aria-hidden="true">${hexagramMarkup()}<span>${reading.number} · ${reading.name}</span></div>
        <div class="resonance-field">
          ${state.thresholdStep === 0 ? `
            <div class="resonance-structure">
              <p class="resonance-intro">先看见它的结构。<br /><small>六爻自下而上，上${trigrams[reading.upper].name}${trigrams[reading.upper].symbol}、下${trigrams[reading.lower].name}${trigrams[reading.lower].symbol}；${reading.movingLines?.length ? `金点标出${reading.line}。` : '本次六爻皆静。'}</small></p>
              ${trigramCardsMarkup()}
            </div>
          ` : ''}
          ${fragments.map((fragment, index) => {
            const fragmentStep = index + 1
            if (fragmentStep > state.thresholdStep) return ''
            const phase = fragmentStep === state.thresholdStep ? 'is-current' : 'is-past'
            return `
              <article class="resonance-fragment resonance-${fragmentStep} ${phase}">
                <small>${fragment.label}</small>
                ${fragment.change && reading.hasRelating ? `<div class="change-hexagram">${hexagramMarkup(reading.resulting)}</div>` : ''}
                <p lang="zh-CN">${withBreaks(fragment.original)}</p>
                ${fragment.plain ? `<span>${withBreaks(fragment.plain)}</span>` : ''}
                ${fragment.change && reading.hasRelating ? '<em class="change-note">本次变爻对应的另一卦象，不代表确定未来。</em>' : ''}
              </article>
            `
          }).join('')}
        </div>
      </div>
      <footer class="resonance-footer">
        ${finalStep ? topicLensMarkup() : ''}
        ${finalStep ? `<p>${reading.source}<br />本卦${reading.name} · ${reading.line}${reading.hasRelating ? ` · 之卦${reading.resulting.name}` : ''}<br />${reading.hasTranslation === false ? '典籍原文' : '现代中文译意'}</p>` : '<p>内容仍在展开。</p>'}
        <p class="progress-label">${state.thresholdStep + 1} / 6 · ${['结构', '卦辞', '大象', `${reading.line}爻辞`, `${reading.line}小象`, reading.hasRelating ? '之卦' : '六爻皆静'][state.thresholdStep]}</p>
        <div class="threshold-progress" aria-label="阅读进度">
          ${[0, 1, 2, 3, 4, 5].map(index => `<span class="${index <= state.thresholdStep ? 'is-lit' : ''}"></span>`).join('')}
        </div>
        <div class="reading-actions">
          ${state.thresholdStep > 0 ? '<button class="text-action" data-action="previous-reading">回看上一段</button>' : ''}
          ${
            finalStep
              ? `<button class="quiet-action" data-action="leave">让它保持未解</button>`
              : `<button class="primary-action" data-action="continue">听见下一段</button>`
          }
        </div>
      </footer>
    </section>
  `
}

function questionEcho() {
  const topicLabel = topics[state.topic].label
  return state.question
    ? `<p class="question-echo"><span>${topicLabel}</span>${escapeHtml(state.question)}</p>`
    : `<p class="question-echo"><span>${topicLabel} · 你没有为问题命名。</span></p>`
}

function selectedClassicEntry() {
  return state.classicManifest?.entries.find(entry => entry.path === state.selectedClassicPath) || null
}

function zhouyiClassicEntry() {
  return state.classicManifest?.entries.find(entry => entry.collection === '十三经' && entry.title === '周易') || null
}

function classicLibraryMarkup() {
  const manifest = state.classicManifest
  const selected = selectedClassicEntry()

  if (selected) {
    return `
      <section class="classics-library classic-reader">
        <header class="classics-header">
          <button class="text-action" data-action="close-classic">← 返回典籍目录</button>
          <p class="eyebrow">${selected.collection}</p>
          <h1>${selected.title}</h1>
          <p>${selected.lines.toLocaleString('zh-CN')} 行 · ${formatBytes(selected.bytes)}</p>
          <p class="classic-status">${selected.sourceStatus}</p>
          ${selected.duplicateOf ? `<p class="classic-duplicate">此条目与 ${selected.duplicateOf} 内容完全相同，仍按压缩包原目录保留。</p>` : ''}
        </header>
        ${state.classicLoading ? '<p class="classics-loading">正在展开原文……</p>' : ''}
        ${state.classicError ? `<p class="classics-error" role="alert">${escapeHtml(state.classicError)}</p>` : ''}
        ${state.classicText ? `<pre lang="zh-Hant">${escapeHtml(state.classicText.replace(/^\uFEFF/, ''))}</pre>` : ''}
      </section>
    `
  }

  const query = state.classicSearch.trim().toLowerCase()
  const entries = manifest?.entries.filter(entry => {
    const haystack = `${entry.collection} ${entry.title} ${entry.sourceStatus}`.toLowerCase()
    return !query || haystack.includes(query)
  }) || []

  return `
    <section class="classics-library">
      <header class="classics-header">
        <button class="text-action" data-action="leave-classics">← 回到阅读</button>
        <p class="eyebrow">原始文本 · 按需读取</p>
        <h1>典籍库</h1>
        <p>完整保留压缩包的 ${manifest?.entryCount || 18} 个条目；其中 ${manifest?.uniqueContentCount || 16} 份内容不重复。原文不会在首页一次性加载。</p>
        <p class="classic-status">内部原型使用。汇编来源与授权说明确认前，不作为可公开分发内容库。</p>
      </header>
      <label class="classic-search">
        <span>按书名或分类筛选</span>
        <input id="classic-search" type="search" value="${escapeHtml(state.classicSearch)}" placeholder="例如：周易、四书、春秋" autocomplete="off" />
      </label>
      ${state.classicLoading && !manifest ? '<p class="classics-loading">正在核对典籍清单……</p>' : ''}
      ${state.classicError ? `<p class="classics-error" role="alert">${escapeHtml(state.classicError)}</p>` : ''}
      <div class="classic-list">
        ${entries.map(entry => `
          <button data-action="select-classic" data-path="${entry.path}">
            <span>${entry.collection}</span>
            <strong>${entry.title}</strong>
            <small>${entry.lines.toLocaleString('zh-CN')} 行 · ${formatBytes(entry.bytes)}</small>
            <em>${entry.duplicateOf ? '重复条目' : entry.sourceStatus}</em>
          </button>
        `).join('') || (!state.classicLoading ? '<p class="classic-empty">没有符合筛选条件的典籍。</p>' : '')}
      </div>
    </section>
  `
}

function localized(zh, en) {
  return state.language === 'en' ? en : zh
}

function hexagramNameMarkup(hexagram) {
  const englishName = englishHexagramNames.get(hexagram.name) || localized('英文名待编辑', 'English name pending editorial review')
  return `<span lang="zh-Hans">${escapeHtml(hexagram.name)}</span>${state.language === 'en' ? `<span class="english-hexagram-name">${escapeHtml(englishName)}</span>` : ''}`
}

function foundationNavMarkup() {
  const items = [
    ['opening', '仪式', 'Ritual'],
    ['history', '历史', 'History'],
    ['trust', '边界', 'Boundaries'],
  ]
  return `
    <nav class="foundation-nav" aria-label="${localized('主要导航', 'Primary navigation')}">
      ${items.map(([stage, zh, en]) => `<button data-action="open-stage" data-value="${stage}" aria-current="${state.stage === stage ? 'page' : 'false'}">${localized(zh, en)}</button>`).join('')}
    </nav>
  `
}

function lockedFeatureMarkup(feature, zhTitle, enTitle, zhDescription, enDescription) {
  return `
    <section class="foundation-page foundation-locked">
      <header class="foundation-header">
        <p class="eyebrow">${localized('本地测试权益', 'Local test entitlement')}</p>
        <h1>${localized(zhTitle, enTitle)}</h1>
        <p>${localized(zhDescription, enDescription)}</p>
      </header>
      <button class="commerce-button" data-action="request-feature" data-value="${feature}">${localized('查看透明产品结构', 'View transparent plans')}</button>
    </section>
  `
}

function historyMarkup() {
  const query = state.historySearch.trim()
  const allRecords = historyRepository.list()
  const availableTags = [...new Set(allRecords.flatMap(record => record.tags || []))].sort((a, b) => a.localeCompare(b, state.language === 'en' ? 'en' : 'zh'))
  const now = Date.now()
  const records = allRecords.filter(record => {
    const topic = topics[record.topic]?.label || record.topic
    const primaryEnglish = englishHexagramNames.get(record.primary.name) || ''
    const relatingEnglish = englishHexagramNames.get(record.relating.name) || ''
    const haystack = `${record.question} ${record.primary.number} ${record.primary.name} ${primaryEnglish} ${record.relating.number} ${record.relating.name} ${relatingEnglish} ${topic} ${(record.tags || []).join(' ')}`
    const matchesQuery = !query || haystack.toLocaleLowerCase().includes(query.toLocaleLowerCase())
    const matchesTag = !state.historyTagFilter || (record.tags || []).includes(state.historyTagFilter)
    const age = now - new Date(record.createdAt).getTime()
    const matchesPeriod = state.historyPeriodFilter === 'all'
      || (state.historyPeriodFilter === '7d' && age <= 7 * 86400000)
      || (state.historyPeriodFilter === '30d' && age <= 30 * 86400000)
      || (state.historyPeriodFilter === 'review' && record.review?.status !== 'none')
    return matchesQuery && matchesTag && matchesPeriod
  })
  const visibleRecords = canAccess('fullHistory') ? records : records.slice(0, FREE_RECENT_HISTORY_LIMIT)
  const selected = visibleRecords.find(record => record.id === state.selectedHistoryID)
  if (selected) return historyDetailMarkup(selected)

  return `
    <section class="foundation-page history-page">
      <header class="foundation-header">
        <p class="eyebrow">${localized('只存在这台设备', 'Only on this device')}</p>
        <h1>${localized('私密卦象历史', 'Private reading history')}</h1>
        <p>${localized('完成六爻后自动保存卦象。不要求你当场写下理解；回看、标签和备注都是可选的。', 'A reading is saved automatically after all six lines are complete. You never have to write an interpretation on the spot; revisits, tags, and notes are optional.')}</p>
      </header>
      ${canAccess('fullHistory') ? `<label class="history-search">
        <span>${localized('搜索问题、卦名、编号或标签', 'Search questions, names, numbers, or tags')}</span>
        <input id="history-search" type="search" value="${escapeHtml(state.historySearch)}" autocomplete="off" />
      </label>
      <div class="history-filter-row" aria-label="${localized('历史筛选', 'History filters')}">
        <div class="history-filter-chips" role="group" aria-label="${localized('时间筛选', 'Time filters')}">
          ${[['all', '全部', 'All'], ['7d', '7天内', '7 days'], ['30d', '30天内', '30 days'], ['review', '有回看', 'With revisits']].map(([value, zh, en]) => `<button data-action="set-history-period" data-value="${value}" aria-pressed="${state.historyPeriodFilter === value}">${localized(zh, en)}</button>`).join('')}
        </div>
        ${availableTags.length ? `<label class="history-tag-filter"><span>${localized('标签', 'Tag')}</span><select id="history-tag-filter"><option value="">${localized('全部标签', 'All tags')}</option>${availableTags.map(tag => `<option value="${escapeHtml(tag)}" ${state.historyTagFilter === tag ? 'selected' : ''}>${escapeHtml(tag)}</option>`).join('')}</select></label>` : ''}
      </div>
      ${(query || state.historyTagFilter || state.historyPeriodFilter !== 'all') ? `<div class="history-result-summary"><span>${localized(`找到 ${records.length} 条记录`, `${records.length} result${records.length === 1 ? '' : 's'}`)}</span><button data-action="clear-history-filters">${localized('清除筛选', 'Clear filters')}</button></div>` : ''}
      ` : `<p class="foundation-message">${localized(`免费层显示最近 ${FREE_RECENT_HISTORY_LIMIT} 条；完整历史和检索需要本地测试权益。`, `Free access includes the most recent ${FREE_RECENT_HISTORY_LIMIT} readings; full history and search require a local test entitlement.`)}</p>`}
      <div class="history-tools">
        ${canAccess('backupExport') ? `<button data-action="export-history" data-value="json">${localized('导出 JSON 备份', 'Export JSON backup')}</button><button data-action="export-history" data-value="text">${localized('导出可读文本', 'Export readable text')}</button>` : `<button data-action="request-feature" data-value="backupExport">${localized('解锁备份导出', 'Unlock backup export')}</button>`}
        <button data-action="choose-history-import">${localized('导入备份', 'Import backup')}</button>
        <input id="history-import" class="visually-hidden" type="file" accept="application/json,.json" />
      </div>
      ${historyRepository.lastWarning ? `<p class="foundation-message is-warning" role="alert">${localized(escapeHtml(historyRepository.lastWarning), 'Unreadable local history was isolated and not imported. A valid JSON backup can restore records.')}</p>` : ''}
      ${state.importMessage ? `<p class="foundation-message" role="status">${escapeHtml(state.importMessage)}</p>` : ''}
      <div class="history-list">
        ${historyGroupsMarkup(visibleRecords)}
        ${visibleRecords.length ? '' : `<div class="foundation-empty"><strong>${allRecords.length ? localized('没有符合当前筛选的记录', 'No readings match these filters') : localized('还没有历史记录', 'No reading history yet')}</strong><p>${allRecords.length ? localized('试试清除搜索词或筛选条件。', 'Try clearing the search or filters.') : localized('完成一次六爻起卦后，记录会在本机自动出现。', 'Complete a six-line casting and it will appear here automatically on this device.')}</p></div>`}
      </div>
    </section>
  `
}

function historyGroupsMarkup(records) {
  const formatter = new Intl.DateTimeFormat(state.language === 'en' ? 'en-US' : 'zh-CN', { month: 'short', day: 'numeric', year: 'numeric' })
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const groups = new Map()
  records.forEach(record => {
    const date = new Date(record.createdAt)
    const day = new Date(date); day.setHours(0, 0, 0, 0)
    const label = day.getTime() === today.getTime() ? localized('今天', 'Today') : day.getTime() === yesterday.getTime() ? localized('昨天', 'Yesterday') : formatter.format(date)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(record)
  })
  return [...groups.entries()].map(([label, group]) => `<section class="history-group"><h2>${escapeHtml(label)}</h2>${group.map(record => `
    <button class="history-card" data-action="open-history-entry" data-value="${record.id}">
      <span>${new Date(record.createdAt).toLocaleTimeString(state.language === 'en' ? 'en-US' : 'zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
      <strong>${record.primary.number} · ${hexagramNameMarkup(record.primary)}${record.movingLines.length ? ` → ${hexagramNameMarkup(record.relating)}` : ''}</strong>
      <small>${escapeHtml(record.question || localized('未写下问题', 'Question left unwritten'))}</small>
      ${record.review?.status !== 'none' ? `<em>${localized('已设回看', 'Revisit set')}</em>` : ''}
    </button>`).join('')}</section>`).join('')
}

function historyDetailMarkup(record) {
  return `
    <section class="foundation-page history-detail">
      <header class="foundation-header">
        <button class="text-action" data-action="close-history-entry">← ${localized('返回历史', 'Back to history')}</button>
        <p class="eyebrow">${new Date(record.createdAt).toLocaleString(state.language === 'en' ? 'en-US' : 'zh-CN')}</p>
        <h1>${record.primary.number} · ${hexagramNameMarkup(record.primary)}${record.movingLines.length ? ` → ${hexagramNameMarkup(record.relating)}` : ''}</h1>
        <p>${escapeHtml(record.question || localized('当时没有写下问题。', 'No question was written down.'))}</p>
      </header>
      <dl class="history-facts">
        <div><dt>${localized('六爻', 'Six lines')}</dt><dd>${record.lineValues.join(' · ')}</dd></div>
        <div><dt>${localized('随机来源', 'Random source')}</dt><dd>${record.castingMethod === 'manual' ? localized('用户手动录入', 'Manually recorded') : localized('设备安全随机', 'Device secure random')}</dd></div>
      </dl>
      <label class="review-field">
        <span>${localized('可选回看日期', 'Optional revisit date')}</span>
        <input id="review-date" type="date" value="${record.review.scheduledFor || ''}" />
      </label>
      <label class="review-field">
        <span>${localized('事后对照（可留空）', 'Later reflection (optional)')}</span>
        <textarea id="review-note" rows="5" placeholder="${localized('后来发生了什么？哪些没有发生？', 'What happened later? What did not happen?')}">${escapeHtml(record.review.note)}</textarea>
      </label>
      <label class="review-field">
        <span>${localized('标签（用逗号分隔）', 'Tags (comma-separated)')}</span>
        <input id="history-tags" type="text" value="${escapeHtml(record.tags.join(', '))}" />
      </label>
      <div class="history-tools">
        <button class="primary-action" data-action="save-review">${localized('保存可选回看', 'Save optional revisit')}</button>
        ${state.pendingDeleteID === record.id
          ? `<button class="danger-action" data-action="confirm-delete-history">${localized('确认删除这条记录', 'Confirm deletion')}</button><button data-action="cancel-delete-history">${localized('取消', 'Cancel')}</button>`
          : `<button class="danger-action" data-action="request-delete-history">${localized('删除这条记录', 'Delete this record')}</button>`}
      </div>
      <p class="privacy-footnote">${localized('删除只影响本机记录；已导出的文件由你自行管理。', 'Deletion affects only the local record. You remain responsible for files you previously exported.')}</p>
    </section>
  `
}

function trustMarkup() {
  return `
    <section class="foundation-page trust-page">
      <header class="foundation-header"><p class="eyebrow">${localized('信任与边界', 'Trust & boundaries')}</p><h1>${localized('起卦、隐私与备份', 'Casting, privacy, and backup')}</h1></header>
      <article><h2>${localized('三钱法的概率', 'Three-coin probabilities')}</h2><p>${localized('每枚数字铜钱由设备安全随机源独立生成字/背。一爻的四种和值概率为：老阴 6 = 1/8，少阳 7 = 3/8，少阴 8 = 3/8，老阳 9 = 1/8。问题、关注方向和付费状态都不会改变结果。', 'Each digital coin uses the device secure random source independently. The four line totals have these probabilities: old yin 6 = 1/8, young yang 7 = 3/8, young yin 8 = 3/8, old yang 9 = 1/8. Your question, topic, and payment status never alter the result.')}</p></article>
      <article><h2>${localized('本地隐私与 Data Protection', 'Local privacy and Data Protection')}</h2><p>${localized('问题、卦象、标签和回看备注保存在 App 沙盒的本地 Web 容器中；iOS 目标声明默认 Data Protection 为“首次解锁后可用”。本轮没有账号、分析 SDK、云容器或后台。导出后，文件保护由你选择的系统位置或接收 App 决定。', 'Questions, readings, tags, and revisit notes stay in the app sandbox’s local web container. The iOS target declares default Data Protection as “available after first unlock.” This build has no account, analytics SDK, cloud container, or backend. After export, protection is controlled by the selected system location or receiving app.')}</p></article>
      <article><h2>${localized('备份与未来同步', 'Backup and future sync')}</h2><p>${localized('仅在你主动导出时生成 JSON 或文本文件。导入会先校验版本和字段，再按记录 ID 合并。iCloud/CloudKit 与外部同步未启用。', 'JSON or text files are created only when you explicitly export. Imports validate their version and fields before merging by record ID. iCloud, CloudKit, and external sync are not enabled.')}</p></article>
      <button class="commerce-button" data-action="open-paywall">${localized('查看透明产品结构', 'View the transparent product structure')}</button>
      ${state.importMessage ? `<p class="foundation-message" role="status">${escapeHtml(state.importMessage)}</p>` : ''}
      <p class="privacy-footnote">${localized('付费界面仅用于 Xcode 本地 StoreKit Testing，尚未绑定 App Store Connect 真实商品。', 'The purchase interface is for local Xcode StoreKit Testing only and is not connected to real App Store Connect products.')}</p>
    </section>
  `
}

function exportConfirmationMarkup() {
  if (!state.pendingExportFormat) return ''
  const label = state.pendingExportFormat === 'json' ? 'JSON' : localized('可读文本', 'readable text')
  return `
    <div class="confirmation-layer" role="presentation">
      <div class="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="export-confirm-title" aria-describedby="export-confirm-description">
        <h2 id="export-confirm-title">${localized(`确认导出${label}`, `Confirm ${label} export`)}</h2>
        <p id="export-confirm-description">${localized('导出文件是未加密明文，可能包含你的问题、标签和回看备注。保存、分享或交给其他 App 后，将离开本 App 的本地保护范围。', 'The exported file is unencrypted plaintext and may contain your questions, tags, and revisit notes. Saving, sharing, or handing it to another app moves it outside this app’s local protection boundary.')}</p>
        <div class="confirmation-actions">
          <button data-action="cancel-export">${localized('取消', 'Cancel')}</button>
          <button class="danger-action" data-action="confirm-export">${localized('理解风险并继续', 'I understand; continue')}</button>
        </div>
      </div>
    </div>
  `
}

function completeReadingMarkup() {
  const isEnglish = state.language === 'en'
  const primaryName = englishHexagramNames.get(reading.name) || (isEnglish ? 'English name pending editorial review' : reading.name)
  const relatingName = englishHexagramNames.get(reading.resulting?.name) || (isEnglish ? 'English name pending editorial review' : reading.resulting.name)
  const upper = trigrams[reading.upper]
  const lower = trigrams[reading.lower]
  const questions = buildReflectionQuestions({
    hexagramNumber: Number(reading.number), hexagramName: primaryName, relatingName,
    movingLines: reading.movingLines || [], topic: state.topic, language: state.language,
  })
  const originalNote = isEnglish ? '<small class="english-original-note">Original Chinese source text. A licensed complete English translation is not bundled.</small>' : ''
  const movingContent = reading.movingPassages?.length
    ? `<ol class="reading-line-list">${reading.movingPassages.map(item => `<li><h4>${isEnglish ? `Moving line ${item.number} from the bottom` : `${item.label} · 变爻`}</h4><p lang="zh-Hant">${escapeHtml(item.label)}：${withBreaks(escapeHtml(item.text))}</p>${item.image ? `<p lang="zh-Hant">象：${withBreaks(escapeHtml(item.image))}</p>` : ''}${originalNote}</li>`).join('')}</ol>`
    : `<p>${localized('本次六爻皆静，以本卦卦辞与大象为主；不生成“没有变爻”的额外结论。', 'All six lines are still in this casting. Read the primary judgment and image without inventing an extra conclusion.')}</p>`
  return `
    <main class="foundation-page complete-reading" aria-live="polite">
      <header class="foundation-header complete-reading-header">
        <p class="eyebrow">${localized('一次阅读，不替你下结论', 'One reading, not a prediction')}</p>
        <h1>${reading.number} · ${isEnglish ? escapeHtml(primaryName) : hexagramNameMarkup({ name: reading.name })}</h1>
        <p>${reading.hasRelating ? localized(`变爻通向第${reading.resulting.number}卦${reading.resulting.name}；这是文本关系，不是未来判断。`, `Moving lines lead to Hexagram ${reading.resulting.number}, ${relatingName}. This is a textual relationship, not a forecast.`) : localized('本次没有变爻；这不是对未来的判断。', 'No moving lines were recorded. This is not a forecast.')}</p>
      </header>
      <nav class="reading-toc" aria-label="${localized('本页目录', 'On-page contents')}">
        <a href="#reading-structure">${localized('结构', 'Structure')}</a><a href="#reading-source">${localized('原文', 'Source')}</a><a href="#reading-moving">${localized('变爻', 'Moving lines')}</a><a href="#reading-relating">${localized('之卦', 'Relating')}</a><a href="#reading-prompts">${localized('留白', 'Reflection')}</a>
      </nav>
      <section class="reading-section" id="reading-structure"><h2>${localized('本卦结构', 'Primary structure')}</h2>
        <div class="reading-hexagram" aria-label="${isEnglish ? `Hexagram ${reading.number}: ${primaryName}; ${englishTrigrams[upper.name]} above ${englishTrigrams[lower.name]}` : `第${reading.number}卦${reading.name}，上${upper.name}下${lower.name}`}">${hexagramMarkup(reading)}</div>
        <p>${localized(`六爻自下而上。上卦为${upper.name}${upper.image}，下卦为${lower.name}${lower.image}；${upper.image}在${lower.image}上。`, `The six lines rise from bottom to top. ${englishTrigrams[upper.name]} is above ${englishTrigrams[lower.name]}; ${englishImages[upper.image] || upper.image} is above ${englishImages[lower.image] || lower.image}.`)}</p>
      </section>
      <section class="reading-section" id="reading-source"><h2>${localized('卦辞与大象', 'Judgment and image')}</h2>
        <article><h3>${localized('卦辞原文', 'Original judgment')}</h3><p lang="zh-Hant">${withBreaks(escapeHtml(reading.judgment))}</p>${originalNote}</article>
        <article><h3>${localized('大象原文', 'Original image')}</h3><p lang="zh-Hant">${withBreaks(escapeHtml(reading.image))}</p>${originalNote}</article>
        <article><h3>${localized('直译与背景状态', 'Literal and context status')}</h3><p>${localized('直译层尚未由人工编辑完整覆盖六十四卦，因此不以机器翻译或来源不明的现代译本补位。上、下卦与爻位在本页只作为阅读结构，不替你判断事情的走向。', 'A literal layer has not yet received complete human editorial coverage for all 64 hexagrams. Machine translation and unlicensed modern translations are not substituted. The trigrams and line positions here are reading structure, not a judgment about what will happen.')}</p></article>
      </section>
      <section class="reading-section" id="reading-moving"><h2>${localized('变爻', 'Moving lines')}</h2>${movingContent}</section>
      <section class="reading-section" id="reading-relating"><h2>${localized('之卦', 'Relating hexagram')}</h2>
        ${reading.hasRelating ? `<article><h3>${reading.resulting.number} · ${isEnglish ? escapeHtml(relatingName) : hexagramNameMarkup({ name: reading.resulting.name })}</h3><p>${localized(`由本次变爻得到。上${trigrams[reading.resulting.upper].name}下${trigrams[reading.resulting.lower].name}。`, `Formed by this reading's moving lines. ${englishTrigrams[trigrams[reading.resulting.upper].name]} above ${englishTrigrams[trigrams[reading.resulting.lower].name]}.`)}</p><p lang="zh-Hant">${withBreaks(escapeHtml(reading.resulting.judgment))}</p>${originalNote}</article>` : `<p>${localized('六爻皆静，本页不另设之卦。', 'All lines are still, so this page does not add a relating hexagram.')}</p>`}
      </section>
      <section class="reading-section" id="reading-prompts"><h2>${localized('开放式留白', 'Open reflection')}</h2><ol>${questions.map(item => `<li><small>${escapeHtml(item.label)}</small><p>${escapeHtml(item.text)}</p></li>`).join('')}</ol></section>
      <section class="reading-section reading-sources"><h2>${localized('来源与典籍', 'Source and classics')}</h2><p>${localized('本页原文来自内置《周易》资料。未内置未经许可的现代译本；James Legge 的 1882 年著作仅作为可追溯的公版研究线索，并未在此捆绑转录文本。', 'The original source here comes from the bundled Zhouyi material. No unlicensed modern translation is included; James Legge’s 1882 work is only a traceable public-domain research reference, and no transcription is bundled here.')}</p><button class="quiet-action" data-action="open-zhouyi-source">${localized('在典籍库中阅读原文', 'Read the original in Classics')}</button></section>
      <button class="quiet-action complete-reading-return" data-action="leave">${localized('不下结论，返回仪式', 'Return without a conclusion')}</button>
    </main>
  `
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function ensureIChingContent() {
  if (state.ichingContent) return true
  state.ichingContentError = ''
  try {
    const response = await fetch('/content/iching/hexagrams.json')
    if (!response.ok) throw new Error(localized(`六十四卦原文读取失败（${response.status}）`, `Unable to load the 64-hexagram source (${response.status}).`))
    const payload = await response.json()
    if (payload.entryCount !== 64 || payload.hexagrams?.length !== 64) throw new Error(localized('六十四卦原文不完整。', 'The 64-hexagram source is incomplete.'))
    state.ichingContent = payload.hexagrams
    return true
  } catch (error) {
    state.ichingContentError = error.message || localized('六十四卦原文暂时无法读取。', 'The 64-hexagram source is temporarily unavailable.')
    return false
  }
}

function contentByNumber(number) {
  return state.ichingContent?.find(item => item.number === number) || null
}

function readingFromCast(cast) {
  const primaryContent = contentByNumber(cast.primary.number)
  const relatingContent = contentByNumber(cast.relating.number)
  if (!primaryContent || !relatingContent) throw new Error(localized('本次卦象没有找到对应原文。', 'The source text for this reading could not be found.'))

  const movingPassages = cast.movingLines.map(lineNumber => {
    const sourceLine = primaryContent.lines[lineNumber - 1]
    return {
      number: lineNumber,
      label: lineLabel(cast.lineValues[lineNumber - 1], lineNumber),
      text: sourceLine?.text || '',
      image: sourceLine?.image || '',
    }
  })
  const movingLabels = movingPassages.map(item => item.label)
  const upper = trigrams[cast.primary.upper]
  const lower = trigrams[cast.primary.lower]

  return {
    number: String(cast.primary.number),
    name: cast.primary.name,
    symbol: cast.primary.symbol,
    plainName: `${upper.image}${lower.image}`,
    upper: cast.primary.upper,
    lower: cast.primary.lower,
    movingLine: cast.movingLines.length === 1 ? cast.movingLines[0] : null,
    movingLines: [...cast.movingLines],
    movingPassages,
    line: movingLabels.length ? movingLabels.join('、') : '无变爻',
    source: `《周易》· 第${cast.primary.number}卦 · ${cast.primary.name}`,
    judgment: primaryContent.judgment,
    judgmentPlain: '',
    image: primaryContent.image,
    imagePlain: '',
    original: movingPassages.length
      ? movingPassages.map(item => `${item.label}：${item.text}`).join('\n')
      : '本次六爻皆静，以卦辞为主。',
    plainTranslation: '',
    lineImage: movingPassages.length
      ? movingPassages.filter(item => item.image).map(item => `${item.label}·象：${item.image}`).join('\n')
      : '六爻皆静。',
    lineImagePlain: '',
    resulting: {
      number: String(cast.relating.number),
      name: cast.relating.name,
      symbol: cast.relating.symbol,
      plainName: `${trigrams[cast.relating.upper].image}${trigrams[cast.relating.lower].image}`,
      upper: cast.relating.upper,
      lower: cast.relating.lower,
      movingLines: [],
      judgment: relatingContent.judgment,
      judgmentPlain: '',
    },
    hasRelating: cast.movingLines.length > 0,
    hasTranslation: false,
    note: '原文来自典籍库《周易》；本页不另造断语。',
  }
}

function resetCasting() {
  state.castingMode = 'random'
  state.coinFaces = [null, null, null]
  state.castLines = []
  state.lastCastFaces = []
  state.pendingTossFaces = []
  state.isTossing = false
  state.tossToken += 1
  state.ichingContentError = ''
}

function triggerNativeHaptic(pattern) {
  try {
    window.webkit?.messageHandlers?.haptics?.postMessage(pattern)
  } catch {
    // 普通浏览器没有原生触觉桥接，保持静默降级。
  }
}

function nativeCoinAudioAvailable() {
  return Boolean(window.webkit?.messageHandlers?.coinAudio)
}

function setNativeCoinAudioEnabled(enabled) {
  if (!nativeCoinAudioAvailable()) return
  try {
    window.webkit.messageHandlers.coinAudio.postMessage({ event: 'enabled', value: Boolean(enabled) })
  } catch {
    // 普通浏览器继续使用 Web Audio。
  }
}

function playCoinSound(faces) {
  if (nativeCoinAudioAvailable()) {
    try {
      window.webkit.messageHandlers.coinAudio.postMessage({ event: 'coin', faces })
      return
    } catch {
      // 原生桥接暂时不可用时回退到 Web Audio。
    }
  }
  playCoinChime(faces)
}

async function tossAndRecordLine() {
  if (state.isTossing || state.castLines.length >= 6) return
  let faces
  try {
    faces = tossCoinFaces()
  } catch (error) {
    state.ichingContentError = localized(
      error.message || '设备安全随机源不可用，数字起卦已阻断。请改用自掷录入。',
      'The device secure random source is unavailable. Digital casting is blocked; use manual toss entry.'
    )
    render()
    return
  }
  const token = ++state.tossToken
  state.pendingTossFaces = [...faces]
  state.isTossing = true
  triggerNativeHaptic('coin-lift')
  render()

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  await new Promise(resolve => window.setTimeout(resolve, reducedMotion ? 120 : 1050))
  if (token !== state.tossToken || state.stage !== 'casting') return

  playCoinSound(faces)
  triggerNativeHaptic('coin-settle')
  state.isTossing = false
  state.pendingTossFaces = []
  await recordCastLine(coinFacesToLineValue(faces), faces)
}

async function finishCastingIfReady() {
  if (state.castLines.length !== 6) return false
  if (!(await ensureIChingContent())) {
    render()
    return false
  }
  try {
    reading = readingFromCast(castHexagram(state.castLines))
    const cast = castHexagram(state.castLines)
    historyRepository.add(createReadingRecord({
      question: state.question,
      topic: state.topic,
      language: state.language,
      castingMethod: state.castingMode === 'manual' ? 'manual' : 'secure-random',
      lineValues: [...state.castLines],
      movingLines: [...cast.movingLines],
      primary: { number: cast.primary.number, name: cast.primary.name, symbol: cast.primary.symbol },
      relating: { number: cast.relating.number, name: cast.relating.name, symbol: cast.relating.symbol },
    }))
    state.stage = 'reading'
    state.thresholdStep = 0
    render()
    playPassageChime(0)
    resetViewport()
    return true
  } catch (error) {
    state.ichingContentError = error.message || '本次卦象暂时无法展开。'
    render()
    return false
  }
}

async function recordCastLine(value, faces) {
  if (state.castLines.length >= 6) return
  state.castLines.push(value)
  state.lastCastFaces = [...faces]
  state.coinFaces = [null, null, null]
  render()
}

async function ensureClassicManifest() {
  if (state.classicManifest) return true
  state.classicLoading = true
  state.classicError = ''
  render()
  try {
    const response = await fetch('/content/classics/library/manifest.json')
    if (!response.ok) throw new Error(`清单读取失败（${response.status}）`)
    state.classicManifest = await response.json()
    return true
  } catch (error) {
    state.classicError = error.message || '典籍清单暂时无法读取。'
    return false
  } finally {
    state.classicLoading = false
    render()
  }
}

async function openClassic(path) {
  if (!(await ensureClassicManifest())) return
  const entry = state.classicManifest.entries.find(item => item.path === path)
  if (!entry) {
    state.classicError = '没有找到这条典籍记录。'
    render()
    return
  }

  state.selectedClassicPath = path
  state.classicText = ''
  state.classicError = ''
  state.classicLoading = true
  render()
  resetViewport()

  try {
    const response = await fetch(path)
    if (!response.ok) throw new Error(`原文读取失败（${response.status}）`)
    state.classicText = await response.text()
  } catch (error) {
    state.classicError = error.message || '原文暂时无法读取。'
  } finally {
    state.classicLoading = false
    render()
    resetViewport()
  }
}

function switcherMarkup(variant) {
  return `
    <nav class="prototype-switcher" aria-label="阅读样式">
      <button data-action="previous" aria-label="上一个版本">←</button>
      <span><b>${variant}</b> — ${variants[variant]}</span>
      <button data-action="next" aria-label="下一个版本">→</button>
    </nav>
  `
}

function topControlsMarkup() {
  return `
    <div class="top-controls">
      <button class="settings-toggle" data-action="open-settings" aria-label="${localized('设置', 'Settings')}" title="${localized('设置', 'Settings')}">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Zm0-5.2 1 .2.7 2.2c.5.2 1 .5 1.5.8l2.2-.7 1.4 1.4-.7 2.2c.3.5.6 1 .8 1.5l2.2.7.2 1-.2 1-.2 1-2.2.7c-.2.5-.5 1-.8 1.5l.7 2.2-1.4 1.4-2.2-.7c-.5.3-1 .6-1.5.8l-.7 2.2-1 .2-1-.2-.7-2.2c-.5-.2-1-.5-1.5-.8l-2.2.7-1.4-1.4.7-2.2c-.3-.5-.6-1-.8-1.5l-2.2-.7-.2-1 .2-1 .2-1 2.2-.7c.2-.5.5-1 .8-1.5l-.7-2.2 1.4-1.4 2.2.7c.5-.3 1-.6 1.5-.8l.7-2.2 1-.2Z" /></svg>
      </button>
    </div>
  `
}

function settingsSheetMarkup() {
  if (!state.settingsOpen) return ''
  const soundLabel = state.soundEnabled ? localized('关闭声音', 'Turn sound off') : localized('开启声音', 'Turn sound on')
  return `<div class="settings-layer" role="presentation"><div class="settings-scrim" data-action="close-settings" aria-hidden="true"></div><section class="settings-sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title" aria-describedby="settings-description" tabindex="-1"><header><div><p class="eyebrow">${localized('本机偏好', 'On-device preferences')}</p><h2 id="settings-title">${localized('设置', 'Settings')}</h2></div><button class="settings-close" data-action="close-settings" aria-label="${localized('关闭设置', 'Close settings')}">×</button></header><p id="settings-description">${localized('更改会立即保存在这台设备上，不会重置正在进行的起卦或阅读。', 'Changes apply immediately on this device and do not reset an active casting or reading.')}</p><section class="settings-group" aria-labelledby="preferences-title"><h3 id="preferences-title">${localized('偏好设置', 'Preferences')}</h3><div class="settings-row"><div><strong>${localized('语言', 'Language')}</strong><small>${localized('界面语言立即切换', 'Interface language changes immediately')}</small></div><div class="settings-segment" role="group" aria-label="${localized('语言', 'Language')}"><button data-action="set-language" data-value="zh" aria-pressed="${state.language === 'zh'}">中文</button><button data-action="set-language" data-value="en" aria-pressed="${state.language === 'en'}">English</button></div></div><div class="settings-row"><div><strong>${localized('声音', 'Sound')}</strong><small>${localized('默认关闭；只在你开启后播放本地合成提示音', 'Off by default; local synthesized cues play only after you enable them')}</small></div><button class="settings-switch" data-action="toggle-sound" aria-label="${soundLabel}" aria-pressed="${state.soundEnabled}"><span aria-hidden="true"></span></button></div></section><section class="settings-group" aria-labelledby="about-title"><h3 id="about-title">${localized('关于', 'About')}</h3><button class="settings-link" data-action="open-classics"><span><strong>${localized('典籍库', 'Classics library')}</strong><small>${localized('十三经与四书原文，按需读取', 'Original texts from the Thirteen Classics and Four Books')}</small></span><b aria-hidden="true">›</b></button></section><p class="privacy-footnote">${localized('无账号、云同步或真实购买。', 'No account, cloud sync, or real purchase is enabled.')}</p></section></div>`
}

function translateTextToEnglish(value) {
  const exact = englishTranslations.get(value)
  if (exact) return exact

  if (englishHexagramNames.has(value)) return englishHexagramNames.get(value)
  if (englishTrigrams[value]) return englishTrigrams[value]
  if (englishImages[value]) return englishImages[value]

  const baguaLabel = value.match(/^([乾巽坎艮坤震离兑]) · ([天风水山地雷火泽])$/)
  if (baguaLabel) return `${englishTrigrams[baguaLabel[1]].split(' · ')[0]} · ${englishImages[baguaLabel[2]]}`

  const sourceLine = value.match(/^《周易》· (.+)第(\d+) · (.+)$/)
  if (sourceLine) return `Zhouyi · Hexagram ${sourceLine[2]}, ${englishHexagramNames.get(sourceLine[1]) || sourceLine[1]} · ${translateTextToEnglish(sourceLine[3])}`

  const numberedHexagram = value.match(/^第\s*(\d+)\s*卦\s*·\s*(.+)$/)
  if (numberedHexagram) return `Hexagram ${numberedHexagram[1]} · ${englishHexagramNames.get(numberedHexagram[2]) || numberedHexagram[2]}`

  const compactHexagram = value.match(/^(\d+) · (.+)$/)
  if (compactHexagram && englishHexagramNames.has(compactHexagram[2])) return `${compactHexagram[1]} · ${englishHexagramNames.get(compactHexagram[2])}`

  const trigramAria = value.match(/^(上卦|下卦)([乾巽坎艮坤震离兑])，象为([天风水山地雷火泽])$/)
  if (trigramAria) return `${trigramAria[1] === '上卦' ? 'Upper' : 'Lower'} trigram: ${englishTrigrams[trigramAria[2]]}`

  const lineAria = value.match(/^自下而上第(\d)爻(，变爻)?$/)
  if (lineAria) return `Line ${lineAria[1]} from the bottom${lineAria[2] ? ', moving line' : ''}`

  const hexagramAria = value.match(/^第(\d+)卦，(.+)，上([乾巽坎艮坤震离兑])下([乾巽坎艮坤震离兑])$/)
  if (hexagramAria) return `Hexagram ${hexagramAria[1]}, ${englishHexagramNames.get(hexagramAria[2]) || hexagramAria[2]}; ${englishTrigrams[hexagramAria[3]]} above, ${englishTrigrams[hexagramAria[4]]} below`

  const structureAria = value.match(/^(.+)的上下卦结构$/)
  if (structureAria) return `Upper and lower trigram structure of ${englishHexagramNames.get(structureAria[1]) || structureAria[1]}`

  const stillStructure = value.match(/^六爻自下而上，上([乾巽坎艮坤震离兑])☴?、下([乾巽坎艮坤震离兑])☱?；本次六爻皆静。$/)
  if (stillStructure) return `Six lines rise from the bottom: ${englishTrigrams[stillStructure[1]]} above and ${englishTrigrams[stillStructure[2]]} below. No lines are moving.`

  if (value.startsWith('先天八卦：')) return 'Earlier-Heaven Bagua: Qian/Heaven, Xun/Wind, Kan/Water, Gen/Mountain, Kun/Earth, Zhen/Thunder, Li/Fire, Dui/Lake'

  const archiveStats = value.match(/^([\d,]+) 行 · (.+)$/)
  if (archiveStats) return `${archiveStats[1]} lines · ${archiveStats[2]}`

  const unnamedQuestion = value.match(/^(.+) · 你没有为问题命名。$/)
  if (unnamedQuestion) return `${englishTranslations.get(unnamedQuestion[1]) || unnamedQuestion[1]} · You left the question unnamed.`

  const progress = value.match(/^(\d+) \/ 6 · (.+)$/)
  if (progress) return `${progress[1]} / 6 · ${englishTranslations.get(progress[2]) || progress[2]}`

  const lineLabel = value.match(/^(九二) · (爻辞|小象)$/)
  if (lineLabel) return `${lineLabel[1]} · ${englishTranslations.get(lineLabel[2])}`

  const relatingLabel = value.match(/^(九二)变 · 之卦$/)
  if (relatingLabel) return 'Nine at the second · relating hexagram'

  const answered = value.match(/^已回应 (\d+) \/ (\d+)$/)
  if (answered) return `Answered ${answered[1]} / ${answered[2]}`

  const castAttempt = value.match(/^第 (\d) 次$/)
  if (castAttempt) return `Throw ${castAttempt[1]}`

  const formingLine = value.match(/^正在形成(初爻|上爻|第(\d)爻)。$/)
  if (formingLine) {
    const translatedLine = formingLine[1] === '初爻' ? 'the first line' : formingLine[1] === '上爻' ? 'the top line' : `line ${formingLine[2]}`
    return `Forming ${translatedLine}.`
  }

  const compactRecordLine = value.match(/^记下(初爻|上爻|第(\d)爻)$/)
  if (compactRecordLine) return compactRecordLine[1] === '初爻' ? 'Record the first line' : compactRecordLine[1] === '上爻' ? 'Record the top line' : `Record line ${compactRecordLine[2]}`

  const compactTossLine = value.match(/^(点击抛出|点击铜钱 · 投出)(初爻|上爻|第(\d)爻)$/)
  if (compactTossLine) {
    const translatedLine = compactTossLine[2] === '初爻' ? 'the first line' : compactTossLine[2] === '上爻' ? 'the top line' : `line ${compactTossLine[3]}`
    return `${compactTossLine[1] === '点击抛出' ? 'Tap to toss' : 'Tap the coins · toss'} ${translatedLine}`
  }

  const recordLine = value.match(/^记下第 (\d) 爻$/)
  if (recordLine) return `Record line ${recordLine[1]}`

  const randomLine = value.match(/^投出第 (\d) 爻$/)
  if (randomLine) return `Toss line ${randomLine[1]}`

  const clickRandomLine = value.match(/^点击抛出第 (\d) 爻$/)
  if (clickRandomLine) return `Tap to toss line ${clickRandomLine[1]}`

  const clickCoinLine = value.match(/^点击铜钱 · 投出第 (\d) 爻$/)
  if (clickCoinLine) return `Tap the coins · toss line ${clickCoinLine[1]}`

  const numberedLine = value.match(/^第(\d)爻$/)
  if (numberedLine) return `Line ${numberedLine[1]}`

  const coinLabel = value.match(/^第(\d)枚铜钱，(未标记|字面，记三|背面，记二)$/)
  if (coinLabel) return `Cash coin ${coinLabel[1]}, ${{ '未标记': 'not marked', '字面，记三': 'inscribed side, counts as three', '背面，记二': 'plain side, counts as two' }[coinLabel[2]]}`

  return value
}

function applyLanguage() {
  const isEnglish = state.language === 'en'
  document.documentElement.lang = isEnglish ? 'en' : 'zh-CN'
  document.title = isEnglish ? 'Between the Lines | I Ching Reflection' : '字里之间｜周易留白'
  document.querySelector('meta[name="description"]')?.setAttribute('content', isEnglish
    ? 'An open-ended I Ching reading for personal reflection—without telling you what to conclude.'
    : '以三钱六掷进入一次不替你下结论的周易经典阅读。')
  if (!isEnglish) return

  const walker = document.createTreeWalker(app, NodeFilter.SHOW_TEXT)
  const textNodes = []
  while (walker.nextNode()) textNodes.push(walker.currentNode)
  textNodes.forEach(node => {
    const original = node.nodeValue
    const trimmed = original.trim()
    if (!trimmed) return
    const translated = translateTextToEnglish(trimmed)
    if (translated === trimmed) return
    node.nodeValue = `${original.match(/^\s*/)?.[0] || ''}${translated}${original.match(/\s*$/)?.[0] || ''}`
  })

  app.querySelectorAll('[placeholder]').forEach(element => {
    const translated = englishPlaceholders.get(element.getAttribute('placeholder'))
    if (translated) element.setAttribute('placeholder', translated)
  })
  app.querySelectorAll('[aria-label], [alt], [title]').forEach(element => {
    for (const attribute of ['aria-label', 'alt', 'title']) {
      const value = element.getAttribute(attribute)
      if (!value) continue
      const translated = translateTextToEnglish(value)
      if (translated !== value) element.setAttribute(attribute, translated)
    }
  })

  app.querySelectorAll('[lang^="zh"]').forEach(element => {
    const note = document.createElement('small')
    note.className = 'english-original-note'
    note.textContent = element.closest('.classic-reader')
      ? 'Original Chinese source text. English catalog information appears above; a licensed full translation is not included.'
      : 'Original Chinese text from the Zhouyi or another cited classic. English context is provided around this passage; a licensed full translation is not included.'
    element.insertAdjacentElement('afterend', note)
  })
}

function render() {
  const previousStage = lastRenderedStage
  const previousFocusSelector = focusSelectorFor(document.activeElement)
  if (state.stage === 'casting' && previousStage !== 'casting') {
    castingReturnFocusSelector = previousFocusSelector || '[data-action="enter"]'
  }
  const variant = currentVariant()
  document.body.dataset.variant = variant
  document.body.dataset.style = currentVisualStyle()
  document.body.dataset.stage = state.stage
  let content = state.stage === 'classics'
    ? classicLibraryMarkup()
    : state.stage === 'history'
      ? historyMarkup()
    : state.stage === 'trust'
      ? trustMarkup()
    : state.stage === 'opening'
    ? openingMarkup(variant)
    : state.stage === 'casting'
      ? `<div class="casting-background" inert aria-hidden="true">${openingMarkup(variant)}</div>${castingMarkup()}`
    : completeReadingMarkup()

  const showVariantSwitcher = new URLSearchParams(window.location.search).get('compare') === '1'
  const renderedContent = state.stage !== 'reading' || !showVariantSwitcher ? content : `${content}${switcherMarkup(variant)}`
  app.innerHTML = `${state.stage === 'casting' ? '' : topControlsMarkup()}${renderedContent}${state.stage === 'casting' ? '' : foundationNavMarkup()}${exportConfirmationMarkup()}${settingsSheetMarkup()}`
  applyLanguage()
  const topicScroller = document.querySelector('.topic-grid')
  if (topicScroller) {
    topicScroller.scrollTop = state.topicScrollTop
    topicScroller.addEventListener('scroll', () => {
      state.topicScrollTop = topicScroller.scrollTop
      window.clearTimeout(topicSelectionTimer)
      topicSelectionTimer = window.setTimeout(() => selectCenteredTopic(topicScroller), 90)
    }, { passive: true })
  }
  lastRenderedStage = state.stage
  focusAfterRender(previousStage, previousFocusSelector)
  if (state.pendingExportFormat) requestAnimationFrame(() => app.querySelector('[data-action="cancel-export"]')?.focus())
  if (state.settingsOpen) requestAnimationFrame(() => app.querySelector('.settings-close')?.focus())
}

function resetViewport(targetSelector = null) {
  requestAnimationFrame(() => {
    if (targetSelector) {
      document.querySelector(targetSelector)?.scrollIntoView({ block: 'start' })
      return
    }
    window.scrollTo({ top: 0 })
  })
}

function withBreaks(value) {
  return value.replaceAll('\n', '<br />')
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character])
}

async function exportHistory(format) {
  const archive = historyRepository.exportArchive()
  const isJSON = format === 'json'
  const contents = isJSON
    ? JSON.stringify(archive, null, 2)
    : archive.records.map(record => [
      new Date(record.createdAt).toLocaleString(state.language === 'en' ? 'en-US' : 'zh-CN'),
      `${record.primary.number} · ${record.primary.name}${record.movingLines.length ? ` → ${record.relating.name}` : ''}`,
      record.question || localized('未写下问题', 'Question left unwritten'),
      `${localized('六爻', 'Six lines')}: ${record.lineValues.join(' · ')}`,
      record.review.note ? `${localized('事后对照', 'Later reflection')}: ${record.review.note}` : '',
    ].filter(Boolean).join('\n')).join('\n\n———\n\n')
  const extension = isJSON ? 'json' : 'txt'
  const type = isJSON ? 'application/json' : 'text/plain'
  const filename = `iching-reflection-backup-${new Date().toISOString().slice(0, 10)}.${extension}`
  const file = new File([contents], filename, { type })
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    try {
      await navigator.share({ files: [file], title: localized('周易留白备份', 'I Ching Reflection backup') })
      state.importMessage = localized('已打开系统分享面板。', 'The system share sheet was opened.')
      render()
      return
    } catch (error) {
      if (error?.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(file)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  state.importMessage = localized('备份已生成；请在系统下载或文件界面确认保存。', 'Backup created; confirm its location in Downloads or Files.')
  render()
}

async function importHistoryFile(file) {
  if (!file) return
  if (file.size > 5 * 1024 * 1024) throw new Error(localized('备份文件不得超过 5 MB。', 'Backup files must be 5 MB or smaller.'))
  const hasJSONName = file.name.toLocaleLowerCase().endsWith('.json')
  const hasJSONType = !file.type || ['application/json', 'text/json'].includes(file.type)
  if (!hasJSONName || !hasJSONType) throw new Error(localized('只能导入 JSON 备份文件。', 'Only JSON backup files can be imported.'))
  const payload = JSON.parse(await file.text())
  const result = historyRepository.importArchive(payload)
  state.importMessage = localized(
    `已校验并导入 ${result.imported} 条，当前共 ${result.total} 条${result.pruned ? `；因容量上限移除最旧 ${result.pruned} 条` : ''}。`,
    `Validated and imported ${result.imported}; ${result.total} total${result.pruned ? `; ${result.pruned} oldest removed to stay within capacity` : ''}.`
  )
  state.selectedHistoryID = ''
  render()
}

app.addEventListener('input', event => {
  if (event.target.id === 'question') state.question = event.target.value
  if (event.target.id === 'classic-search') {
    state.classicSearch = event.target.value
    render()
    const search = document.querySelector('#classic-search')
    search?.focus()
    search?.setSelectionRange(state.classicSearch.length, state.classicSearch.length)
  }
  if (event.target.id === 'history-search') {
    state.historySearch = event.target.value
    render()
    const search = document.querySelector('#history-search')
    search?.focus()
    search?.setSelectionRange(state.historySearch.length, state.historySearch.length)
  }
})

app.addEventListener('change', async event => {
  if (event.target.id === 'history-tag-filter') {
    state.historyTagFilter = event.target.value
    render()
    return
  }
  if (event.target.id === 'history-import') {
    try {
      await importHistoryFile(event.target.files?.[0])
    } catch (error) {
      state.importMessage = localized(`导入失败：${error.message || '文件无效'}`, `Import failed: ${error.message || 'invalid file'}`)
      render()
    }
  }
})

const topicDrag = {
  element: null,
  pointerId: null,
  startY: 0,
  startScrollTop: 0,
  moved: false,
}

let suppressTopicClick = false
let topicSelectionTimer = null

function selectCenteredTopic(scroller) {
  const buttons = [...scroller.querySelectorAll('[data-action="set-topic"]')]
  if (!buttons.length) return
  const scrollerRect = scroller.getBoundingClientRect()
  const centerY = scrollerRect.top + scrollerRect.height / 2
  const nearest = buttons.reduce((best, button) => {
    const rect = button.getBoundingClientRect()
    const distance = Math.abs(rect.top + rect.height / 2 - centerY)
    return !best || distance < best.distance ? { button, distance } : best
  }, null)?.button
  const value = nearest?.dataset.value
  if (!value || value === state.topic) return
  state.topic = value
  buttons.forEach(button => button.setAttribute('aria-pressed', String(button === nearest)))
  const questionInput = document.querySelector('#question')
  if (questionInput) {
    const chinesePlaceholder = topics[value].placeholder
    questionInput.placeholder = state.language === 'en'
      ? englishPlaceholders.get(chinesePlaceholder) || chinesePlaceholder
      : chinesePlaceholder
  }
}

app.addEventListener('pointerdown', event => {
  const scroller = event.target.closest('.topic-grid')
  if (!scroller || event.pointerType !== 'mouse' || event.button !== 0) return
  topicDrag.element = scroller
  topicDrag.pointerId = event.pointerId
  topicDrag.startY = event.clientY
  topicDrag.startScrollTop = scroller.scrollTop
  topicDrag.moved = false
  scroller.setPointerCapture(event.pointerId)
  scroller.classList.add('is-dragging')
})

app.addEventListener('pointermove', event => {
  if (!topicDrag.element || event.pointerId !== topicDrag.pointerId) return
  const distance = event.clientY - topicDrag.startY
  if (Math.abs(distance) > 5) topicDrag.moved = true
  if (!topicDrag.moved) return
  event.preventDefault()
  topicDrag.element.scrollTop = topicDrag.startScrollTop - distance
})

function endTopicDrag(event) {
  if (!topicDrag.element || event.pointerId !== topicDrag.pointerId) return
  const scroller = topicDrag.element
  suppressTopicClick = topicDrag.moved
  state.topicScrollTop = scroller.scrollTop
  scroller.classList.remove('is-dragging')
  if (scroller.hasPointerCapture(event.pointerId)) scroller.releasePointerCapture(event.pointerId)
  topicDrag.element = null
  topicDrag.pointerId = null
  topicDrag.moved = false
  if (suppressTopicClick) setTimeout(() => { suppressTopicClick = false }, 0)
}

app.addEventListener('pointerup', endTopicDrag)
app.addEventListener('pointercancel', endTopicDrag)

app.addEventListener('click', async event => {
  if (suppressTopicClick && event.target.closest('.topic-grid')) {
    event.preventDefault()
    suppressTopicClick = false
    return
  }
  const actionTarget = event.target.closest('[data-action]')
  const action = actionTarget?.dataset.action
  if (!action) return
  const value = actionTarget.dataset.value
  if (action === 'open-stage') {
    state.stage = ['opening', 'history', 'trust'].includes(value) ? value : 'opening'
    state.selectedHistoryID = ''
    render()
    resetViewport()
  }
  if (action === 'open-history-entry') {
    state.historyScrollTop = window.scrollY
    state.selectedHistoryID = value
    state.pendingDeleteID = ''
    render()
    resetViewport()
  }
  if (action === 'close-history-entry') {
    state.selectedHistoryID = ''
    state.pendingDeleteID = ''
    render()
    requestAnimationFrame(() => window.scrollTo({ top: state.historyScrollTop }))
  }
  if (action === 'save-review') {
    const date = document.querySelector('#review-date')?.value || null
    const note = document.querySelector('#review-note')?.value || ''
    const tags = (document.querySelector('#history-tags')?.value || '').split(/[,，]/)
    historyRepository.update(state.selectedHistoryID, {
      tags,
      review: {
        status: note.trim() ? 'revisited' : date ? 'scheduled' : 'none',
        scheduledFor: date,
        note,
        updatedAt: new Date().toISOString(),
      },
    })
    state.importMessage = localized('可选回看已保存在本机。', 'Optional revisit saved on this device.')
    render()
  }
  if (action === 'request-delete-history') {
    state.pendingDeleteID = state.selectedHistoryID
    render()
  }
  if (action === 'cancel-delete-history') {
    state.pendingDeleteID = ''
    render()
  }
  if (action === 'confirm-delete-history') {
    historyRepository.remove(state.selectedHistoryID)
    state.selectedHistoryID = ''
    state.pendingDeleteID = ''
    state.importMessage = localized('记录已从本机删除。', 'The record was deleted from this device.')
    render()
  }
  if (action === 'export-history') {
    state.exportReturnFocusSelector = focusSelectorFor(actionTarget)
    state.pendingExportFormat = ['json', 'text'].includes(value) ? value : ''
    render()
  }
  if (action === 'cancel-export') {
    state.pendingExportFormat = ''
    render()
    requestAnimationFrame(() => app.querySelector(state.exportReturnFocusSelector)?.focus())
  }
  if (action === 'confirm-export') {
    const format = state.pendingExportFormat
    state.pendingExportFormat = ''
    await exportHistory(format)
    requestAnimationFrame(() => app.querySelector(state.exportReturnFocusSelector)?.focus())
  }
  if (action === 'choose-history-import') document.querySelector('#history-import')?.click()
  if (action === 'set-history-period') {
    state.historyPeriodFilter = ['all', '7d', '30d', 'review'].includes(value) ? value : 'all'
    render()
  }
  if (action === 'clear-history-filters') {
    state.historySearch = ''
    state.historyTagFilter = ''
    state.historyPeriodFilter = 'all'
    render()
  }
  if (action === 'open-paywall') {
    const commerce = window.webkit?.messageHandlers?.commerce
    if (!commerce) {
      state.importMessage = localized('付费墙仅在 iOS 本地测试壳中可用。', 'The paywall is available only in the local iOS test shell.')
      render()
    } else {
      commerce.postMessage({ action: 'present-paywall' })
    }
  }
  if (action === 'request-feature') {
    const commerce = window.webkit?.messageHandlers?.commerce
    if (!commerce) {
      state.importMessage = localized('此功能需要本地测试权益；浏览器未连接 StoreKit。', 'This feature requires a local test entitlement; this browser is not connected to StoreKit.')
      render()
    } else {
      commerce.postMessage({ action: 'present-paywall', feature: value })
    }
  }
  if (action === 'set-language') {
    state.language = value === 'en' ? 'en' : 'zh'
    const url = new URL(window.location.href)
    if (state.language === 'en') url.searchParams.set('lang', 'en')
    else url.searchParams.delete('lang')
    window.history.replaceState({}, '', url)
    persistPreferences()
    render()
  }
  if (action === 'open-settings') {
    state.settingsReturnFocusSelector = focusSelectorFor(actionTarget)
    state.settingsOpen = true
    render()
  }
  if (action === 'close-settings') {
    state.settingsOpen = false
    render()
    requestAnimationFrame(() => app.querySelector(state.settingsReturnFocusSelector || '[data-action="open-settings"]')?.focus())
  }
  if (action === 'toggle-sound') {
    if (state.soundEnabled) {
      stopSoundscape()
      state.soundEnabled = false
      setNativeCoinAudioEnabled(false)
    } else {
      let webAudioStarted = false
      try {
        webAudioStarted = await startSoundscape()
      } catch {
        webAudioStarted = false
      }
      state.soundEnabled = webAudioStarted || nativeCoinAudioAvailable()
      setNativeCoinAudioEnabled(state.soundEnabled)
    }
    persistPreferences()
    render()
  }
  if (action === 'set-topic') {
    state.topicScrollTop = actionTarget.closest('.topic-grid')?.scrollTop || state.topicScrollTop
    state.topic = value
    render()
  }
  if (action === 'set-casting-mode') {
    if (state.isTossing) return
    state.castingMode = value === 'random' ? 'random' : 'manual'
    state.coinFaces = [null, null, null]
    render()
  }
  if (action === 'toggle-coin') {
    const index = Number(actionTarget.dataset.index)
    const current = state.coinFaces[index]
    state.coinFaces[index] = current === 'heads' ? 'tails' : 'heads'
    triggerNativeHaptic('selection')
    render()
  }
  if (action === 'record-line' && state.coinFaces.every(Boolean)) {
    const faces = [...state.coinFaces]
    playCoinSound(faces)
    triggerNativeHaptic('coin-settle')
    await recordCastLine(coinFacesToLineValue(faces), faces)
  }
  if (action === 'random-line') {
    await tossAndRecordLine()
  }
  if (action === 'finish-casting') await finishCastingIfReady()
  if (action === 'previous-reading' && state.thresholdStep > 0) {
    state.thresholdStep -= 1
    render()
  }
  if (action === 'undo-line') {
    state.castLines.pop()
    state.lastCastFaces = []
    state.coinFaces = [null, null, null]
    render()
  }
  if (action === 'restart-casting') {
    resetCasting()
    render()
  }
  if (action === 'cancel-casting') {
    resetCasting()
    state.stage = 'opening'
    render()
    resetViewport()
  }
  if (action === 'enter') {
    state.question = document.querySelector('#question')?.value.trim() || ''
    resetCasting()
    state.stage = 'casting'
    render()
    resetViewport()
    await ensureIChingContent()
    if (state.ichingContentError) render()
  }
  if (action === 'leave') {
    state.stage = 'opening'
    state.thresholdStep = 0
    render()
    resetViewport()
  }
  if (action === 'open-classics') {
    state.libraryReturnStage = state.stage
    state.stage = 'classics'
    state.settingsOpen = false
    state.selectedClassicPath = ''
    state.classicText = ''
    render()
    resetViewport()
    await ensureClassicManifest()
  }
  if (action === 'open-classic') {
    state.libraryReturnStage = state.stage
    state.stage = 'classics'
    render()
    resetViewport()
    await openClassic(actionTarget.dataset.path)
  }
  if (action === 'open-zhouyi-source') {
    state.libraryReturnStage = state.stage
    state.stage = 'classics'
    render()
    resetViewport()
    if (!(await ensureClassicManifest())) return
    const entry = zhouyiClassicEntry()
    if (!entry) {
      state.classicError = localized('典籍清单中没有找到《周易》原文。', 'The Zhouyi source was not found in the classics manifest.')
      render()
      return
    }
    await openClassic(entry.path)
  }
  if (action === 'select-classic') await openClassic(actionTarget.dataset.path)
  if (action === 'close-classic') {
    state.selectedClassicPath = ''
    state.classicText = ''
    state.classicError = ''
    render()
    resetViewport()
  }
  if (action === 'leave-classics') {
    state.stage = state.libraryReturnStage || 'opening'
    state.selectedClassicPath = ''
    state.classicText = ''
    state.classicError = ''
    render()
    resetViewport()
  }
  if (action === 'continue') {
    const lastStep = currentVariant() === 'D' ? 5 : 3
    state.thresholdStep = Math.min(state.thresholdStep + 1, lastStep)
    playPassageChime(state.thresholdStep)
    render()
    resetViewport('.resonance-fragment.is-current, .threshold-stage')
  }
  if (action === 'previous') cycleVariant(-1)
  if (action === 'next') cycleVariant(1)
})

window.addEventListener('keydown', event => {
  if (state.settingsOpen) {
    const dialog = app.querySelector('.settings-sheet')
    if (!dialog) return
    if (event.key === 'Escape') {
      event.preventDefault()
      state.settingsOpen = false
      render()
      requestAnimationFrame(() => app.querySelector(state.settingsReturnFocusSelector || '[data-action="open-settings"]')?.focus())
      return
    }
    if (event.key === 'Tab') {
      const focusable = [...dialog.querySelectorAll('button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      const first = focusable[0]; const last = focusable.at(-1)
      if (first && last && event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (first && last && !event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    return
  }
  if (state.pendingExportFormat) {
    const dialog = app.querySelector('.confirmation-dialog')
    if (!dialog) return
    if (event.key === 'Escape') {
      event.preventDefault()
      state.pendingExportFormat = ''
      render()
      requestAnimationFrame(() => app.querySelector(state.exportReturnFocusSelector)?.focus())
      return
    }
    if (event.key === 'Tab') {
      const focusable = [...dialog.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      const first = focusable[0]
      const last = focusable.at(-1)
      if (first && last && event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (first && last && !event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    return
  }
  if (state.stage === 'casting') {
    const dialog = app.querySelector('.casting-dialog')
    if (!dialog) return
    if (event.key === 'Escape' && !state.isTossing) {
      event.preventDefault()
      resetCasting()
      state.stage = 'opening'
      render()
      resetViewport()
      return
    }
    if (event.key === 'Tab') {
      const focusable = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter(element => element instanceof HTMLElement && !element.hidden)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    return
  }
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return
  if (state.stage !== 'reading') return
  if (event.key === 'ArrowLeft') cycleVariant(-1)
  if (event.key === 'ArrowRight') cycleVariant(1)
})

render()
