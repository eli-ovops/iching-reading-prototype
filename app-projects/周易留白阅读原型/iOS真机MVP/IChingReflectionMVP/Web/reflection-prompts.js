const HEXAGRAM_LENSES = [
  null,
  ['主动与创造', 'initiative and creation', '哪里需要你主动开端，哪里又不宜只凭意志推进？', 'Where is an active beginning needed, and where might willpower alone be insufficient?'],
  ['承载与回应', 'receptivity and support', '什么需要被承接、容纳，而不是立刻改变？', 'What needs to be received and held before it is changed?'],
  ['初生的困难', 'difficulty at the beginning', '事情刚刚成形时，哪一种混乱其实是必经的？', 'While things are still forming, which confusion may simply belong to the beginning?'],
  ['未知与求问', 'not knowing and learning', '你真正缺少的是答案，还是提出一个更诚实的问题？', 'Do you lack an answer, or a more honest question?'],
  ['等待与准备', 'waiting and preparation', '在不能催熟的部分之外，你现在还能准备什么？', 'Beyond what cannot be hurried, what can still be prepared now?'],
  ['分歧与争执', 'conflict and disagreement', '这场分歧真正需要澄清的是事实、立场，还是边界？', 'What needs clarifying here: facts, positions, or boundaries?'],
  ['组织与同行', 'coordination and collective effort', '若要与人同行，什么秩序必须先被共同看见？', 'If people are to move together, what order must first become visible to everyone?'],
  ['亲近与选择', 'closeness and affiliation', '你正在靠近谁，又依据什么决定彼此是否同行？', 'Whom are you drawing closer to, and what tells you whether to continue together?'],
  ['小步积蓄', 'small accumulations', '眼前尚未突破时，哪些微小积累正在发挥作用？', 'Before a breakthrough, which small accumulations are already doing their work?'],
  ['谨慎履行', 'careful conduct', '哪一步既需要勇气，也需要对后果保持清醒？', 'Which step asks for courage while keeping its consequences clearly in view?'],
  ['通达与交换', 'flow and exchange', '什么正在顺畅往来，而你怎样才能不把通达当成理所当然？', 'What is moving freely, and how might you avoid taking that openness for granted?'],
  ['阻隔与停滞', 'blockage and standstill', '当上下无法相通时，什么值得守住，什么应停止消耗？', 'When connection is blocked, what is worth preserving and what should stop consuming you?'],
  ['求同与共事', 'fellowship and shared purpose', '真正能让彼此并肩的，是相似，还是共同承担的事？', 'What truly lets people stand together: similarity, or something they are willing to carry together?'],
  ['拥有与分配', 'abundance and stewardship', '当资源已经在手，最难的部分是拥有，还是如何使用？', 'When resources are already present, is the harder question having them or using them well?'],
  ['谦退与分寸', 'modesty and proportion', '怎样的退后能让真实能力更清楚，而不是把自己缩小？', 'What kind of stepping back reveals real capacity rather than making you smaller?'],
  ['预备与动员', 'readiness and momentum', '热情已经出现时，什么能让它成为行动而非一时高涨？', 'Once enthusiasm appears, what turns it into action rather than a passing surge?'],
  ['顺势与选择', 'following and choice', '你是在顺应真实变化，还是把随波逐流误认成顺势？', 'Are you following a real change, or mistaking drift for responsiveness?'],
  ['修复旧事', 'repairing what has decayed', '哪一处旧问题已不能靠回避维持，需要被认真整理？', 'Which old problem can no longer be sustained through avoidance and needs careful repair?'],
  ['靠近与照看', 'approach and attentive presence', '当你走近一个人或一件事时，什么需要被看见而非接管？', 'As you approach someone or something, what needs to be seen rather than taken over?'],
  ['观看与被看见', 'observation and being seen', '如果暂不行动，你会从局面中看见什么，也会让别人看见什么？', 'If you pause before acting, what might you see—and what might others see in you?'],
  ['咬开阻碍', 'decisive clarification', '什么障碍必须被明确说出，含混反而会让它继续存在？', 'Which obstacle must be named clearly because ambiguity allows it to persist?'],
  ['修饰与本质', 'form and substance', '哪些形式正在帮助内容被看见，哪些只是在遮盖空缺？', 'Which forms help the substance become visible, and which merely cover an absence?'],
  ['剥落与舍弃', 'stripping away', '当外层正在脱落时，什么才是不可再减的核心？', 'As outer layers fall away, what remains essential and cannot be reduced further?'],
  ['返回与重新开始', 'return and beginning again', '什么值得回到原点重看，而不是继续沿旧方向用力？', 'What is worth returning to and seeing again rather than pushing further along the old direction?'],
  ['自然与不妄为', 'naturalness and freedom from pretence', '如果不靠预设和表演，你最自然的回应会是什么？', 'Without performance or a fixed script, what would your most natural response be?'],
  ['蓄力与克制', 'stored strength and restraint', '你正在积蓄什么，而何时不用它也同样重要？', 'What are you building strength for, and when might not using it matter just as much?'],
  ['滋养与摄取', 'nourishment and intake', '你反复摄取的语言、关系与习惯，正在怎样塑造你？', 'How are the words, relationships, and habits you repeatedly take in shaping you?'],
  ['过度承重', 'excessive load', '哪一根支柱承担得太多，已经需要重新分配重量？', 'Which support is carrying too much and now needs the weight redistributed?'],
  ['反复涉险', 'repeated difficulty', '同一种困难再次出现时，这次有哪些细节与过去不同？', 'When the same difficulty returns, what details are different this time?'],
  ['依附与照明', 'clarity and attachment', '什么使你看得更清楚，又有什么让你因依附而失去判断？', 'What brings clarity, and what attachment may be clouding your judgment?'],
  ['感应与相互影响', 'influence and mutual response', '这份触动来自真实相遇，还是来自你对回应的期待？', 'Does this influence arise from a real encounter, or from your expectation of a response?'],
  ['恒久与更新', 'continuity and renewal', '什么值得持续，而持续它需要怎样的小幅更新？', 'What deserves continuity, and what small renewal would help it endure?'],
  ['退避与保全', 'strategic retreat', '怎样的距离能保护重要之物，而不是逃避必须面对的事？', 'What distance protects what matters without becoming avoidance?'],
  ['力量与节制', 'strength and restraint', '当你有能力推动事情时，什么能防止力量走得过头？', 'When you can push things forward, what keeps strength from going too far?'],
  ['显现与前进', 'emergence and progress', '什么正在逐渐被看见，而你是否准备好承担随之而来的位置？', 'What is becoming visible, and are you ready to inhabit the position that follows?'],
  ['受伤的光', 'light under pressure', '在不适合完全显露的时候，你要怎样保存内在的清楚？', 'When full visibility is unsafe, how might you preserve inner clarity?'],
  ['家内的秩序', 'order within the household', '亲近之中，哪些角色和责任需要重新说清？', 'Within closeness, which roles and responsibilities need to be named again?'],
  ['差异与背向', 'difference and divergence', '哪些差异可以共存，哪些已经让彼此走向不同方向？', 'Which differences can coexist, and which are already pulling people in different directions?'],
  ['受阻与绕行', 'obstruction and alternate paths', '道路不通时，真正需要改变的是目标、路径，还是同行的人？', 'When the road is blocked, what needs changing: the goal, the path, or the companions?'],
  ['松解与释放', 'release and untangling', '什么结已经可以松开，而你为何仍握着它？', 'Which knot is ready to loosen, and why might you still be holding it?'],
  ['减损与取舍', 'decrease and choice', '减少哪一部分，反而会让真正重要的部分更完整？', 'What could be reduced so that what matters most becomes more whole?'],
  ['增益与分享', 'increase and contribution', '这份增长若不只属于你，它可以流向哪里？', 'If this growth is not yours alone, where might it flow?'],
  ['决断与公开', 'resolution and declaration', '什么已经到了需要明确表达的时刻，又该用怎样的方式说出？', 'What now needs to be stated clearly, and how should it be said?'],
  ['意外相遇', 'unexpected encounter', '这个突然出现的人或机会，触动了你哪一部分未曾预备的自己？', 'What unprepared part of you is touched by this unexpected person or opportunity?'],
  ['汇聚与聚焦', 'gathering and convergence', '人事正在汇聚时，什么共同中心能避免只有热闹没有方向？', 'As people and matters gather, what shared center keeps activity from losing direction?'],
  ['渐次上升', 'gradual ascent', '哪一级台阶必须亲自走过，无法用一次跃升代替？', 'Which step must be lived through and cannot be replaced by a single leap?'],
  ['受限与内在空间', 'constraint and inner space', '外在余地很小时，你仍能在哪个内在位置保持自由？', 'When outer room is limited, where can you still preserve inner freedom?'],
  ['共同的源泉', 'the shared well', '什么资源一直都在，却因为取用方式不对而没有真正抵达？', 'What resource has long been present but has not arrived because of how it is being drawn?'],
  ['变革与换皮', 'transformation and renewal', '真正需要改变的是表面做法，还是维持它的旧结构？', 'What truly needs changing: the visible practice, or the old structure sustaining it?'],
  ['转化与成器', 'transformation and cultivation', '散乱的材料要经过怎样的转化，才能成为可承载之物？', 'What transformation would let scattered material become something capable of holding value?'],
  ['震动与醒觉', 'shock and awakening', '突如其来的震动打断了什么，又让什么第一次变得清楚？', 'What did the shock interrupt, and what did it make clear for the first time?'],
  ['停止与边界', 'stillness and boundaries', '此刻真正的停止，是僵住不动，还是知道应停在哪里？', 'Is stillness here a freeze, or knowing exactly where to stop?'],
  ['渐进与成熟', 'gradual development', '什么只能通过时间和次序成熟，不能靠更用力来加速？', 'What can mature only through time and sequence rather than greater force?'],
  ['位置不相称', 'a mismatch of position', '你所在的位置与真实关系之间，哪一处并不相称？', 'Where is there a mismatch between your position and the relationship as it really is?'],
  ['丰盛与高峰', 'fullness and culmination', '当事情最盛大、最明亮时，什么容易被光芒遮住？', 'When things are fullest and brightest, what can the brightness conceal?'],
  ['旅途与暂居', 'journey and impermanence', '在暂时停留之处，什么可以投入，什么不宜假装已经扎根？', 'In a temporary place, what can be engaged with and what should not pretend to be rooted?'],
  ['渗入与反复', 'gentle penetration', '什么改变无法靠一次说明完成，只能通过反复而温和的进入？', 'What change cannot happen through one declaration but only through gentle repetition?'],
  ['喜悦与交流', 'joy and exchange', '这份交流带来的愉悦，是彼此滋养，还是对认同的依赖？', 'Is the pleasure in this exchange mutual nourishment, or dependence on approval?'],
  ['涣散与重聚', 'dispersion and reconnection', '什么正在散开，而真正需要重新连结的核心是什么？', 'What is dispersing, and what core truly needs to be reconnected?'],
  ['节制与尺度', 'limits and proportion', '哪一种限制在保护你，哪一种已经变成不必要的苦守？', 'Which limit protects you, and which has become unnecessary severity?'],
  ['内在诚信', 'inner truth and trust', '抛开取悦与防备，你内心真正愿意回应的是什么？', 'Beyond pleasing and defending, what are you inwardly willing to respond to?'],
  ['小处越界', 'attention to the small', '哪一件看似微小的事，需要比宏大计划更谨慎地处理？', 'Which seemingly small matter needs more care than the larger plan?'],
  ['完成后的警觉', 'vigilance after completion', '事情看似完成后，哪一个细节最容易因为放松而失序？', 'Once things appear complete, which detail is most likely to slip through relaxation?'],
  ['尚未完成', 'the unfinished crossing', '在抵达之前，什么仍需保持耐心，不能提前当作已经完成？', 'Before arrival, what still asks for patience and must not be treated as already complete?'],
]

