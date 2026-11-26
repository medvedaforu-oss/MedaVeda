const assert = require('node:assert/strict');
const fixture = require('./quiz-screen-harness.cjs');
function run(blanks = false) {
  const f = fixture({ blanks }); f.start();
  f.options()[0].props.onPress(); f.render();
  assert.equal(f.options()[1].props.disabled, false);
  f.options()[1].props.onPress(); f.render(); f.button('Next')(); f.render();
  f.button('Previous')(); f.render(); assert.equal(f.options()[1].props.isSelected, true);
  if (blanks) assert.equal(f.options().length, 2, 'Blank legacy options remain hidden without reindexing');
  f.button('Next')(); f.render(); const submit = f.button('Submit Test'); submit(); submit(); f.render();
  assert(f.tree.some(n => n.type === 'Scroll'));
  assert.equal(f.state.submitted.length, 1); assert.deepEqual(Array.from(f.state.submitted[0].answers), [blanks ? 2 : 1, null]);
  assert.equal(f.state.submitted[0].score, 0);
  f.button('Restart Test')(); f.render(); f.options()[0].props.onPress();
  f.button('Next')(); f.render(); f.button('Submit Test')(); f.render();
  assert.equal(f.state.submitted.length, 2); assert.deepEqual(Array.from(f.state.submitted[1].answers), [0, null]);
  assert.notEqual(f.state.submitted[0].attemptId, f.state.submitted[1].attemptId);
  f.button('Restart Test')(); f.render(); f.advance(30000);
  assert(f.tree.some(n => n.type === 'Text' && n.props.children === 'Q1'), 'Old per-question timeout must never skip questions');
  f.unmount();
  console.log('PASS editable answers, original option indexes, navigation, immutable submissions, independent restart and no per-question skip');
}
if (require.main === module) run();
module.exports = run;
