const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {load}=require('./load.cjs');
const plain=x=>JSON.parse(JSON.stringify(x)), tick=()=>new Promise(r=>setImmediate(r));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const attempt={userId:'owner',internalOrderId:'11111111-1111-4111-8111-111111111111',productId:'notes',productTitle:'Notes',playSku:'price_5'};
const receipt=(state='purchased',patch={})=>({platform:'android',productId:attempt.playSku,purchaseToken:'synthetic-purchase-token',purchaseState:state,obfuscatedAccountIdAndroid:hash(attempt.userId),obfuscatedProfileIdAndroid:hash(attempt.internalOrderId),...patch});
function setup(enabled=true){
 const factory=load('src/services/playBillingCore.ts',{'./playOfferSelection':load('src/services/playOfferSelection.ts')});
 assert.equal(typeof factory.createStandalonePlayBilling,'function','isolated factory must exist');
 const s={user:'owner',epoch:0,events:[],stored:new Map(),orders:[],calls:[],requests:[],purchases:[],timers:new Map(),removed:0,ready:true};
 s.switchUser=id=>{s.user=id;s.epoch++};
 s.reply=async()=>Response.json({success:true,internalOrderId:attempt.internalOrderId});
 s.nativeRequest=async()=>{};
 const iap={
 initConnection:async options=>{s.init=options;return s.ready},
 purchaseUpdatedListener:fn=>(s.updated=fn,{remove(){s.removed++}}),
 purchaseErrorListener:fn=>(s.errored=fn,{remove(){s.removed++}}),
 userChoiceBillingListenerAndroid:fn=>(s.chosen=fn,{remove(){s.removed++}}),
 requestPurchase:async r=>{s.requests.push(r);return s.nativeRequest(r)},
 fetchProducts:async()=>s.products??[],
 getAvailablePurchases:async()=>{s.restores=(s.restores??0)+1;return s.purchases},
 finishTransaction:async()=>{throw Error('Client must never consume/acknowledge')}
 };
 const ports={projectUrl:'https://billing.invalid',AsyncStorage:{getItem:async k=>s.stored.get(k)??null,setItem:async(k,v)=>{s.stored.set(k,v);await s.onSave?.()},removeItem:async k=>s.stored.delete(k)},
 Platform:{OS:'android'},Application:{applicationId:'in.medveda.app',nativeApplicationVersion:'synthetic'},
 sha256:hash,purchasesEnabled:enabled,getAuthEpoch:()=>s.epoch,
 getOrdersByUser:async uid=>{s.orderUser=uid;return s.orders},
 supabase:{auth:{getSession:async()=>({data:{session:s.user?{user:{id:s.user},access_token:'synthetic-session'}:null}})},rpc:async(name,args)=>{s.rpc={name,args};return {data:s.fulfillment??{success:false,pending:true},error:null}}},
 getNativeBilling:async()=>iap,
 fetch:async(url,init)=>{assert.equal(new URL(url).hostname,'billing.invalid');s.calls.push({url,init});return s.reply(url,init)},
 setTimeout:(fn,ms)=>{const key=Symbol();s.timers.set(key,{fn,ms});return key},clearTimeout:key=>s.timers.delete(key)};
 s.ports=ports;s.api=factory.createStandalonePlayBilling(ports);s.api.subscribePlayBilling(e=>s.events.push(e));s.seed=()=>s.stored.set('medveda:play-attempt:owner',JSON.stringify(attempt));return s;
}
test('disabled gate blocks new order/catalog/purchase before native or HTTP',async()=>{
 const s=setup(false);for(const work of [()=>s.api.createPlayOrder('notes'),()=>s.api.fetchMatchingPlayProduct('price_5',5),()=>s.api.startPlayPurchase(attempt,'offer')])await assert.rejects(work(),/Standalone/);
 assert.equal(s.calls.length,0);assert.equal(s.requests.length,0);assert.equal(s.init,undefined);
});
test('native initializes once; request binds account/order and persists before dispatch',async()=>{
 const s=setup();await Promise.all([s.api.ensurePlayBilling(),s.api.ensurePlayBilling()]);await s.api.startPlayPurchase(attempt,'offer');
 assert.deepEqual(plain(s.init),{});assert.equal(s.stored.size,1);
 assert.deepEqual(plain(s.requests[0]),{request:{google:{skus:['price_5'],offerToken:'offer',obfuscatedAccountId:hash('owner'),obfuscatedProfileId:hash(attempt.internalOrderId)}},type:'in-app'});
 assert.equal(s.timers.size,0);await assert.rejects(s.api.startPlayPurchase(attempt,'offer'),/Another Play/);
});
test('pending never verifies or grants; purchased confirms through exact backend interface',async()=>{
 const s=setup();await s.api.startPlayPurchase(attempt,'offer');s.updated(receipt('pending'));await tick();assert.equal(s.events.at(-1).type,'pending');assert.equal(s.calls.length,0);
 s.updated(receipt());await tick();await tick();assert.equal(s.events.at(-1).type,'success');assert.equal(s.stored.size,0);
 assert.equal(s.calls.length,1);assert.ok(s.calls[0].url.endsWith('/functions/v1/verify-standalone-play-purchase'));
 assert.deepEqual(JSON.parse(s.calls[0].init.body),{purchaseToken:'synthetic-purchase-token',productId:'notes',internalOrderId:attempt.internalOrderId});
 assert.equal(s.calls[0].init.headers['x-medveda-application-id'],'in.medveda.app');
});
test('concurrent duplicate native events verify once; later replay relies on server idempotency',async()=>{
 const s=setup();s.seed();await s.api.ensurePlayBilling();let resolve;s.reply=()=>new Promise(r=>resolve=r);
 s.updated(receipt());s.updated(receipt());await tick();assert.equal(s.calls.length,1);
 resolve(Response.json({success:true}));await tick();await tick();assert.equal(s.events.filter(x=>x.type==='success').length,1);
 s.orders=[{id:attempt.internalOrderId,provider:'play',playSku:'price_5',productId:'notes'}];
 s.reply=async()=>Response.json({success:true});s.updated(receipt());await tick();await tick();assert.equal(s.calls.length,2);
 assert.equal(JSON.parse(s.calls[1].init.body).internalOrderId,attempt.internalOrderId);
});
test('native listener cancellation clears only owner attempt without verification',async()=>{
 const s=setup();await s.api.startPlayPurchase(attempt,'offer');s.errored({code:'user-cancelled'});await tick();assert.equal(s.events.at(-1).type,'cancel');assert.equal(s.stored.size,0);assert.equal(s.calls.length,0);
});
test('request cancellation returns cancel; ambiguous failure retains recoverable attempt',async()=>{
 for(const cancelled of [true,false]){const s=setup();s.nativeRequest=async()=>{throw Object.assign(Error('synthetic'),{code:cancelled?'user-cancelled':'network'})};await s.api.startPlayPurchase(attempt,'offer');assert.equal(s.events.at(-1).type,cancelled?'cancel':'pending');assert.equal(s.stored.size,cancelled?0:1);}
});
test('account switch before request cannot launch; switch during save cannot launch',async()=>{
 const s=setup();s.switchUser('other');await assert.rejects(s.api.startPlayPurchase(attempt,'offer'),/account changed/);assert.equal(s.requests.length,0);
 const t=setup();t.onSave=async()=>t.switchUser('other');await assert.rejects(t.api.startPlayPurchase(attempt,'offer'),/changed/);assert.equal(t.requests.length,0);
});
test('foreign account/order/SKU and non-purchased receipts cannot verify',async()=>{
 for(const patch of [{obfuscatedAccountIdAndroid:'wrong'},{obfuscatedProfileIdAndroid:'wrong'},{productId:'wrong'},{platform:'ios'},{purchaseState:'cancelled'},{purchaseToken:null}]){
 const s=setup();s.seed();await s.api.ensurePlayBilling();s.updated(receipt('purchased',patch));await tick();assert.equal(s.calls.length,0);assert.equal(s.events.length,0);}
});
test('verification 403 is terminal; 401/429/503/network remain recoverable and restore retries',async()=>{
 for(const status of [403,401,429,503,0]){
 const s=setup(false);s.seed();s.purchases=[receipt()];s.reply=async()=>{if(!status)throw Error('offline');return Response.json({error:'synthetic-verification-failure'},{status})};
 const first=await s.api.restorePlayPurchases();assert.equal(first[status===403?'failed':'pending'],1);assert.equal(s.stored.size,1);
 s.reply=async()=>Response.json({success:true});assert.equal((await s.api.restorePlayPurchases()).confirmed,1);assert.equal(s.stored.size,0);assert.equal(s.requests.length,0);
 }
});
test('verification timeout retains attempt and permits later restore',async()=>{
 const s=setup(false);s.seed();s.purchases=[receipt()];s.reply=()=>new Promise(()=>{});
 const first=s.api.restorePlayPurchases();await tick();assert.equal(s.timers.size,1);[...s.timers.values()][0].fn();
 assert.equal((await first).pending,1);assert.equal(s.stored.size,1);s.reply=async()=>Response.json({success:true});assert.equal((await s.api.restorePlayPurchases()).confirmed,1);
});
test('native dispatch timeout keeps pending; native connection failure removes listeners and retries',async()=>{
 const s=setup();s.nativeRequest=()=>new Promise(()=>{});const work=s.api.startPlayPurchase(attempt,'offer');await tick();[...s.timers.values()][0].fn();await work;assert.equal(s.events.at(-1).type,'pending');assert.equal(s.stored.size,1);await assert.rejects(s.api.startPlayPurchase(attempt,'offer'),/Another/);
 const t=setup();t.ready=false;await assert.rejects(t.api.ensurePlayBilling(),/connect/);assert.equal(t.removed,2);t.ready=true;await t.api.ensurePlayBilling();
});
test('restore after process death uses server order hash; concurrent restore coalesces',async()=>{
 const s=setup(false);s.orders=[{id:attempt.internalOrderId,provider:'play',playSku:'price_5',productId:'notes'}];s.purchases=[receipt()];
 const [a,b]=await Promise.all([s.api.restorePlayPurchases(),s.api.restorePlayPurchases()]);assert.equal(a.confirmed,1);assert.equal(b.confirmed,1);assert.equal(s.calls.length,1);assert.equal(s.restores,1);
});
test('paid order requires committed fulfillment RPC; failed/refunded order returns no grant',async()=>{
 const s=setup(false);s.orders=[{id:attempt.internalOrderId,provider:'play',status:'paid'}];
 assert.equal((await s.api.recheckPlayOrder(attempt.internalOrderId)).success,false);
 s.fulfillment={success:true};assert.equal((await s.api.recheckPlayOrder(attempt.internalOrderId)).success,true);
 assert.equal(s.rpc.name,'get_my_play_fulfillment');assert.equal(s.rpc.args.p_order_id,attempt.internalOrderId);
 for(const status of ['failed','refunded']){s.orders[0].status=status;const r=await s.api.recheckPlayOrder(attempt.internalOrderId);assert.equal(r.success,false);assert.equal(r.pending,false);}
});
test('switch during verification suppresses old-owner success',async()=>{
 const s=setup(false);s.seed();s.purchases=[receipt()];s.reply=async()=>{s.switchUser('other');return Response.json({success:true})};
 assert.equal((await s.api.restorePlayPurchases()).skipped,1);assert.equal(s.events.length,0);assert.equal(s.stored.size,1);
});
module.exports={setup,receipt,attempt,tick};