const TOPIC_QUESTIONS = {
  relationship: [
    ['回到这段关系，哪些回应已经发生，哪些仍只是你的猜测？', 'Returning to this relationship, which responses have actually happened and which remain assumptions?'],
    ['在靠近与保留自己之间，你现在最需要看清哪条界线？', 'Between drawing closer and keeping yourself, which boundary most needs clarity now?'],
    ['如果暂不判断对错，这段关系正在重复怎样的相处方式？', 'Without deciding who is right, what pattern of relating is repeating here?'],
    ['什么需要被直接表达，而不再交给对方猜测？', 'What needs to be said directly rather than left for the other person to guess?'],
  ],
  work: [
    ['回到工作或创造，什么正在产生真实反馈，什么只有忙碌的外表？', 'In work or creation, what is producing real feedback and what only looks busy?'],
    ['眼前最值得保护的是速度、质量，还是你工作的理由？', 'What most deserves protection now: speed, quality, or the reason you are doing the work?'],
    ['哪些合作正在放大价值，哪些正在稀释注意力？', 'Which collaborations amplify value, and which dilute attention?'],
    ['如果只能推进一件事，哪一件最能让局面真正向前？', 'If only one thing could move forward, which would genuinely shift the situation?'],
  ],
  money: [
    ['回到资源与取舍，哪些是实际需要，哪些来自对不确定的反应？', 'With resources and trade-offs, which needs are real and which are reactions to uncertainty?'],
    ['什么值得投入，必须先用什么边界保护？', 'What deserves investment, and what boundary must protect it first?'],
    ['这次选择的代价，哪一部分容易被你低估？', 'Which cost of this choice are you most likely to underestimate?'],
    ['除了得到更多，还有什么方式能让现有资源流动起来？', 'Besides gaining more, how else might existing resources begin to move?'],
  ],
  family: [
    ['回到家人与亲情，哪些责任是共同承担，哪些被默默放在一个人身上？', 'Within family, which responsibilities are shared and which have quietly fallen on one person?'],
    ['什么关心可以被感受到，什么关心反而变成了控制？', 'Which care can be felt as care, and which has become control?'],
    ['哪些旧角色仍在影响你们今天的对话？', 'Which old roles are still shaping today’s conversations?'],
    ['有什么话需要换一种方式说，才可能真正被听见？', 'What needs to be said differently in order to be truly heard?'],
  ],
  change: [
    ['面对这次变化，哪些条件已经成熟，哪些仍只是愿望？', 'Facing this change, which conditions are ready and which remain wishes?'],
    ['如果不急着抵达，下一步最小而真实的动作是什么？', 'Without rushing to arrive, what is the smallest real next move?'],
    ['你想改变的是局面本身，还是自己在局面中的位置？', 'Do you want to change the situation itself, or your place within it?'],
    ['什么旧安排必须结束，新的空间才会出现？', 'What old arrangement must end before new room can appear?'],
  ],
  self: [
    ['回到自己，哪些声音属于你的真实意愿，哪些来自他人的期待？', 'Returning to yourself, which voices express your own willingness and which come from others’ expectations?'],
    ['如果无需立即解释，你最想允许哪一种感受先存在？', 'If no explanation were required yet, which feeling would you allow to exist first?'],
    ['你正在保护真正重要的自己，还是保护一个必须维持的形象？', 'Are you protecting what truly matters in you, or an image you feel obliged to maintain?'],
    ['此刻更需要向外行动，还是向内确认？', 'Does this moment ask more for outward action or inward confirmation?'],
  ],
}

