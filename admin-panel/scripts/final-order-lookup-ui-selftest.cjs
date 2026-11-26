const assert=require('node:assert/strict');const {load,harness,jsx,nodes,tick}=require('../../mobile-app/scripts/ui-harness.cjs');
const content=tree=>nodes(tree).map(n=>n.props?.children).flat(Infinity).filter(x=>typeof x==='string').join(' ');
(async()=>{for(const kind of ['valid','missing','network','unauthorized']){
 const h=harness();let fail=['network','unauthorized'].includes(kind),calls=0;
 const guard=load('admin-panel/src/hooks/useRequestGuard.ts',{react:h.react}).default;
 const Page=load('admin-panel/src/components/ReviewFlagOrderLookup.tsx',{react:h.react,'react/jsx-runtime':jsx,'../hooks/useRequestGuard':{__esModule:true,default:guard},'../utils/orderReference':load('admin-panel/src/utils/orderReference.ts',{}),'../services/orderService':{getOrders:async(...args)=>{calls++;assert.equal(args.length,0,'flag lookup must not inherit current course/status/page filters');if(fail)throw {status:kind==='unauthorized'?403:503};return kind==='missing'?[]:[{id:'internal-1',razorpayOrderId:'order_provider',paymentId:'pay_provider',productTitle:'Correct product',userName:'Student',userEmail:'fixture@example.invalid',status:'paid'}]}}}).default;
 const render=()=>h.render(()=>Page({reference:'internal-1'}));assert.match(content(render()),/Loading order/);await tick();let tree=render();
 if(fail){assert(nodes(tree).some(n=>n.props?.role==='alert'));assert.doesNotMatch(content(tree),/No accessible order/);if(kind==='unauthorized')assert.match(content(tree),/access denied/);fail=false;await nodes(tree).find(n=>n.type==='button').props.onClick();await tick();tree=render();assert.equal(calls,2)}
 if(kind==='missing')assert.match(content(tree),/No accessible order/);else {assert.match(content(tree),/internal-1/);assert.match(content(tree),/order_provider/);assert.match(content(tree),/pay_provider/);assert.match(content(tree),/Correct product/)}
 h.unmount();console.log('PASS flag order loading/result/error/retry '+kind);
}})().catch(e=>{console.error(e);process.exitCode=1});
