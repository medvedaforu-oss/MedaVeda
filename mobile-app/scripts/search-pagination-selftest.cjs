const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../node_modules/typescript');
function load(file, mocks) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname + '/../src/repositories/' + file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => { assert.ok(name in mocks, name); return mocks[name]; } });
  return exports;
}
const pagination = load('searchPagination.ts', {});
const rows = Array.from({ length: 2601 }, (_, i) => ({ id: String(i).padStart(5, '0'), title: `Row ${i}`, course_id: 'c', subjects: { title: 'Subject' }, years: { title: 'Year' } }));
let pages = [], selections = [], fail = false;
const supabase = { from(table) {
  let after, size;
  const query = {
    select(columns) { selections.push({ table, columns }); return query; },
    eq(field, value) { assert.ok(['active', 'course_id'].includes(field)); assert.ok(value === true || value === 'c'); return query; },
    gt(field, value) { assert.equal(field, 'id'); after = value; return query; },
    order(field, options) { assert.equal(field, 'id'); assert.equal(options.ascending, true); return query; },
    async limit(value) {
      size = value; assert.ok(size <= 250);
      const data = rows.filter(row => !after || row.id > after).slice(0, size);
      pages.push(data.length);
      return { data: fail ? null : data, error: fail ? Error('offline') : null };
    },
  };
  return query;
} };
const repository = load('searchCatalogRepository.ts', {
  '../config/supabase': { supabase }, './searchPagination': pagination,
  '../utils/caseConvert': { toCamelCase: row => ({ ...row, courseId: row.course_id }) },
});
(async () => {
  const result = await repository.getSearchCatalogRows('chapters', 'c');
  assert.equal(result.length, 2601); assert.equal(new Set(result.map(r => r.id)).size, 2601);
  assert.equal(result.at(-1).id, '02600'); assert.equal(result[0].subjectTitle, 'Subject');
  assert.equal(result[0].yearTitle, 'Year'); assert.equal(result[0].courseId, 'c');
  assert.equal(pages.length, 11); assert.equal(Math.max(...pages), 250);
  const measured = { rows: result.length, pageRequests: pages.length, maxRowsPerResponse: Math.max(...pages) };
  await repository.getSearchCatalogRows('quiz_tests', 'c');
  const quizSelect = selections.find(s => s.table === 'quiz_tests').columns;
  assert.ok(!quizSelect.includes('*')); assert.ok(!quizSelect.includes('questions')); assert.ok(!quizSelect.includes('answer'));
  fail = true; await assert.rejects(repository.getSearchCatalogRows('notes', 'c'), /offline/);
  const repeated = Array.from({ length: 250 }, () => ({ id: 'same' }));
  await assert.rejects(pagination.readAllSearchPages(async () => repeated), /did not advance/);
  let offset = 0;
  await assert.rejects(pagination.readAllSearchPages(async () => Array.from({ length: 250 }, () => ({ id: String(offset++).padStart(8, '0') }))), /too large/);
  console.log(JSON.stringify(measured));
  console.log('PASS complete bounded pages, title mapping, quiz-key exclusion, failure and cursor/memory guards');
})().catch(error => { console.error(error); process.exitCode = 1; });