const LINE_QUESTIONS = [
  ['变化始于初爻：最早出现、却还没有被认真看见的迹象是什么？', 'Change begins at the first line: what early sign has not yet been taken seriously?'],
  ['变化落在二爻：当回应开始出现，什么值得自然发生而不必用力证明？', 'Change rests at the second line: as response appears, what can unfold without being forced or proved?'],
  ['变化落在三爻：走到进退之间，哪一种反复正在消耗判断？', 'Change rests at the third line: between advance and retreat, what repetition is wearing down judgment?'],
  ['变化落在四爻：接近新的位置时，什么需要先被确认而不是急着跨越？', 'Change rests at the fourth line: near a new position, what needs confirming before it is crossed?'],
  ['变化落在五爻：当你有更多影响力时，怎样的回应才与这个位置相称？', 'Change rests at the fifth line: with greater influence, what response is proportionate to that position?'],
  ['变化走到上爻：什么已经抵达尽头，需要转向而非继续加力？', 'Change reaches the top line: what has reached its limit and asks for a turn rather than more force?'],
]

function localized(pair, language) {
  return pair[language === 'en' ? 1 : 0]
}

export function buildReflectionQuestions({
  hexagramNumber,
  hexagramName,
  relatingName = '',
  movingLines = [],
  topic = 'self',
  language = 'zh',
}) {
  const lens = HEXAGRAM_LENSES[hexagramNumber]
  const topicQuestions = TOPIC_QUESTIONS[topic]
  if (!lens || !topicQuestions) throw new RangeError('无法为当前卦象或关注方向生成开放式问题。')

  const first = language === 'en'
    ? `Hexagram ${hexagramNumber}, ${hexagramName}, brings ${lens[1]} into view. ${lens[3]}`
    : `第${hexagramNumber}卦「${hexagramName}」让人看见“${lens[0]}”。${lens[2]}`

  let second
  if (movingLines.length === 0) {
    second = language === 'en'
      ? 'All six lines are still. If the situation remains as it is for now, what deserves continued attention?'
      : '六爻皆静。如果局面暂时保持原样，什么仍值得继续观察？'
  } else if (movingLines.length === 1) {
    second = localized(LINE_QUESTIONS[movingLines[0] - 1], language)
  } else {
    const firstLine = Math.min(...movingLines)
    const lastLine = Math.max(...movingLines)
    second = language === 'en'
      ? `Change moves from line ${firstLine} to line ${lastLine}${relatingName ? `, toward ${relatingName}` : ''}. Which change is central, and which ones merely follow it?`
      : `变化从第${firstLine}爻延伸到第${lastLine}爻${relatingName ? `，并显出「${relatingName}」` : ''}。哪一个变化是核心，哪些只是随之而动？`
  }

  const variantIndex = (hexagramNumber + movingLines.reduce((sum, line) => sum + line, 0)) % topicQuestions.length
  const third = localized(topicQuestions[variantIndex], language)

  const labels = language === 'en'
    ? ['From the hexagram', 'Where change rests', 'Back to your question']
    : ['从卦中看', '变化所在', '回到所问']

  return [first, second, third].map((text, index) => ({ label: labels[index], text }))
}

export function reflectionCoverage() {
  return {
    hexagrams: HEXAGRAM_LENSES.slice(1).length,
    topics: Object.keys(TOPIC_QUESTIONS).length,
    linePositions: LINE_QUESTIONS.length,
  }
}
