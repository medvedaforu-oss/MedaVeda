const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const links = require('../../mobile-app/src/features/question-papers/questionPaperLinks.js');
const root = require('node:path').resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(root + '/vercel.json'));
const id = '11111111-1111-4111-8111-111111111111', PLAY = 'https://play.google.com/store/apps/details?id=in.medveda.app';
for (const type of ['question-paper', 'note', 'quiz']) {
  const rewrite = config.rewrites.find(r => r.source.startsWith('/' + type + '/:'));
  assert.equal(rewrite.destination, '/' + type + '.html');
  assert(config.headers.find(r => r.source === '/' + type + '/:path*').headers.some(h => h.key === 'X-Robots-Tag' && h.value.includes('noindex')));
  for (const suffix of [id, 'bad', id + '/extra', id + '%3Ftoken=SECRET']) {
    const open = { hidden: true, classList: { remove() {} } }, message = {}, download = { href: PLAY, addEventListener: (_, fn) => { download.click = fn; } };
    vm.runInNewContext(fs.readFileSync(root + '/assets/js/question-paper.js', 'utf8'), {
      window: { location: { pathname: '/' + type + '/' + suffix }, navigator: { userAgent: 'Android' } },
      document: { getElementById: id => id === 'paper-open' ? open : message, querySelectorAll: () => [download] }, MedvedaPaperLinks: links, Date });
    if (suffix === id) {
      assert.equal(open.hidden, false); assert.equal(open.href, 'medveda://' + type + '/' + id);
      const play = new URL(download.href); assert.equal(play.searchParams.get('id'), 'in.medveda.app');
      assert.deepEqual(links.parseContentReferrer(play.searchParams.get('referrer'), Date.now(), Date.now()), { type, id });
    } else { assert.equal(open.hidden, true); assert.equal(download.href, PLAY); assert.match(message.textContent, /invalid/i); }
  }
  const html = fs.readFileSync(root + '/' + type + '.html', 'utf8');
  assert.match(html, /name="robots" content="noindex/); assert(html.includes(PLAY));
  assert(!/supabase.js|signedUrl|object_path|<iframe|<object|correctAnswer/.test(html));
  assert(!fs.readFileSync(root + '/sitemap.xml', 'utf8').includes('/' + type));
}
assert.equal(fs.readFileSync(root + '/assets/js/question-paper-links.js','utf8'), fs.readFileSync(root + '/../mobile-app/src/features/question-papers/questionPaperLinks.js','utf8'));
const dal = JSON.parse(fs.readFileSync(root + '/.well-known/assetlinks.json'));
assert.equal(dal[0].target.sha256_cert_fingerprints.length, 3); assert.equal(dal[0].target.package_name, 'in.medveda.app');
const app = fs.readFileSync(root + '/../mobile-app/app.config.js', 'utf8');
assert(app.includes('["/question-paper/", "/note/", "/quiz/"]'));
console.log('PASS three narrow App Link paths, unchanged three DAL fingerprints, website fallback rewrites/noindex/private-content exclusion, official encoded Google Play destinations, and matching shared codec');
