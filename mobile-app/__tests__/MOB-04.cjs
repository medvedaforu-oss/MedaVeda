const {assert,load,run,tick,nodes,hooks,rn}=require('./audit-harness.cjs');
const hash=value=>'hash:'+value;
const orderId='11111111-1111-4111-8111-111111111111';
// Shared only by these maintained Play fixtures. The Razorpay harness is untouched.
function setup({owned=false,hang=false}={}) {
 const h=hooks(),timers=new Map(),storage=new Map();
 const s={owner:'A',epoch:0,nav:[],requests:[],http:[],events:[],h,timers,storage};
 const iap={initConnection:async()=>true,
  purchaseUpdatedListener:fn=>(s.updated=fn,{remove(){}}),
  purchaseErrorListener:fn=>(s.errored=fn,{remove(){}}),
  userChoiceBillingListenerAndroid:()=>({remove(){}}),
  fetchProducts:async()=>[{id:'sku',platform:'android',currency:'INR',oneTimePurchaseOfferDetailsAndroid:[{priceCurrencyCode:'INR',priceAmountMicros:'100000000',formattedPrice:'₹100.00',offerToken:'offer'}]}],
  requestPurchase:async request=>{s.requests.push(request);if(hang)return new Promise(()=>{});},
  getAvailablePurchases:async()=>[],
  finishTransaction:async()=>{throw Error('Client must never grant or consume a purchase');},
 };
 const {createStandalonePlayBilling}=load('src/services/playBillingCore.ts',{'./playOfferSelection':load('src/services/playOfferSelection.ts')});
 const api=createStandalonePlayBilling({projectUrl:'https://billing.invalid',
  AsyncStorage:{getItem:async k=>storage.get(k)??null,setItem:async(k,v)=>storage.set(k,v),removeItem:async k=>storage.delete(k)},
  Platform:{OS:'android'},Application:{applicationId:'in.medveda.app',nativeApplicationVersion:'synthetic'},
  sha256:hash,purchasesEnabled:true,getAuthEpoch:()=>s.epoch,getOrdersByUser:async()=>[],
  supabase:{auth:{getSession:async()=>({data:{session:{user:{id:s.owner},access_token:'synthetic-session'}}})}},
  getNativeBilling:async()=>iap,
  fetch:async(url,init)=>{
   assert.equal(new URL(url).origin,'https://billing.invalid','all requests stay synthetic');s.http.push({url,init});
   if(url.endsWith('/create-standalone-play-order'))return Response.json(owned?{error:'already_owned'}:{internalOrderId:orderId,playSku:'sku',amountInr:100,purchaseOptionId:'buy'},{status:owned?409:200});
   assert.ok(url.endsWith('/verify-standalone-play-purchase'));
   return Response.json({success:true,internalOrderId:orderId});
  },
  setTimeout:(fn,ms)=>{const key=Symbol();timers.set(key,{fn,ms});return key;},clearTimeout:key=>timers.delete(key),
 });
 api.subscribePlayBilling(e=>s.events.push(e));
 const navigation={isFocused:()=>true,navigate:(...args)=>s.nav.push(args)};
 const Screen=load('src/screens/payment/PlayOrderSummaryScreen.tsx',{
  react:h.react,'react-native':rn,
  '@react-navigation/native':{useNavigation:()=>navigation,useRoute:()=>({params:{productId:'p',productTitle:'PDF'}})},
  '../../components/CustomButton':{__esModule:true,default:'Button'},'../../theme/colors':{COLORS:{}},
  '../../services/authState':{getCurrentUser:()=>({id:s.owner}),getAuthEpoch:()=>s.epoch,subscribeAuthUser:fn=>(s.auth=fn,()=>{})},
  '../../services/playBillingService':api,
 }).default;
 s.render=()=>h.render(Screen);s.close=()=>h.unmount();
 s.changeOwner=id=>{s.owner=id;s.epoch++;s.auth();};
 s.receipt=()=>s.updated({platform:'android',productId:'sku',purchaseToken:'synthetic-receipt',purchaseState:'purchased',obfuscatedAccountIdAndroid:hash('A'),obfuscatedProfileIdAndroid:hash(orderId)});
 s.pay=()=>nodes(s.render()).find(n=>n.type==='Button'&&n.props.title.startsWith('Pay '));
 s.recover=()=>nodes(s.render()).find(n=>n.type==='Button'&&n.props.title==='My Purchases / Restore');
 return s;
}
module.exports={setup};
if(require.main===module)run(async()=>{
 const s=setup({hang:true});s.render();await tick();
 const button=s.pay();assert.ok(button,'enabled standalone Play checkout loaded');
 const pending=button.props.onPress();await tick();
 await button.props.onPress();assert.equal(s.requests.length,1,'duplicate UI dispatch blocked');
 assert.ok(nodes(s.render()).some(n=>n.type==='Button'&&n.props.title==='Awaiting Google Play…'),'native awaiting callback');
 const deadline=[...s.timers.values()].find(t=>t.ms===15000);
 assert.ok(deadline,'real Play core bounds a lost native callback');deadline.fn();await pending;await tick();
 assert.equal(s.events.at(-1).type,'pending');assert.equal(s.pay().props.disabled,true,'timeout cannot enable another payment');
 assert.ok(s.storage.has('medveda:play-attempt:A'),'timeout retains durable receipt binding');
 assert.ok(s.recover(),'timeout offers My Purchases recovery');
 s.receipt();await tick();await tick();
 assert.equal(s.events.filter(e=>e.type==='success').length,1,'late verified success delivered once');
 assert.ok(JSON.stringify(s.render()).includes('Purchase verified.'),'late result reaches current summary');
 assert.equal(s.nav.length,0,'current contract requires explicit access navigation');
 s.receipt();await tick();await tick();
 assert.equal(s.events.filter(e=>e.type==='success').length,1,'duplicate receipt cannot publish another success');
 s.recover().props.onPress();assert.deepEqual(s.nav,[['MyPurchases']],'explicit recovery navigates once');s.close();
 const next=setup();next.render();await tick();await next.pay().props.onPress();
 next.changeOwner('B');next.receipt();await tick();await tick();
 assert.equal(next.nav.length,0,'old owner outcome cannot navigate for B');
 assert.ok(!JSON.stringify(next.render()).includes('Purchase verified.'),'old owner result cannot appear for B');
 next.changeOwner('A');next.receipt();await tick();await tick();
 assert.equal(next.nav.length,0,'ABA old attempt cannot navigate in a later A lifetime');
 assert.ok(!JSON.stringify(next.render()).includes('Purchase verified.'),'ABA stale screen cannot publish success');next.close();
 console.log('DEVICE TEST PENDING: actual native billing callbacks, focus and account transitions');
});
