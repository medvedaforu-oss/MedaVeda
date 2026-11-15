const assert = require('node:assert/strict');
const {load,tick} = require('./ui-harness.cjs');
let user='buyer', calls=[], timers=new Map(), rows=[], filters=[], queryCount=0;
let transport=async()=>Response.json({success:true,amount:49});
const query={abortSignal(){return this;},select(){return this;},eq(k,v){filters.push([k,v]);return this;},in(){return this;},not(){return this;},gte(){return this;},order(){return this;},limit(){return this;},then(resolve){queryCount++;resolve({data:rows,error:null});}};
const api=load('mobile-app/src/services/paymentService.ts',{
 '../config/supabase':{supabase:{auth:{getSession:async()=>({data:{session:{access_token:'synthetic-token',user:{id:user}}}})},from:()=>query}},
 'react-native':{Platform:{OS:'android'}},'expo-application':{nativeApplicationVersion:'1.2.1'},
 '../config/paymentProvider':{paymentProvider:'razorpay'},'./authState':{getCurrentUser:()=>user?{id:user}:null},
},{process:{env:{EXPO_PUBLIC_SUPABASE_URL:'https://fixture.invalid'}},Request,Response,AbortController,
 fetch:async(url,init)=>{calls.push({url,init});return transport(url,init);},
 setTimeout:(fn,ms)=>{if(ms<35000){queueMicrotask(fn);return 0;} const id=Symbol();timers.set(id,fn);return id;},
 clearTimeout:id=>timers.delete(id),});
const endpoint='https://fixture.invalid/functions/v1/verify-payment';
const payload={internalOrderId:'order',razorpay_order_id:'rzp_order',razorpay_payment_id:'rzp_pay',razorpay_signature:'synthetic'};
function stall(_url,init){return new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(new Error('deadline'))));}
function fire(){assert.equal(timers.size,1);[...timers.values()][0]();}
(async()=>{
 const validOrder={keyId:'rzp_test_fixture',isLiveMode:false,amountPaise:4900,internalOrderId:'order',razorpayOrderId:'order_fixture',productTitle:'Notes',verifyUrl:endpoint};
 transport=async()=>Response.json(validOrder);
 await api.purchaseProduct('notes',true);
 assert.deepEqual(JSON.parse(calls[0].init.body),{productId:'notes',useWallet:true});
 assert.equal(calls[0].init.headers.Authorization,'Bearer synthetic-token');
 assert.equal(timers.size,0);assert.ok(calls[0].init.signal);
 assert.ok(calls[0].url.endsWith('/create-order-nonplay-test'));
 console.log('PASS create sends product/wallet only and cleans request deadline');
 for(const change of [{keyId:'rzp_live_fixture'},{isLiveMode:true},{amountPaise:NaN},{amountPaise:0},{internalOrderId:''},{razorpayOrderId:''},{productTitle:''},{verifyUrl:'https://foreign.invalid/verify'}]) {
  transport=async()=>Response.json({...validOrder,...change});
  await assert.rejects(api.purchaseProduct('notes'),/Invalid/);
 }
 console.log('PASS malformed, live-mode and foreign verification checkout responses cannot open checkout');
 transport=stall;let result=api.purchaseProduct('notes');const rejected=assert.rejects(result,/deadline/);
 await tick();fire();await rejected;assert.equal(timers.size,0);
 console.log('PASS stalled create request aborts without automatic duplicate order retry');
 let start=calls.length;result=api.verifyPayment(endpoint,payload);const failed=assert.rejects(result,/deadline/);
 for(let i=0;i<3;i++){await tick();fire();await tick();}
 await failed;assert.equal(calls.length-start,3);assert.equal(timers.size,0);
 console.log('PASS stalled verification aborts and bounded retry progresses');
 start=calls.length;await assert.rejects(api.recoverPayment('https://other.invalid/verify','order'),/Invalid payment/);
 assert.equal(calls.length,start);
 console.log('PASS recovery cannot send a session token to a route-supplied foreign endpoint');
 transport=async()=>Response.json({success:false,pending:true});
 assert.equal((await api.verifyPayment(endpoint,payload)).pending,true);
 console.log('PASS structured pending verdict remains unconfirmed');
 rows=[{id:'unpaid',purchases:[]},{id:'owned',purchases:[{status:'success'}]},{id:'refunded',purchases:[{status:'refunded'}]}];
 transport=async()=>Response.json({success:true});queryCount=0;calls=[];
 const [a,b]=await Promise.all([api.recoverMyPendingPayments(),api.recoverMyPendingPayments()]);
 assert.equal(a,true);assert.equal(b,true);assert.equal(queryCount,1);assert.equal(calls.length,1);
 assert.ok(filters.some(([k,v])=>k==='user_id'&&v==='buyer'));
 assert.equal(JSON.parse(calls[0].init.body).internalOrderId,'unpaid');
 console.log('PASS durable server-order recovery coalesces, binds account and excludes owned/refunded purchases');
 user=null;queryCount=0;assert.equal(await api.recoverMyPendingPayments(),false);assert.equal(queryCount,0);
 user='buyer';transport=async()=>{user='other';return Response.json({success:true});};
 assert.equal(await api.recoverMyPendingPayments(),false);
 console.log('PASS signed-out/account-switched recovery cannot refresh the previous account as success');
})().catch(e=>{console.error(e);process.exitCode=1;});
