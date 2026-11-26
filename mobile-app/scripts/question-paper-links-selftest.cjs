const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const codecPath = path.resolve(__dirname, '../src/features/question-papers/questionPaperLinks.js');
// Missing exports are reported as behavior failures before the codec exists.
const links = fs.existsSync(codecPath) ? require(codecPath) : {};
assert.equal(typeof links.paperShareUrl, 'function', 'Permanent Question Paper URL builder is required');
const id = '11111111-1111-4111-8111-111111111111';
const now = 1800000000000;
assert.equal(links.paperShareUrl(id), 'https://www.medveda.in/question-paper/11111111-1111-4111-8111-111111111111');
for (const bad of ['', '../x', id + '.pdf', 'https://evil.test', null, id + '?token=x', id + '\n', id + '\r']) assert.throws(() => links.paperShareUrl(bad));
for (const url of ['https://www.medveda.in/question-paper/' + id, 'medveda://question-paper/' + id]) assert.equal(links.parsePaperLink(url).id, id);
for (const url of [
 'http://www.medveda.in/question-paper/' + id, 'https://medveda.in/question-paper/' + id,
 'https://www.medveda.in.evil.test/question-paper/' + id, 'https://evil@www.medveda.in/question-paper/' + id,
 'https://www.medveda.in/question-paper/../' + id, 'https://www.medveda.in/question-paper/%31' + id.slice(1),
 'https://www.medveda.in/question-paper/' + id + '?token=x', 'medveda://question-paper/' + id + '#x',
 'https://www.medveda.in/question-paper/' + id + '/extra',
 'https://www.medveda.in/question-paper/' + id + '\n',
]) assert.equal(links.parsePaperLink(url)?.id, undefined, url);
assert.equal(links.parsePaperLink('medveda://reset-password#token=x'), null);
assert.equal(links.parsePaperLink('https://other.test/question-paper/no'), null);
assert.equal(links.parsePaperLink('https://www.medveda.in/question-paper/no').invalid, true);
const play = links.paperPlayUrl(id, now);
assert.equal(play, 'https://play.google.com/store/apps/details?id=in.medveda.app&referrer=mv_qp%3Dv1%253A11111111-1111-4111-8111-111111111111%253A1800000000');
const referrer = new URL(play).searchParams.get('referrer');
assert.equal(links.parsePaperReferrer(referrer, now, now).id, id);
for (const raw of ['', 'referral=REWARD', referrer + '&mv_qp=x', 'mv_qp=v2%3Ax', 'mv_qp=https://evil.test', 'mv_qp=%E0%A4%A', 'x'.repeat(4097)]) assert.equal(links.parsePaperReferrer(raw, now, now), null);
assert.equal(links.parsePaperReferrer(referrer, now + 8*86400000, now), null, 'Old referrer rejected');
assert.equal(links.parsePaperReferrer(referrer, now - 600000, now - 600000), null, 'Future referrer rejected');
assert.equal(links.parsePaperReferrer(referrer, now, now - 86400000), null, 'Existing install cannot adopt newer referral');
// Same codec must run without Node in the static website.
const browser = { URLSearchParams }; vm.runInNewContext(fs.readFileSync(codecPath, 'utf8'), browser);
assert.equal(browser.MedvedaPaperLinks.paperPlayUrl(id, now), play);
console.log('PASS permanent URLs, strict App Link parsing, isolated/stale/future install referrals and website codec');
