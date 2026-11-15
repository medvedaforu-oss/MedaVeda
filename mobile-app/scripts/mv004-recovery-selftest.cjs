const assert=require('node:assert/strict');
const {load,harness,jsx,nodes,tick}=require('./ui-harness.cjs');
const endpoint='https://fixture.invalid/functions/v1/verify-payment',orderId='00400000-0000-4000-8000-000000000001';
function setup(){
 let user='owner',token='expired',requests=[],refreshes=0,transport=async()=>Response.json({success:true,amount:49}),refresh=async()=>({data:{session:{user:{id:user},access_token:'fresh'}}}),timers=new Map();
 const api=load('mobile-app/src/services/paymentService.ts',{
  '../config/supabase':{supabase:{auth:{getSession:async()=>({data:{session:user?{user:{id:user},access_token:token}:null}}),refreshSession:async()=>{refreshes++;return refresh();}}}},
  'react-native':{Platform:{OS:'android'}},'expo-application':{nativeApplicationVersion:'synthetic'},'../config/paymentProvider':{},'./authState':{getCurrentUser:()=>user?{id:user}:null},
 },{process:{env:{EXPO_PUBLIC_SUPABASE_URL:'https://fixture.invalid'}},Response,fetch:async(url,init)=>{requests.push({url,init});return transport(url,init);},
 setTimeout:(fn,ms)=>{if(ms<35000){queueMicrotask(fn);return 0;}const key=Symbol();timers.set(key,fn);return key;},clearTimeout:k=>timers.delete(k)});
 return {api,requests,timers,get refreshes(){return refreshes},set user(v){user=v},set transport(fn){transport=fn},set refresh(fn){refresh=fn}};
}
(async()=>{
 let s=setup();s.transport=async()=>s.requests.length===1?Response.json({error:'expired'},{status:401}):Response.json({success:true,amount:49});
 assert.equal((await s.api.recoverPayment(endpoint,orderId)).success,true);assert.equal(s.refreshes,1);assert.equal(s.requests.length,2);
 assert.equal(s.requests[0].init.headers.Authorization,'Bearer expired');assert.equal(s.requests[1].init.headers.Authorization,'Bearer fresh');
 for(const r of s.requests){assert.equal(r.url,endpoint);assert.deepEqual(JSON.parse(r.init.body),{internalOrderId:orderId,recover:true});assert.ok(r.init.signal);}assert.equal(s.timers.size,0);
 console.log('PASS same-account 401 refresh sends fresh Bearer once; same pending order and deadline preserved');
 for(const failure of ['second401','error','throw','missing','different','timeout']){
  s=setup();s.transport=async()=>Response.json({error:'auth required'},{status:401});
  if(failure==='error')s.refresh=async()=>({data:{session:null},error:Error('expired refresh')});
  if(failure==='throw')s.refresh=async()=>{throw Error('refresh failed')};
  if(failure==='missing')s.refresh=async()=>({data:{session:null}});
  if(failure==='different')s.refresh=async()=>({data:{session:{user:{id:'other'},access_token:'other-token'}}});
  if(failure==='timeout')s.refresh=()=>new Promise(()=>{});
  const work=s.api.recoverPaymentWithRetry(endpoint,orderId);
  if(failure==='timeout'){await tick();assert.equal(s.timers.size,1);[...s.timers.values()][0]();}
  const result=await work;assert.equal(result.authRequired,true);assert.equal(result.pending,true);assert.equal(result.success,false);assert.match(result.message,/Sign in again/);assert.match(result.message,/Do not pay again/);
  assert.equal(s.refreshes,1);assert.equal(s.requests.length,failure==='second401'?2:1);assert.equal(s.timers.size,0);
 }
 console.log('PASS refresh failure/timeout/foreign session/repeated 401 stop all retries with sign-in guidance and uncertain payment');
 s=setup();s.user=null;assert.equal((await s.api.recoverPaymentWithRetry(endpoint,orderId)).authRequired,true);assert.equal(s.requests.length,0);assert.equal(s.refreshes,0);
 s=setup();s.transport=async()=>{s.user='other';return Response.json({success:true,amount:49});};
 assert.equal((await s.api.recoverPayment(endpoint,orderId)).authRequired,true);assert.equal(s.refreshes,0);
 s=setup();s.transport=async()=>Response.json({error:'expired'},{status:401});s.refresh=async()=>{s.user='other';return {data:{session:{user:{id:'other'},access_token:'other-token'}}};};
 assert.equal((await s.api.recoverPaymentWithRetry(endpoint,orderId)).authRequired,true);assert.equal(s.requests.length,1);
 s=setup();s.transport=async()=>{s.user='other';throw Error('dropped request');};
 assert.equal((await s.api.recoverPaymentWithRetry(endpoint,orderId)).authRequired,true);assert.equal(s.requests.length,1);
 console.log('PASS signed out, switch during response/refresh and switch between retries cannot return success or send another request');
 s=setup();s.transport=async()=>Response.json({success:false,pending:true});assert.equal((await s.api.recoverPaymentWithRetry(endpoint,orderId)).pending,true);assert.equal(s.requests.length,6);
 s=setup();assert.equal((await s.api.recoverPayment(endpoint,orderId)).success,true);assert.equal(s.requests.length,1);assert.equal(s.refreshes,0);
 console.log('PASS bounded pending retries preserve original identifier; successful historical recovery requires no new checkout');
 for(const switchAccount of [false,true]){
  const h=harness();let focus,interval,app,finish,reads=0,user='owner',routes=[];
  const params={pending:true,internalOrderId:orderId,verifyUrl:endpoint,paymentId:'pay_synthetic'};
  const mocks={react:h.react,'react/jsx-runtime':jsx,'react-native':{View:'View',Text:'Text',TouchableOpacity:'Button',StyleSheet:{create:x=>x},AppState:{addEventListener:(_,fn)=>{app=fn;return{remove(){}};}}},
   '@react-navigation/native':{useRoute:()=>({params}),useNavigation:()=>({dispatch:x=>routes.push(x)}),CommonActions:{reset:x=>x},useFocusEffect:fn=>focus=fn},
   '../../services/authState':{getCurrentUser:()=>({id:user})},'../../services/playBillingService':{},'../../services/paymentService':{recoverPayment:()=>{reads++;return new Promise(r=>finish=r);}}};
  for(const [file,key]of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING'],['radius','RADIUS'],['shadows','SHADOW']])mocks['../../theme/'+file]={[key]:{}};
  const Screen=load('mobile-app/src/screens/payment/PaymentFailedScreen.tsx',mocks,{setInterval:fn=>{interval=fn;return 1},clearInterval(){}}).default;
  h.render(Screen);const blur=focus();interval();app('active');assert.equal(reads,1);
  if(switchAccount){user='other';finish({success:true,amount:49});}else finish({success:false,pending:true,authRequired:true,message:'Sign in again to check payment. Do not pay again.'});
  await tick();const tree=h.render(Screen);interval();app('active');await tick();assert.equal(reads,1);assert.equal(routes.length,0);
  assert.match(JSON.stringify(tree),/Sign in to Check Payment/);assert.match(JSON.stringify(tree),new RegExp(orderId));assert.match(JSON.stringify(tree),/No need to pay again/);assert.doesNotMatch(JSON.stringify(tree),/Payment Failed|Try Again/);
  const purchases=nodes(tree).find(n=>n.type==='Button'&&JSON.stringify(n).includes('Check My Purchases'));purchases.props.onPress();assert.equal(routes[0].routes[1].name,'MyPurchases');assert.equal(params.internalOrderId,orderId);assert.equal(params.pending,true);blur();h.unmount();
 }
 console.log('PASS screen coalesces duplicate recovery, ignores old-account success, stops auth polling, preserves pending order and offers My Purchases/support');
})().catch(e=>{console.error(e);process.exitCode=1});
