// Build first: node website/scripts/build.mjs
// Preview: node --env-file=<public-catalog-env> website/scripts/preview.mjs
// An optional --catalog-json <public RPC snapshot> supports offline visual QA.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHandler } from '../api/question-papers.mjs';
import { validateCatalog } from '../_src/question-paper-catalog.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const snapshot = process.argv.indexOf('--catalog-json');
const rows = snapshot >= 0 ? validateCatalog(JSON.parse(await readFile(process.argv[snapshot + 1], 'utf8'))) : null;
const catalog = rows ? createHandler(async () => rows) : createHandler();
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json', '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon', '.txt':'text/plain' };
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/question-papers' || path.startsWith('/question-papers/') || path === '/sitemap.xml' || path.startsWith('/sitemaps/')) return catalog(req, res);
  try {
    const shared = path.match(/^\/(question-paper|note|quiz)\//);
    const clean = shared ? '/' + shared[1] : path;
    const name = clean === '/' ? 'index.html' : decodeURIComponent(clean.slice(1));
    // Only public artifacts, never source, scripts, dotfiles or credentials.
    if (name.split('/').some(s => s.startsWith('.') || s.startsWith('_')) || name.startsWith('scripts/') || name.startsWith('api/')) throw new Error('Not public');
    let file = resolve(root, name);
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) throw new Error('Invalid path');
    if (!extname(file)) file += '.html';
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(req.method === 'HEAD' ? '' : await readFile(file));
  } catch {
    res.writeHead(404, { 'Content-Type':'text/html; charset=utf-8' });
    res.end(await readFile(resolve(root, '404.html')));
  }
});
server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log(`MedVeda preview: http://127.0.0.1:${server.address().port}${rows ? ' (public catalog snapshot)' : ''}`));
