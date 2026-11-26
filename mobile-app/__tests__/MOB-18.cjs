const {assert,run,tick,nodes}=require('./audit-harness.cjs');
const {setup}=require('./MOB-04.cjs');
run(async()=>{
 const s=setup({owned:true});s.render();await tick();
 assert.ok(JSON.stringify(s.render()).includes('already_owned'),'actual Play order rejection is visible');
 assert.equal(s.pay(),undefined,'an owned product exposes no payable quote');
 assert.equal(s.requests.length,0,'already-owned rejection never launches native checkout');
 assert.equal(s.storage.size,0,'rejected order never creates a pending purchase binding');
 const target=s.recover();assert.ok(target,'already_owned result exposes My Purchases action');
 target.props.onPress();assert.deepEqual(s.nav,[['MyPurchases']],'owned action navigates MyPurchases');
 const retry=nodes(s.render()).find(n=>n.type==='Button'&&n.props.title==='Try again');
 await retry.props.onPress();await tick();assert.equal(s.pay(),undefined);
 assert.equal(s.requests.length,0,'retry cannot bypass server ownership denial');s.close();
});