test('logout and return to same account during verification suppresses stale success',async()=>{
 const s=setup(false);s.seed();s.purchases=[receipt()];s.reply=async()=>{s.switchUser('other');s.switchUser('owner');return Response.json({success:true})};
 const r=await s.api.restorePlayPurchases();assert.equal(r.skipped,1);assert.equal(s.events.length,0);assert.equal(s.stored.size,1);
});
test('account epoch change during durable lookup cannot emit pending or verify',async()=>{
 const s=setup(false);s.seed();s.purchases=[receipt('pending')];const original=s.ports.AsyncStorage.getItem;
 s.ports.AsyncStorage.getItem=async k=>{const value=await original(k);s.switchUser('other');return value};
 const r=await s.api.restorePlayPurchases();assert.equal(r.confirmed,0);assert.equal(r.pending,0);assert.equal(s.events.length,0);assert.equal(s.calls.length,0);
});
test('paid fulfillment response cannot cross a logout/login epoch',async()=>{
 const s=setup(false);s.orders=[{id:attempt.internalOrderId,provider:'play',status:'paid'}];
 s.ports.supabase.rpc=async()=>{s.switchUser('other');s.switchUser('owner');return {data:{success:true},error:null}};
 assert.equal((await s.api.recheckPlayOrder(attempt.internalOrderId)).success,false);
});

