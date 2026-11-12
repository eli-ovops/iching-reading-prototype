import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const port = Number(process.env.PORT || 4174)
const classicsRoot = resolve(root, 'content/classics/library')
const ichingContentPath = resolve(root, 'content/iching/hexagrams.json')
const allowed = new Set([
  '/index.html',
  '/styles.css',
  '/app.js',
  '/iching-core.js',
  '/reflection-prompts.js',
  '/reflection-store.js',
  '/soundscape.js',
  '/assets/taiji-bagua.svg',
])
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

createServer(async (request, response) => {
  let pathname
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname)
  } catch {
    response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Malformed request path.')
    return
  }
  const requested = pathname === '/' ? '/index.html' : pathname
  const filePath = resolve(root, `.${requested}`)
  const isClassicContent = filePath.startsWith(`${classicsRoot}${sep}`) && ['.json', '.txt'].includes(extname(filePath))
  const isIChingContent = filePath === ichingContentPath

  if (!allowed.has(requested) && !isClassicContent && !isIChingContent) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Prototype route not found.')
    return
  }

  try {
    const body = await readFile(filePath)
    response.writeHead(200, { 'content-type': types[extname(filePath)] })
    response.end(body)
  } catch (error) {
    if (error.code === 'ENOENT') {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      response.end('Prototype route not found.')
      return
    }
    throw error
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`I Ching open-reading prototype: http://127.0.0.1:${port}`)
})
