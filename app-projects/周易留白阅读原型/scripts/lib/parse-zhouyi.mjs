const SECTION_HEADING = /^《([^》]+)第[^》]+》[^\n]*$/gm
const LINE_HEADING = /^(初[六九]|[六九][二三四五]|上[六九])[、：]$/

function compact(lines) {
  return lines
    .map(line => line.trim())
    .filter(Boolean)
    .join('')
    .replaceAll('「', '')
    .replaceAll('」', '')
}

function passageAfterMarker(lines, markerIndex, endIndex) {
  if (markerIndex < 0) return ''
  return compact(lines.slice(markerIndex + 1, endIndex))
}

export function parseZhouyi(source) {
  const headings = [...source.matchAll(SECTION_HEADING)]
  const sections = headings.slice(0, 64).map((match, index) => ({
    name: match[1],
    start: match.index + match[0].length,
    end: headings[index + 1]?.index ?? source.length,
  }))

  return sections.map((section, index) => {
    const lines = source.slice(section.start, section.end).split(/\r?\n/)
    const lineHeadingIndexes = lines.flatMap((line, lineIndex) => LINE_HEADING.test(line.trim()) ? [lineIndex] : [])
    const firstLineIndex = lineHeadingIndexes[0] ?? lines.length
    const judgmentStart = lines.findIndex(line => line.trim().startsWith(`《${section.name}》`))
    const judgementStops = [
      lines.findIndex((line, lineIndex) => lineIndex > judgmentStart && line.trim().startsWith('《彖》')),
      firstLineIndex,
    ].filter(value => value >= 0)
    const judgmentEnd = Math.min(...judgementStops)
    const judgment = compact(lines.slice(judgmentStart, judgmentEnd)).replace(`《${section.name}》`, '')

    const imageMarker = lines.findIndex((line, lineIndex) => lineIndex < firstLineIndex && line.trim() === '《象》曰：')
    const image = passageAfterMarker(lines, imageMarker, firstLineIndex)

    const parsedLines = lineHeadingIndexes.map((lineIndex, linePosition) => {
      const nextLineIndex = lineHeadingIndexes[linePosition + 1] ?? lines.length
      const slice = lines.slice(lineIndex + 1, nextLineIndex)
      const imageIndex = slice.findIndex(line => line.trim() === '《象》曰：')
      const appendixIndex = slice.findIndex(line => /^《(彖|文言)》/.test(line.trim()))
      const textEnd = Math.min(...[imageIndex, appendixIndex, slice.length].filter(value => value >= 0))
      const imageEnd = appendixIndex >= 0 && appendixIndex > imageIndex ? appendixIndex : slice.length
      return {
        label: lines[lineIndex].trim().replace(/[、：]$/, ''),
        text: compact(slice.slice(0, textEnd)),
        image: imageIndex >= 0 ? compact(slice.slice(imageIndex + 1, imageEnd)) : '',
      }
    })

    return {
      number: index + 1,
      name: section.name,
      symbol: String.fromCodePoint(0x4dc0 + index),
      judgment,
      image,
      lines: parsedLines,
    }
  })
}