test('native product lookup requires exact SKU, INR and one standard offer',async()=>{
 const s=setup();const offer={priceCurrencyCode:'INR',priceAmountMicros:'5000000',offerToken:'standard',formattedPrice:'₹5'};
 const product={id:'price_5',platform:'android',currency:'INR',oneTimePurchaseOfferDetailsAndroid:[offer]};s.products=[product];
 assert.equal((await s.api.fetchMatchingPlayProduct('price_5',5)).offerToken,'standard');
 for(const products of [[],[{...product,id:'wrong'}],[{...product,currency:'USD'}],[{...product,platform:'ios'}],[{...product,oneTimePurchaseOfferDetailsAndroid:[offer,offer]}],...[{offerId:'discount'},{rentalDetailsAndroid:{}},{preorderDetailsAndroid:{}},{priceAmountMicros:'1000000'},{offerToken:''},{priceCurrencyCode:'USD'},{formattedPrice:''}].map(p=>[{...product,oneTimePurchaseOfferDetailsAndroid:[{...offer,...p}]}])]){
 s.products=products;await assert.rejects(s.api.fetchMatchingPlayProduct('price_5',5));}
});
test('server order interface preserves server price/BUY option and owner expectation',async()=>{
 const s=setup();s.reply=async()=>Response.json({internalOrderId:attempt.internalOrderId,playSku:'price_5',amountInr:5,purchaseOptionId:'buy'});
 const order=await s.api.createPlayOrder('notes','owner');assert.equal(order.amountInr,5);assert.equal(order.purchaseOptionId,'buy');
 assert.ok(s.calls[0].url.endsWith('/create-standalone-play-order'));assert.deepEqual(JSON.parse(s.calls[0].init.body),{productId:'notes'});
 s.switchUser('other');await assert.rejects(s.api.createPlayOrder('notes','owner'),/account changed/);assert.equal(s.calls.length,1);
 for(const code of ['price_tier_failed','price_tier_pending']){s.switchUser('owner');s.reply=async()=>Response.json({error:code},{status:400});await assert.rejects(s.api.createPlayOrder('notes','owner'),code==='price_tier_failed'?/unavailable/:/prepared/);}
});
test('server pending or failed verdict cannot clear durable attempt',async()=>{
 for(const body of [{success:false,pending:true},{success:false,pending:false,message:'rejected'}]){
 const s=setup(false);s.seed();s.purchases=[receipt()];s.reply=async()=>Response.json(body);
 const r=await s.api.restorePlayPurchases();assert.equal(r[body.pending?'pending':'failed'],1);assert.equal(s.stored.size,1);assert.equal(s.events.some(e=>e.type==='success'),false);}
});
test('native request completion after account switch cannot emit stale pending or cancel',async()=>{
 for(const kind of ['network','cancel','timeout']){
 const s=setup();let reject;s.nativeRequest=()=>new Promise((_r,j)=>reject=j);
 const work=s.api.startPlayPurchase(attempt,'offer');await tick();assert.equal(s.requests.length,1);s.switchUser('other');
 if(kind==='timeout')[...s.timers.values()][0].fn();else reject(Object.assign(Error('synthetic'),{code:kind==='cancel'?'user-cancelled':'network'}));
 await work;assert.equal(s.events.length,0,kind);assert.equal(s.stored.size,1,kind);
 }
});

test('fresh login restore waits for stale epoch then performs a fresh recovery',async()=>{
 const s=setup(false);s.seed();s.purchases=[receipt()];let resolve;s.reply=()=>new Promise(r=>resolve=r);
 const first=s.api.restorePlayPurchases();await tick();s.switchUser('other');s.switchUser('owner');
 const second=s.api.restorePlayPurchases();await tick();s.reply=async()=>Response.json({success:true});resolve(Response.json({success:true}));
 assert.equal((await first).skipped,1);assert.equal((await second).confirmed,1);assert.equal(s.calls.length,2);assert.equal(s.restores,2);
});

test('standalone never registers user-choice listener',async()=>{const s=setup();await s.api.ensurePlayBilling();assert.equal(s.chosen,undefined)});
test('truthy malformed success cannot confirm entitlement',async()=>{const s=setup();s.seed();s.purchases=[receipt()];s.reply=async()=>Response.json({success:'true'});const r=await s.api.restorePlayPurchases();assert.equal(r.confirmed,0);assert.equal(s.stored.size,1)});
test('consumed receipt lost after verification timeout reconciles committed server entitlement',async()=>{
 const s=setup();s.seed();s.purchases=[];s.orders=[{id:attempt.internalOrderId,provider:'play',productId:'notes',playSku:'price_5',status:'paid'}];s.fulfillment={success:true};
 const r=await s.api.restorePlayPurchases();assert.equal(r.confirmed,1);assert.equal(s.stored.size,0);assert.equal(s.events.at(-1).type,'success');
});
test('unresolved local purchase blocks replacement server order before creation',async()=>{
 const s=setup();s.seed();await assert.rejects(s.api.createPlayOrder('notes','owner'),/awaiting/);assert.equal(s.calls.length,0);
});
test('switching accounts preserves A durable hint while allowing B own checkout',async()=>{
 const s=setup();await s.api.startPlayPurchase(attempt,'offer');s.switchUser('other');
 await s.api.startPlayPurchase({...attempt,userId:'other',internalOrderId:'22222222-2222-4222-8222-222222222222'},'offer');
 assert.equal(s.requests.length,2);assert.ok(s.stored.has('medveda:play-attempt:owner'));assert.ok(s.stored.has('medveda:play-attempt:other'));
});

// F03: a server-proven terminal outcome releases only this owner/order.
test('terminal duplicate/refund restoration releases hint without grant and permits new checkout',async()=>{
 for(const status of ['duplicate','refunded']) {
  const s=setup();s.seed();s.orders=[{id:attempt.internalOrderId,productId:'notes',provider:'play',status:status==='duplicate'?'paid':'refunded'}];
  s.fulfillment={success:false,pending:false,terminal:true,outcome:status,internalOrderId:attempt.internalOrderId,message:'Contact support for a refund.'};
  const result=await s.api.restorePlayPurchases();assert.equal(result.confirmed,0);assert.equal(s.stored.size,0,status);
  assert.equal(s.events.at(-1).type,'error');
  s.reply=async()=>Response.json({internalOrderId:'22222222-2222-4222-8222-222222222222',playSku:'price_5',amountInr:5,purchaseOptionId:'buy'});
  assert.equal((await s.api.createPlayOrder('another-product','owner')).amountInr,5);
 }
});
test('verified duplicate callback releases only matching attempt; unproven terminal cannot release',async()=>{
 for(const valid of [true,false]) {
  const s=setup();s.seed();s.purchases=[receipt()];
  s.reply=async()=>Response.json({success:false,pending:false,terminal:true,outcome:'duplicate',internalOrderId:valid?attempt.internalOrderId:'foreign-order',message:'Contact support for a refund.'});
  await s.api.restorePlayPurchases();assert.equal(s.stored.size,valid?0:1);assert.equal(s.events.some(e=>e.type==='success'),false);
 }
});
test('terminal response across account epoch cannot clear another session hint',async()=>{
 const s=setup();s.seed();s.orders=[{id:attempt.internalOrderId,provider:'play',status:'paid'}];
 s.ports.supabase.rpc=async()=>{s.switchUser('other');s.switchUser('owner');return {data:{success:false,pending:false,terminal:true,outcome:'duplicate',internalOrderId:attempt.internalOrderId},error:null}};
 await s.api.restorePlayPurchases();assert.equal(s.stored.size,1);assert.equal(s.events.length,0);
});

test('settled and consumed reusable SKU permits a second distinct Notes checkout',async()=>{
 const s=setup();await s.api.startPlayPurchase(attempt,'offer');s.updated(receipt());await tick();await tick();
 assert.equal(s.events.at(-1).type,'success');assert.equal(s.stored.size,0);
 const next={...attempt,internalOrderId:'22222222-2222-4222-8222-222222222222',productId:'other-notes'};
 s.reply=async url=>Response.json(url.endsWith('/create-standalone-play-order')
  ?{internalOrderId:next.internalOrderId,playSku:'price_5',amountInr:5,purchaseOptionId:'buy'}
  :{success:true,internalOrderId:next.internalOrderId});
 const order=await s.api.createPlayOrder(next.productId,'owner');assert.equal(order.playSku,attempt.playSku);
 await s.api.startPlayPurchase(next,'offer');assert.equal(s.requests.length,2);
 s.updated(receipt('purchased',{purchaseToken:'second-synthetic-token',obfuscatedProfileIdAndroid:hash(next.internalOrderId)}));
 await tick();await tick();assert.equal(s.stored.size,0);assert.equal(s.events.at(-1).attempt.productId,'other-notes');
 assert.equal(s.events.at(-1).type,'success');
});
